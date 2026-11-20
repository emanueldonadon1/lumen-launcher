/*
 * "Trending on your apps": popular movies/shows that are streaming on the
 * services installed on THIS TV, from TMDB. Optional - needs the user's own free
 * TMDB key (v3 API key or v4 read token), typed in Settings.
 *
 * Requests (refreshed every 6 h, cached):
 *   1. /watch/providers/movie          -> which TMDB providers match the TV's apps
 *   2. /discover/movie + /discover/tv  -> popular, streaming (flatrate) on them
 *   3. /{kind}/{id}/watch/providers    -> which installed app has each title
 * Idea and service matching inspired by Free My TV (MIT).
 *
 * This product uses the TMDB API but is not endorsed or certified by TMDB.
 */
(function (LL) {
  'use strict';

  var API = 'https://api.tmdb.org/3';   // TMDB's mirror; some ISPs block api.themoviedb.org
  var IMG = 'https://image.tmdb.org/t/p/w500';
  var MAX_AGE = 6 * 3600000;
  var MAX_PICKS = 12;

  /* TMDB provider name -> catalog key */
  var SERVICES = [
    [/netflix/i, 'netflix'],
    [/amazon prime video|^prime video/i, 'prime'],
    [/disney/i, 'disney'],
    [/^(hbo )?max$|^hbo max/i, 'max'],
    [/globoplay/i, 'globoplay'],
    [/^apple tv/i, 'appletv'],
    [/paramount/i, 'paramount'],
    [/crunchyroll/i, 'crunchyroll']
  ];

  var picks = [];
  var listeners = [];
  var fetching = false;

  function key() { return String(LL.store.get().settings.tmdbKey || '').trim(); }
  function region() { return String(LL.place.get().country || 'US').toUpperCase(); }
  function lang() { return LL.i18n.lang === 'pt' ? 'pt-BR' : 'en-US'; }

  function tmdb(path) {
    var k = key();
    var bearer = k.length > 60;   // v4 read access token (JWT) vs v3 api key (32 hex chars)
    var url = API + path + (path.indexOf('?') < 0 ? '?' : '&') + (bearer ? '' : 'api_key=' + encodeURIComponent(k));
    return LL.http.getJSON(url, { headers: bearer ? { Authorization: 'Bearer ' + k } : {} });
  }

  function serviceOf(name) {
    for (var i = 0; i < SERVICES.length; i++) if (SERVICES[i][0].test(name || '')) return SERVICES[i][1];
    return '';
  }

  /* catalog key -> installed app */
  function installedByService() {
    var map = {};
    LL.installed.list().forEach(function (a) { if (a.key && !map[a.key]) map[a.key] = a; });
    return map;
  }

  function stamp() {
    var apps = installedByService();
    return [key().slice(0, 8), region(), lang(), Object.keys(apps).sort().join(',')].join('|');
  }

  function emit() { listeners.forEach(function (fn) { fn(picks); }); }

  function interleave(a, b, max) {
    var out = [];
    for (var i = 0; out.length < max && (i < a.length || i < b.length); i++) {
      if (i < a.length) out.push(a[i]);
      if (i < b.length && out.length < max) out.push(b[i]);
    }
    return out;
  }

  function fetchAll(apps) {
    var R = region();
    return tmdb('/watch/providers/movie?language=' + lang() + '&watch_region=' + R).then(function (res) {
      var idToService = {};
      (res.results || []).forEach(function (p) {
        var s = serviceOf(p.provider_name);
        if (s && apps[s]) idToService[p.provider_id] = s;
      });
      var ids = Object.keys(idToService);
      if (!ids.length) return [];
      var common = '&language=' + lang() + '&watch_region=' + R + '&with_watch_monetization_types=flatrate' +
        '&include_adult=false&sort_by=popularity.desc&with_watch_providers=' + encodeURIComponent(ids.join('|'));
      return Promise.all([
        tmdb('/discover/movie?vote_count.gte=50' + common),
        tmdb('/discover/tv?vote_count.gte=30' + common)
      ]).then(function (lists) {
        var movies = (lists[0].results || []).slice(0, 10).map(function (r) { return { kind: 'movie', r: r }; });
        var shows = (lists[1].results || []).slice(0, 10).map(function (r) { return { kind: 'tv', r: r }; });
        var candidates = interleave(movies, shows, MAX_PICKS + 4).filter(function (c) { return c.r.backdrop_path; });
        // Sequential on purpose: gentle on the TV's network stack and on TMDB rate limits.
        var out = [];
        return candidates.reduce(function (chain, c) {
          return chain.then(function () {
            if (out.length >= MAX_PICKS) return;
            return tmdb('/' + c.kind + '/' + c.r.id + '/watch/providers').then(function (wp) {
              var here = wp.results && wp.results[R];
              var flat = (here && here.flatrate) || [];
              for (var i = 0; i < flat.length; i++) {
                var s = idToService[flat[i].provider_id];
                if (s) {
                  out.push({ id: c.kind + c.r.id, title: c.r.title || c.r.name, image: IMG + c.r.backdrop_path,
                             service: s, year: String(c.r.release_date || c.r.first_air_date || '').slice(0, 4) });
                  return;
                }
              }
            }, function () { /* skip this title */ });
          });
        }, Promise.resolve()).then(function () { return out; });
      });
    });
  }

  function refresh(force) {
    if (!key() || !LL.store.get().settings.showPicks) {
      if (picks.length) { picks = []; emit(); }
      return Promise.resolve(picks);
    }
    var apps = installedByService();
    if (!Object.keys(apps).length) return Promise.resolve(picks);
    var cacheKey = 'picks:' + stamp();
    var cached = LL.http.cacheGet(cacheKey, MAX_AGE);
    if (cached) { picks = cached.value; emit(); }
    if (fetching || (cached && cached.fresh && !force)) return Promise.resolve(picks);
    fetching = true;
    return fetchAll(apps).then(function (list) {
      fetching = false;
      picks = list;
      LL.http.cacheSet(cacheKey, list);
      emit();
      return picks;
    }, function (err) {
      fetching = false;
      console.warn('[picks] TMDB failed', err);
      if (/HTTP 401/.test(String(err))) LL.toast.show(LL.i18n.t('tmdbBadKey'), 3500);
      return picks;
    });
  }

  /* Installed app that plays a pick */
  function appFor(pick) { return installedByService()[pick.service] || null; }

  LL.picks = {
    refresh: refresh,
    list: function () { return picks; },
    appFor: appFor,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window.LL = window.LL || {});
