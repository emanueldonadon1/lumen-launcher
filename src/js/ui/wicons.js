/*
 * Weather icons as inline SVG strings (drawn for Lumen, no external assets).
 * Built from a static, trusted template - never from remote data.
 */
(function (LL) {
  'use strict';

  var SUN = '<circle cx="24" cy="24" r="8" fill="#ffd54f"/>' +
    '<g stroke="#ffd54f" stroke-width="3" stroke-linecap="round">' +
    '<path d="M24 6v5M24 37v5M6 24h5M37 24h5M11.3 11.3l3.5 3.5M33.2 33.2l3.5 3.5M11.3 36.7l3.5-3.5M33.2 14.8l3.5-3.5"/></g>';
  var MOON = '<path d="M30 8a15 15 0 1 0 10 26A13 13 0 0 1 30 8z" fill="#cfd8ff"/>';
  var CLOUD = '<path d="M15 36h20a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 1 13z" fill="#e8ecf4"/>';
  var CLOUD_DARK = '<path d="M15 34h20a8 8 0 0 0 0-16 11 11 0 0 0-21 3 6.5 6.5 0 0 0 1 13z" fill="#aab3c5"/>';
  var SMALL_SUN = '<g transform="translate(-6 -6) scale(.75)">' + SUN + '</g>';
  var SMALL_MOON = '<g transform="translate(-4 -4) scale(.7)">' + MOON + '</g>';
  var RAIN = '<g stroke="#64b5f6" stroke-width="3" stroke-linecap="round"><path d="M17 38l-2 5M25 38l-2 5M33 38l-2 5"/></g>';
  var SNOW = '<g fill="#ffffff"><circle cx="16" cy="41" r="2"/><circle cx="24" cy="44" r="2"/><circle cx="32" cy="41" r="2"/></g>';
  var BOLT = '<path d="M25 33l-5 9h5l-3 7 9-11h-5l3-5z" fill="#ffd54f"/>';
  var FOG = '<g stroke="#cfd5df" stroke-width="3" stroke-linecap="round"><path d="M9 20h30M6 27h36M11 34h26"/></g>';

  function svg(inner) {
    return '<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true">' + inner + '</svg>';
  }

  function icon(code, isDay) {
    var day = isDay !== false;
    if (code === 0) return svg(day ? SUN : MOON);
    if (code <= 2) return svg((day ? SMALL_SUN : SMALL_MOON) + CLOUD);
    if (code === 3) return svg(CLOUD);
    if (code === 45 || code === 48) return svg(FOG);
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return svg(CLOUD_DARK + RAIN);
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return svg(CLOUD + SNOW);
    if (code >= 95) return svg(CLOUD_DARK + BOLT);
    return svg(CLOUD);
  }

  LL.wicons = { icon: icon };
})(window.LL = window.LL || {});
