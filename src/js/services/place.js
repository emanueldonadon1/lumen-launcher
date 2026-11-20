/*
 * Where the TV is: { city, lat, lon, country }.
 * Picked by the user (Settings > City, saved in settings.place), otherwise
 * guessed from the TV's time zone (tizen.time.getLocalTimezone) - no GPS, no IP lookup.
 */
(function (LL) {
  'use strict';

  function timezone() {
    if (LL.platform.isTizen && window.tizen.time) {
      try { return window.tizen.time.getLocalTimezone() || ''; } catch (e) {}
    }
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; }
  }

  /* A time zone's main city, or null. */
  function fromZone(name) {
    var all = LL.zones || {};
    var v = all[name];
    var hops = 0;
    while (v && v.charAt(0) === '=' && hops++ < 3) { name = v.slice(1); v = all[name]; }
    if (!v) return null;
    var p = v.split(',');
    return {
      country: p[0],
      lat: parseFloat(p[1]),
      lon: parseFloat(p[2]),
      city: p[3] || name.slice(name.lastIndexOf('/') + 1).replace(/_/g, ' ')
    };
  }

  var guessed = fromZone(timezone()) || { country: 'US', lat: 40.7128, lon: -74.006, city: 'New York' };

  function get() {
    var p = LL.store.get().settings.place;
    return p && typeof p.lat === 'number' ? p : guessed;
  }

  /* Open-Meteo geocoding: [{ label, city, lat, lon, country }] */
  function search(name) {
    var lang = LL.i18n.lang;
    var url = 'https://geocoding-api.open-meteo.com/v1/search?count=8&format=json&language=' + lang +
      '&name=' + encodeURIComponent(String(name).trim());
    return LL.http.getJSON(url).then(function (body) {
      var out = [];
      var seen = {};
      ((body && body.results) || []).forEach(function (r) {
        if (!r.name || typeof r.latitude !== 'number') return;
        var label = r.name;
        [r.admin1, r.country].forEach(function (part) { if (part && part !== r.name) label += ', ' + part; });
        if (seen[label]) return;
        seen[label] = true;
        out.push({ label: label, city: r.name, lat: r.latitude, lon: r.longitude, country: r.country_code || guessed.country });
      });
      return out;
    });
  }

  LL.place = {
    get: get,
    isAuto: function () { return !LL.store.get().settings.place; },
    set: function (p) { LL.store.setSetting('place', p ? { city: p.city, lat: p.lat, lon: p.lon, country: p.country } : null); },
    search: search,
    /* Fahrenheit by default only for US TVs */
    fahrenheitByDefault: function () { return get().country === 'US'; }
  };
})(window.LL = window.LL || {});
