/*
 * Platform detection, performance tier, and thin wrappers around the current
 * Tizen application. Outside a TV (desktop Chrome) everything degrades to
 * console mocks so the UI can be developed with a keyboard.
 *
 * Code style for the whole project: ES2017 max, and NO optional chaining (?.),
 * nullish coalescing (??) or flexbox `gap` - Tizen 6.0 ships Chromium M76.
 */
(function (LL) {
  'use strict';

  LL.version = '0.3.0';

  var isTizen = typeof window.tizen !== 'undefined' && !!window.tizen.application;
  var currentApp = null;

  if (isTizen) {
    try { currentApp = window.tizen.application.getCurrentApplication(); }
    catch (e) { console.warn('[platform] getCurrentApplication failed', e); }
  }

  /*
   * Performance tier from navigator.deviceMemory (rounded to a power of two, so
   * 1 means "up to ~1.5 GB"). Field data from Free My TV (MIT): a 2021
   * UN50AU7700 (Tizen 6, 1.5 GB) stutters on every move with soft shadows, and
   * a 2 GB Frame drops frames until moving shadows are removed.
   *   lite: no shadows, no glow, shorter animations
   *   flat: animations kept, no shadows on moving parts
   */
  var mem = navigator.deviceMemory || 0;
  var autoTier = !isTizen ? 'full' : (mem && mem <= 1 ? 'lite' : (mem && mem <= 2 ? 'flat' : 'full'));

  function applyTier(setting) {
    var tier = setting === 'full' || setting === 'lite' ? setting : autoTier;
    var cl = document.documentElement.classList;
    cl.remove('tier-lite', 'tier-flat');
    if (tier !== 'full') cl.add('tier-' + tier);
    return tier;
  }

  LL.platform = {
    isTizen: isTizen,
    autoTier: autoTier,
    applyTier: applyTier,

    exit: function () {
      if (currentApp) currentApp.exit();
      else console.info('[mock] application.exit()');
    },

    hide: function () {
      if (currentApp) currentApp.hide();
      else console.info('[mock] application.hide()');
    }
  };

  document.documentElement.classList.add(isTizen ? 'is-tizen' : 'is-browser');

  // Desktop dev: scale the fixed 1920x1080 canvas to fit the browser window.
  if (!isTizen) {
    var fit = function () {
      var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      document.body.style.transformOrigin = '0 0';
      document.body.style.transform = s < 1 ? 'scale(' + s + ')' : '';
    };
    window.addEventListener('resize', fit);
    document.addEventListener('DOMContentLoaded', fit);
  }
})(window.LL = window.LL || {});
