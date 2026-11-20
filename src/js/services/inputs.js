/*
 * TV inputs: antenna (TV) and HDMI 1-4.
 * Switching = tizen.tvwindow.setSource(source) then bring up Samsung's own TV
 * viewer (org.tizen.tv-viewer), which shows whatever source is active.
 * Approach from Free My TV (MIT). Privilege: http://tizen.org/privilege/tv.window
 */
(function (LL) {
  'use strict';

  var VIEWER = 'org.tizen.tv-viewer';

  /* [{type, number}] reported by the TV, or null. `all` includes disconnected
     ones: some TVs list an HDMI device on standby as disconnected. */
  function sources(all) {
    return new Promise(function (resolve) {
      if (!LL.platform.isTizen || !window.tizen.systeminfo) {
        resolve(all ? [{ type: 'TV', number: 1 }, { type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 }]
                    : [{ type: 'TV', number: 1 }, { type: 'HDMI', number: 1 }]);
        return;
      }
      try {
        window.tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (v) {
          if (!v || !v.connected) { resolve(null); return; }
          resolve(all ? v.connected.concat(v.disconnected || []) : v.connected);
        }, function () { resolve(null); });
      } catch (e) { resolve(null); }
    });
  }

  /* [{ id, type, number, label, connected }] - always TV + HDMI 1-4 */
  function list() {
    return sources(false).then(function (connected) {
      var out = [{ id: 'TV:1', type: 'TV', number: 1, label: LL.i18n.t('inputTv'), connected: true }];
      for (var n = 1; n <= 4; n++) {
        var on = !connected || connected.some(function (s) { return s.type === 'HDMI' && s.number === n; });
        out.push({ id: 'HDMI:' + n, type: 'HDMI', number: n, label: 'HDMI ' + n, connected: on });
      }
      return out;
    });
  }

  function showViewer() {
    return LL.launcher.launchApp(VIEWER, { noRecent: true }).catch(function () { LL.platform.hide(); });
  }

  function open(input) {
    if (!LL.platform.isTizen) {
      console.info('[mock] tvwindow.setSource(' + input.id + ') + launch ' + VIEWER);
      return Promise.resolve();
    }
    return sources(true).then(function (all) {
      var source = null;
      (all || []).forEach(function (s) { if (s.type === input.type && s.number === input.number) source = s; });
      if (!source || !window.tizen.tvwindow) {
        if (input.type === 'TV') return showViewer();
        throw new Error('source not found');
      }
      return new Promise(function (resolve, reject) {
        try { window.tizen.tvwindow.setSource(source, resolve, reject); }
        catch (e) { reject(e); }
      }).then(showViewer, function (err) {
        if (input.type === 'TV') return showViewer();
        throw err;
      });
    });
  }

  /* Samsung's settings menu */
  function openTvSettings() {
    if (!LL.platform.isTizen) { console.info('[mock] open TV settings'); return Promise.resolve(); }
    return new Promise(function (resolve, reject) {
      try {
        var control = new window.tizen.ApplicationControl('http://tizen.org/appcontrol/operation/setting', null, null, null, []);
        window.tizen.application.launchAppControl(control, null, resolve, reject);
      } catch (e) { reject(e); }
    });
  }

  LL.inputs = { list: list, open: open, openTvSettings: openTvSettings };
})(window.LL = window.LL || {});
