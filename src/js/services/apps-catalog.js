/*
 * Knowledge about Samsung's app list.
 *
 * App IDs change by TV year and region (YouTube is 9Ur5IzDKqV.TizenYouTube on
 * recent sets, 111299001912 on 2015 ones; Prime Video can be
 * org.tizen.primevideo or evKhCgZelL.AmazonIgnitionLauncher2...). So Lumen does
 * NOT hardcode IDs: it reads the TV's own list (getAppsInfo) and recognises the
 * well-known apps by id OR title, to give them a logo and brand colors.
 *
 * The hidden-apps filter, title fixes and field notes are ported from
 * Free My TV (MIT, https://github.com/simbasjungles/free-my-tv) - see NOTICE.md.
 */
(function (LL) {
  'use strict';

  var ICONS = 'assets/icons/apps/';

  /* Default shelf order when installed: [key, id regex, title regex, [top, bottom] gradient, logo] */
  var KNOWN = [
    ['netflix',     /netflix/i,                       /netflix/i,                  ['#141414', '#000000'], 'netflix.svg'],
    ['youtube',     /TizenYouTube$/,                  /^youtube$/i,                ['#1c1c1e', '#09090a'], 'youtube.png'],
    ['prime',       /primevideo|AmazonIgnition/i,     /prime video|amazon/i,       ['#2aa8ff', '#0a68d4'], 'prime.png'],
    ['disney',      /disney/i,                        /disney/i,                   ['#173584', '#08143f'], ''],
    ['max',         /HBO|wbd/i,                       /^(hbo )?max$|hbo max/i,     ['#5c30e8', '#221684'], 'max.svg'],
    ['globoplay',   /globoplay/i,                     /globoplay/i,                ['#ff8a1f', '#ff2d5a'], ''],
    ['appletv',     /aria-video|appletv/i,            /apple tv/i,                 ['#1c1c1e', '#000000'], 'appletv.svg'],
    ['spotify',     /spotify/i,                       /spotify/i,                  ['#1db954', '#0f7a36'], 'spotify.svg'],
    ['paramount',   /paramount/i,                     /paramount/i,                ['#0064ff', '#002a86'], 'paramountplus.svg'],
    ['plex',        /plex/i,                          /^plex$/i,                   ['#2b2b2d', '#111112'], 'plex.svg'],
    ['jellyfin',    /jellyfin/i,                      /jellyfin/i,                 ['#aa5cc3', '#00a4dc'], 'jellyfin.svg'],
    ['crunchyroll', /crunchyroll/i,                   /crunchyroll/i,              ['#f47521', '#b84a0c'], 'crunchyroll.svg'],
    ['twitch',      /twitch/i,                        /twitch/i,                   ['#9146ff', '#4b1fa8'], 'twitch.svg'],
    ['youtubekids', /YouTubeKids/i,                   /youtube kids/i,             ['#ffffff', '#e4e4e4'], 'youtubekids.svg'],
    ['deezer',      /deezer/i,                        /deezer/i,                   ['#1c1c1e', '#09090a'], 'deezer.svg'],
    ['steam',       /steamlink/i,                     /steam link/i,               ['#1b2838', '#0e141c'], 'steam.svg'],
    ['browser',     /^org\.tizen\.browser$/,          /^internet$/i,               ['#3a7bd5', '#1f4f99'], '']
  ];

  /* Shown in Smart Hub but not apps a person opens: Smart Hub's own pieces, platform
     tools and players (except browser/Netflix/Prime/Globoplay), services, keyboards, ad players. */
  var HIDDEN = new RegExp('^(org\\.volt\\.|org\\.tizen\\.(?!browser$|netflix|primevideo$|globoplay)|org\\.tizen\\.netflixlowmem$|ise-|ug-|d75857a5-)' +
      '|[Ss]ervice$|[Dd]aemon|Preview$|syspopup|[Hh]elper$|AdPlayer|AdSuite|[Kk]eyboard|\\.OTApp$' +
      '|^com\\.samsung\\.calendar-account-manager' +
      '|^com\\.samsung\\.tv\\.(?!store$|SmartThingsApp$|aria-video$|knox-browser-win365$|tvplus$|gaminghub$)' +
      '|^com\\.samsung\\.tizen\\.' +
      '|^com\\.samsung\\.(ep[-.]|rdm[-.]|SelfDiagnosis$|mtm-banner$|hitcomp$|video-test$)' +
      '|^com\\.sausng\\.' +
      '|^adplatform\\.' +
      '|^(unified-drm-|lib-|p2p-asm|mobilebff$|comss$|acm-watcher$|dmr_service_app$|aifw-|csapi-|capi-|ep-|test-|emergency-log-transmitter$|samsung-easy-support$)');

  /* Names Smart Hub gets wrong (missing, too long or outdated). */
  var TITLES = {
    'NvZ26VG9Yw.HBOGOLAG': 'Max',
    'rJeHak5zRg.Spotify': 'Spotify',
    'evKhCgZelL.AmazonIgnitionLauncher2': 'Prime Video',
    'org.tizen.globoplayapp': 'Globoplay',
    'org.tizen.browser': 'Internet',
    'OEvCiupaFR.ITVHub': 'ITVX'
  };

  /* Desktop preview: a plausible app list (ids as seen on recent Samsung TVs). */
  var MOCK = [
    ['RN1MCdNq8t.Netflix', 'Netflix'], ['9Ur5IzDKqV.TizenYouTube', 'YouTube'],
    ['org.tizen.primevideo', 'Prime Video'], ['MCmYXNxgcu.DisneyPlus', 'Disney+'],
    ['org.tizen.globoplayapp', 'Globoplay'], ['com.samsung.tv.aria-video', 'Apple TV'],
    ['rJeHak5zRg.Spotify', 'Spotify'], ['kIciSQlYEM.plex', 'Plex'],
    ['AprZAARz4r.Jellyfin', 'Jellyfin'], ['org.tizen.browser', 'Internet'],
    ['com.samsung.tv.store', 'Apps'], ['3201710015037', 'GamePass']
  ];

  function match(id, title) {
    for (var i = 0; i < KNOWN.length; i++) {
      // YouTube Kids must not be taken for YouTube
      if (KNOWN[i][0] === 'youtube' && /kids/i.test(id + title)) continue;
      if (KNOWN[i][1].test(id) || KNOWN[i][2].test(title)) {
        var k = KNOWN[i];
        return { key: k[0], rank: i, gradient: k[3], logo: k[4] ? ICONS + k[4] : '' };
      }
    }
    return null;
  }

  function fixTitle(id, name) {
    var title = TITLES[id] || name || id;
    if (/^Amazon( Instant)? Video$/i.test(title)) title = 'Prime Video';
    return title;
  }

  LL.catalog = {
    match: match,
    fixTitle: fixTitle,
    isHidden: function (id) { return HIDDEN.test(id); },
    mock: function () { return MOCK.map(function (m) { return { id: m[0], name: m[1], show: true, iconPath: '' }; }); },
    /* Neutral look for apps Lumen doesn't know */
    neutralGradient: ['#2a2d34', '#17191e']
  };
})(window.LL = window.LL || {});
