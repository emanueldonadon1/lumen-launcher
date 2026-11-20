/*
 * Look of the background:
 *   auto  - day sky / night sky, switching at the real sunrise and sunset
 *           (from the weather forecast; 06:00-18:00 when offline)
 *   night - always the night sky
 *   photo - a new photo every day (picsum.photos, seeded by the date)
 *   oled  - pure black
 * A custom wallpaper URL replaces the sky/photo (not pure black).
 *
 * Also owns the dimmer: a black layer over Lumen's own screens (not the apps it
 * opens), off/low/medium/high, or automatic (medium from 22:00 to 07:00).
 */
(function (LL) {
  'use strict';

  var THEMES = ['auto', 'night', 'photo', 'oled'];
  var DIM = { off: 0, low: 0.25, medium: 0.45, high: 0.65 };
  var layers = null;
  var photoDate = '';

  function el(id) { return document.getElementById(id); }

  function isDayNow() {
    var now = Date.now();
    var w = LL.weather.get();
    if (w && w.sunrise && w.sunset && now - w.sunrise < 36 * 3600000) {
      return now >= w.sunrise && now < w.sunset;
    }
    var h = new Date().getHours();
    return h >= 6 && h < 18;
  }

  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function photoUrl() {
    return 'https://picsum.photos/seed/lumen-' + today() + '/1920/1080';
  }

  function setPhoto(url) {
    if (layers.photo.getAttribute('data-src') === url) return;
    layers.photo.setAttribute('data-src', url);
    // Decode first, then swap: never show a half-loaded image
    var img = new Image();
    img.onload = function () {
      if (layers.photo.getAttribute('data-src') !== url) return;
      layers.photo.style.backgroundImage = 'url("' + url.replace(/"/g, '%22') + '")';
      layers.photo.classList.add('is-loaded');
    };
    img.src = url;
  }

  function apply() {
    var s = LL.store.get().settings;
    if (!layers) layers = { root: el('wallpaper'), day: el('wp-day'), photo: el('wp-photo') };
    var theme = THEMES.indexOf(s.theme) >= 0 ? s.theme : 'auto';
    var body = document.body;

    body.classList.toggle('theme-oled', theme === 'oled');
    var day = theme === 'auto' && isDayNow();
    layers.day.classList.toggle('is-on', day);

    var photo = '';
    if (theme !== 'oled') {
      if (s.wallpaperUrl) photo = s.wallpaperUrl;
      else if (theme === 'photo') { photo = photoUrl(); photoDate = today(); }
    }
    if (photo) setPhoto(photo);
    else { layers.photo.removeAttribute('data-src'); layers.photo.classList.remove('is-loaded'); }
    layers.photo.classList.toggle('is-on', !!photo);

    applyDim();
  }

  function applyDim() {
    var mode = LL.store.get().settings.dim;
    var level = DIM[mode] || 0;
    if (mode === 'auto') {
      var h = new Date().getHours();
      level = h >= 22 || h < 7 ? DIM.medium : 0;
    }
    el('dim').style.opacity = String(level);
  }

  /* Red key: cycle through the themes. */
  function cycle() {
    var cur = LL.store.get().settings.theme;
    var next = THEMES[(THEMES.indexOf(cur) + 1) % THEMES.length];
    LL.store.setSetting('theme', next);
    return next;
  }

  /* Resolves when a custom wallpaper/photo is decoded (or after a timeout),
     so the boot screen never reveals a half-loaded background. */
  function preload(timeoutMs) {
    return new Promise(function (resolve) {
      var src = layers && layers.photo.getAttribute('data-src');
      if (!src || layers.photo.classList.contains('is-loaded')) { resolve(); return; }
      var img = new Image();
      img.onload = img.onerror = function () { resolve(); };
      setTimeout(resolve, timeoutMs);
      img.src = src;
    });
  }

  // Minute tick: sunrise/sunset switch, a new photo at midnight, auto dim.
  LL.clock.onMinute(function () {
    if (!layers) return;
    var s = LL.store.get().settings;
    if (s.theme === 'auto' || (s.theme === 'photo' && photoDate !== today())) apply();
    else applyDim();
  });
  LL.weather.onChange(function () { if (layers) apply(); });

  LL.theme = { THEMES: THEMES, apply: apply, cycle: cycle, preload: preload, isDayNow: isDayNow };
})(window.LL = window.LL || {});
