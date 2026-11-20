/*
 * The TV's installed apps, via tizen.application.getAppsInfo().
 * Each app: { appId, title, logo (bundled brand logo), icon (TV's iconPath), gradient, rank }.
 * Re-read when Lumen comes back to the foreground, so apps installed meanwhile show up.
 */
(function (LL) {
  'use strict';

  var apps = [];
  var byId = {};
  var listeners = [];
  var selfId = '';

  if (LL.platform.isTizen) {
    try { selfId = window.tizen.application.getCurrentApplication().appInfo.id; } catch (e) {}
  }

  function toApp(a) {
    var title = LL.catalog.fixTitle(a.id, a.name);
    var known = LL.catalog.match(a.id, title);
    var icon = a.iconPath || '';
    if (icon && icon.indexOf('://') < 0) icon = 'file://' + icon;
    return {
      appId: a.id,
      title: title,
      key: known ? known.key : '',
      logo: known ? known.logo : '',
      icon: icon,
      gradient: known ? known.gradient : LL.catalog.neutralGradient,
      rank: known ? known.rank : 999
    };
  }

  function filter(list) {
    var out = [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i];
      if (!a.id || a.id === selfId || a.show === false || LL.catalog.isHidden(a.id)) continue;
      out.push(toApp(a));
    }
    // Built-in Netflix only when the store's Netflix isn't installed
    var storeNetflix = out.some(function (x) { return /\.Netflix$/.test(x.appId); });
    if (storeNetflix) out = out.filter(function (x) { return x.appId.indexOf('org.tizen.netflix') !== 0; });
    out.sort(function (x, y) {
      var a = x.title.toLowerCase(), b = y.title.toLowerCase();
      return a < b ? -1 : (a > b ? 1 : 0);
    });
    return out;
  }

  function read() {
    return new Promise(function (resolve) {
      if (!LL.platform.isTizen) { resolve(LL.catalog.mock()); return; }
      try {
        window.tizen.application.getAppsInfo(resolve, function (err) {
          console.warn('[installed] getAppsInfo failed', err);
          resolve([]);
        });
      } catch (e) {
        console.warn('[installed] getAppsInfo threw', e);
        resolve([]);
      }
    });
  }

  function signature(list) { return list.map(function (a) { return a.appId; }).join('|'); }

  function load() {
    return read().then(function (raw) {
      var next = filter(raw);
      var changed = signature(next) !== signature(apps);
      apps = next;
      byId = {};
      apps.forEach(function (a) { byId[a.appId] = a; });
      if (changed) listeners.forEach(function (fn) { fn(apps); });
      return apps;
    });
  }

  /* Apps for a first-run shelf: well-known ones in KNOWN order, else the first few. */
  function suggested(max) {
    var known = apps.filter(function (a) { return a.rank < 999; })
      .sort(function (a, b) { return a.rank - b.rank; });
    var pick = known.length ? known : apps;
    return pick.slice(0, max);
  }

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) load();
  });

  LL.installed = {
    load: load,
    list: function () { return apps; },
    get: function (appId) { return byId[appId] || null; },
    suggested: suggested,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window.LL = window.LL || {});
