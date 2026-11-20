/*
 * Weather from Open-Meteo (free, no API key). One request returns current
 * conditions, the next hours and 6 days; cached 30 min in localStorage and
 * shown from cache when offline. Parsing approach adapted from Free My TV (MIT).
 */
(function (LL) {
  'use strict';

  var MAX_AGE = 30 * 60000;
  var QUERY = '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,is_day' +
    '&hourly=temperature_2m,weather_code,is_day,precipitation_probability' +
    '&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset,weather_code,uv_index_max,precipitation_probability_max' +
    '&timezone=auto&forecast_days=6&forecast_hours=30';

  var data = null;
  var fetching = false;
  var listeners = [];

  function placeKey() {
    var p = LL.place.get();
    return p.lat.toFixed(3) + ',' + p.lon.toFixed(3);
  }

  /* "2026-11-20T18:31" at the location -> epoch ms */
  function localTime(iso, offsetSeconds) {
    var m = /^(\d+)-(\d+)-(\d+)T(\d+):(\d+)/.exec(iso || '');
    if (!m) return 0;
    return Date.UTC(+m[1], m[2] - 1, +m[3], +m[4], +m[5]) - offsetSeconds * 1000;
  }

  function parse(o) {
    if (!o || !o.current || !o.daily) return null;
    var off = o.utc_offset_seconds || 0;
    var d = o.daily;
    var now = Date.now();
    var w = {
      temp: o.current.temperature_2m,
      feels: o.current.apparent_temperature,
      humidity: o.current.relative_humidity_2m,
      code: o.current.weather_code,
      isDay: o.current.is_day !== 0,
      max: d.temperature_2m_max[0],
      min: d.temperature_2m_min[0],
      uv: d.uv_index_max ? d.uv_index_max[0] : null,
      rain: d.precipitation_probability_max ? d.precipitation_probability_max[0] : null,
      sunrise: localTime(d.sunrise[0], off),
      sunset: localTime(d.sunset[0], off),
      tomorrowSunrise: d.sunrise[1] ? localTime(d.sunrise[1], off) : 0,
      hours: [],
      days: []
    };
    var h = o.hourly;
    for (var i = 0; h && i < h.time.length && w.hours.length < 8; i++) {
      var at = localTime(h.time[i], off);
      if (at <= now) continue;
      w.hours.push({ at: at, temp: h.temperature_2m[i], code: h.weather_code[i], day: h.is_day[i] !== 0,
        rain: h.precipitation_probability ? h.precipitation_probability[i] : null });
    }
    for (var j = 1; j < d.time.length && w.days.length < 5; j++) {
      var p = d.time[j].split('-');
      w.days.push({ at: new Date(+p[0], p[1] - 1, +p[2], 12).getTime(), max: d.temperature_2m_max[j],
        min: d.temperature_2m_min[j], code: d.weather_code[j] });
    }
    return w;
  }

  function emit() { listeners.forEach(function (fn) { fn(data); }); }

  function refresh(force) {
    if (!LL.store.get().settings.weather) return Promise.resolve(null);
    var key = 'weather:' + placeKey();
    var cached = LL.http.cacheGet(key, MAX_AGE);
    if (cached && (!data || data.key !== key)) { data = parse(cached.value); if (data) data.key = key; emit(); }
    if (fetching || (cached && cached.fresh && !force)) return Promise.resolve(data);
    fetching = true;
    var p = LL.place.get();
    var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + p.lat + '&longitude=' + p.lon + QUERY;
    return LL.http.getJSON(url).then(function (body) {
      fetching = false;
      LL.http.cacheSet(key, body);
      data = parse(body);
      if (data) data.key = key;
      emit();
      return data;
    }, function (err) {
      fetching = false;
      console.warn('[weather] fetch failed', err);
      return data;
    });
  }

  /* Temperature in the chosen unit, rounded, with the degree sign. */
  function temp(c) {
    if (typeof c !== 'number') return '--°';
    var unit = LL.store.get().settings.tempUnit;
    var f = unit === 'f' || (unit === 'auto' && LL.place.fahrenheitByDefault());
    return Math.round(f ? c * 9 / 5 + 32 : c) + '°';
  }

  /* WMO weather code -> i18n key */
  function describe(code) {
    if (code === 0) return 'wClear';
    if (code <= 2) return 'wPartly';
    if (code === 3) return 'wCloudy';
    if (code === 45 || code === 48) return 'wFog';
    if (code >= 51 && code <= 57) return 'wDrizzle';
    if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'wRain';
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'wSnow';
    if (code >= 95) return 'wStorm';
    return 'wCloudy';
  }

  LL.weather = {
    refresh: refresh,
    get: function () { return data; },
    temp: temp,
    describe: describe,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window.LL = window.LL || {});
