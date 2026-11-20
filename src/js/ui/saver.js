/*
 * Screensaver: after N idle minutes on Lumen, a big clock + date + weather on
 * pure black. It jumps to a new random spot every minute (burn-in protection
 * for OLED/QLED panels); the jump is a transform, never a layout change.
 * Any key wakes it up and is swallowed (so it doesn't also act on the home).
 */
(function (LL) {
  'use strict';

  var el = null;
  var box = null;
  var tempEl = null;
  var iconEl = null;
  var lastInput = Date.now();
  var active = false;

  function minutes() { return Number(LL.store.get().settings.saver) || 0; }

  function drift() {
    if (!active) return;
    var w = 1920 - box.offsetWidth - 2 * 96;
    var h = 1080 - box.offsetHeight - 2 * 54;
    var x = 96 + Math.round(Math.random() * Math.max(0, w));
    var y = 54 + Math.round(Math.random() * Math.max(0, h));
    box.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
  }

  function renderWeather() {
    var w = LL.weather.get();
    if (!w) { tempEl.textContent = ''; iconEl.innerHTML = ''; return; }
    tempEl.textContent = LL.weather.temp(w.temp);
    iconEl.innerHTML = LL.wicons.icon(w.code, w.isDay);   // static trusted SVG template
  }

  function show() {
    if (active) return;
    active = true;
    renderWeather();
    el.classList.add('is-on');
    drift();
  }

  function hide() {
    active = false;
    el.classList.remove('is-on');
  }

  /* Called for every key: returns true if the key only woke the saver up. */
  function poke() {
    lastInput = Date.now();
    if (active) { hide(); return true; }
    return false;
  }

  function init() {
    el = document.getElementById('saver');
    box = el.querySelector('.saver__box');
    tempEl = el.querySelector('.saver__temp');
    iconEl = el.querySelector('.saver__icon');
    LL.clock.bind({
      time: el.querySelector('.saver__time'),
      date: el.querySelector('.saver__date')
    });

    LL.clock.onMinute(function () {
      if (active) { renderWeather(); drift(); return; }
      var m = minutes();
      if (m && !document.hidden && Date.now() - lastInput >= m * 60000) show();
    });
    // Coming back from an app counts as activity
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) { lastInput = Date.now(); hide(); }
    });
  }

  LL.saver = { init: init, poke: poke, show: show, hide: hide, isActive: function () { return active; } };
})(window.LL = window.LL || {});
