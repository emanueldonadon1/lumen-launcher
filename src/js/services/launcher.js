/*
 * Opens a shelf entry:
 *   type 'app' -> tizen.application.launch(appId), with a DIAL fallback
 *   type 'url' -> launchAppControl(operation/view, url) = system browser
 *
 * DIAL fallback (ported from Free My TV, MIT): built-in apps with numeric ids
 * (e.g. 111299001912 = YouTube on older sets) are native and launch() may not
 * open them; the TV's own DIAL server on 127.0.0.1:8001 - the one phones cast
 * through - does. Needs the network.public privilege.
 */
(function (LL) {
  'use strict';

  var OP_VIEW = 'http://tizen.org/appcontrol/operation/view';
  var NATIVE = /^\d+(\.|$)/;
  var DIAL_NAMES = { netflix: 'Netflix', youtube: 'YouTube', prime: 'Amazon' };

  function dialLaunch(name) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest();
      var over = false;
      x.open('POST', 'http://127.0.0.1:8001/ws/apps/' + name, true);
      x.timeout = 8000;
      x.onreadystatechange = function () {
        if (x.readyState !== 4 || over) return;
        over = true;
        if (x.status === 200 || x.status === 201) resolve(); else reject(new Error('DIAL ' + x.status));
      };
      x.ontimeout = x.onerror = function () { if (!over) { over = true; reject(new Error('DIAL unreachable')); } };
      x.setRequestHeader('Content-Type', 'text/plain; charset=utf-8');
      x.send('');
    });
  }

  function tizenLaunch(appId) {
    return new Promise(function (resolve, reject) {
      try { window.tizen.application.launch(appId, resolve, reject); }
      catch (e) { reject(e); }
    });
  }

  function rawLaunch(appId) {
    if (!LL.platform.isTizen) {
      console.info('[mock] tizen.application.launch("' + appId + '")');
      return Promise.resolve();
    }
    var info = LL.installed.get(appId);
    var dial = info ? DIAL_NAMES[info.key] : '';
    if (dial && NATIVE.test(appId)) {
      return dialLaunch(dial).catch(function () { return tizenLaunch(appId); });
    }
    return tizenLaunch(appId).catch(function (err) {
      if (dial) return dialLaunch(dial);
      throw err;
    });
  }

  /* Opens an installed app and remembers it in "Recent". opts.noRecent for system apps (TV viewer). */
  function launchApp(appId, opts) {
    return rawLaunch(appId).then(function () {
      if (opts && opts.noRecent) return;
      var info = LL.installed.get(appId);
      LL.store.addRecent({ type: 'app', target: appId, name: info ? info.title : appId });
    });
  }

  function openUrl(url) {
    return new Promise(function (resolve, reject) {
      if (!LL.platform.isTizen) {
        window.open(url, '_blank');
        resolve();
        return;
      }
      try {
        var control = new window.tizen.ApplicationControl(OP_VIEW, url, null, null, null);
        window.tizen.application.launchAppControl(control, null, resolve, reject, null);
      } catch (e) { reject(e); }
    });
  }

  function open(entry) {
    if (entry.type !== 'url') return launchApp(entry.target);
    return openUrl(entry.target).then(function () { LL.store.addRecent(entry); });
  }

  /* Maps a Tizen WebAPIError to a user-facing message key. */
  function errorKey(err) {
    return err && err.name === 'NotFoundError' ? 'notInstalled' : 'launchFailed';
  }

  LL.launcher = { open: open, launchApp: launchApp, openUrl: openUrl, errorKey: errorKey };
})(window.LL = window.LL || {});
