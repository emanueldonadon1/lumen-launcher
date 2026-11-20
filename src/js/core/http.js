/*
 * Tiny JSON-over-HTTP helper (XHR: works on every Tizen, with a hard timeout)
 * and a localStorage cache with expiry.
 */
(function (LL) {
  'use strict';

  function getJSON(url, opts) {
    opts = opts || {};
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      var over = false;
      x.open('GET', url, true);
      x.timeout = opts.timeout || 12000;
      var headers = opts.headers || {};
      Object.keys(headers).forEach(function (h) { x.setRequestHeader(h, headers[h]); });
      x.onreadystatechange = function () {
        if (x.readyState !== 4 || over) return;
        over = true;
        if (x.status < 200 || x.status >= 300) { reject(new Error('HTTP ' + x.status)); return; }
        try { resolve(JSON.parse(x.responseText)); } catch (e) { reject(e); }
      };
      x.ontimeout = x.onerror = function () { if (!over) { over = true; reject(new Error('no connection')); } };
      x.send();
    });
  }

  var PREFIX = 'lumen.cache.';

  function cacheGet(key, maxAgeMs) {
    try {
      var c = JSON.parse(window.localStorage.getItem(PREFIX + key));
      if (!c) return null;
      var age = Date.now() - c.at;
      return { value: c.value, fresh: age >= 0 && age < maxAgeMs };
    } catch (e) { return null; }
  }

  function cacheSet(key, value) {
    try { window.localStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), value: value })); }
    catch (e) { console.warn('[cache] could not store', key, e); }
  }

  function cacheClear() {
    try {
      for (var i = window.localStorage.length - 1; i >= 0; i--) {
        var k = window.localStorage.key(i);
        if (k && k.indexOf(PREFIX) === 0) window.localStorage.removeItem(k);
      }
    } catch (e) {}
  }

  LL.http = { getJSON: getJSON, cacheGet: cacheGet, cacheSet: cacheSet, cacheClear: cacheClear };
})(window.LL = window.LL || {});
