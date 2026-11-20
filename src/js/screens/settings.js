/*
 * Settings: a side panel over the dimmed home (Google TV style).
 * One vertical zone of rows. Row types:
 *   cycle  - OK steps through values
 *   toggle - OK flips a boolean
 *   text   - OK opens the TV keyboard on an <input>
 *   link   - OK opens another screen
 *   action - OK runs something
 *   info   - read only
 *   header - section title (not focusable)
 */
(function (LL) {
  'use strict';

  var t = LL.i18n.t;
  var list = null;
  var scroller = null;
  var resetArmedUntil = 0;

  function onOff(v) { return t(v ? 'on' : 'off'); }

  function normalizeUrl(v) {
    v = String(v || '').trim();
    if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
    return v;
  }

  var ROWS = [
    { type: 'header', label: 'secLook' },
    { key: 'theme', type: 'cycle', label: 'setTheme', values: LL.theme.THEMES,
      fmt: function (v) { return t('theme_' + v); } },
    { key: 'wallpaperUrl', type: 'text', label: 'setWallpaper', placeholder: 'https://…', clean: normalizeUrl },
    { key: 'dim', type: 'cycle', label: 'setDim', values: ['off', 'low', 'medium', 'high', 'auto'],
      fmt: function (v) { return t('dim_' + v); } },
    { key: 'saver', type: 'cycle', label: 'setSaver', values: [0, 5, 10, 15, 30],
      fmt: function (v) { return v ? t('minutes', { n: v }) : t('off'); } },
    { key: 'clock24h', type: 'toggle', label: 'setClock', fmt: function (v) { return v ? '24h' : '12h'; } },

    { type: 'header', label: 'secWeather' },
    { key: 'weather', type: 'toggle', label: 'setWeather', fmt: onOff,
      after: function () { LL.weather.refresh(); } },
    { type: 'link', label: 'setCity', go: 'city',
      value: function () { return LL.place.get().city + (LL.place.isAuto() ? ' (' + t('auto') + ')' : ''); } },
    { key: 'tempUnit', type: 'cycle', label: 'setUnit', values: ['auto', 'c', 'f'],
      fmt: function (v) { return v === 'auto' ? t('auto') : (v === 'c' ? '°C' : '°F'); } },

    { type: 'header', label: 'secHome' },
    { key: 'showRecents', type: 'toggle', label: 'setRecents', fmt: onOff },
    { key: 'showPicks', type: 'toggle', label: 'setPicks', fmt: onOff,
      after: function () { LL.picks.refresh(true); } },
    { key: 'tmdbKey', type: 'text', label: 'setTmdb', placeholder: t('tmdbHint'),
      clean: function (v) { return String(v || '').trim(); }, after: function () { LL.picks.refresh(true); } },
    { type: 'link', label: 'setShelf', go: 'shelf' },
    { type: 'link', label: 'allApps', go: 'apps' },
    { type: 'link', label: 'setAddWeb', go: 'editor' },

    { type: 'header', label: 'secSystem' },
    { key: 'perf', type: 'cycle', label: 'setPerf', values: ['auto', 'full', 'lite'],
      fmt: function (v) { return v === 'auto' ? t('perfAuto', { tier: t('perf_' + LL.platform.autoTier) }) : t('perf_' + v); },
      after: function (v) { LL.platform.applyTier(v); } },
    { key: 'bootAnimation', type: 'toggle', label: 'setBoot', fmt: onOff },
    { type: 'action', label: 'setReset', run: reset },
    { type: 'info', label: 'setAbout', value: function () { return 'Lumen Launcher v' + LL.version; } },
    { type: 'info', label: 'tmdbCredit', value: function () { return ''; } }
  ];

  var focusable = [];   // ROWS that are focusable, index-aligned with nav items

  function buildRow(def) {
    var row = document.createElement('div');
    if (def.type === 'header') {
      row.className = 'panel__section';
      row.textContent = t(def.label);
      return row;
    }
    row.className = 'row row--' + def.type;
    row.setAttribute('role', 'button');

    var label = document.createElement('span');
    label.className = 'row__label';
    label.textContent = t(def.label);
    row.appendChild(label);

    if (def.type === 'text') {
      var input = document.createElement('input');
      input.type = 'text';
      input.className = 'row__input';
      input.placeholder = def.placeholder || '';
      input.tabIndex = -1;
      input.setAttribute('autocomplete', 'off');
      input.addEventListener('change', function () {
        var v = def.clean ? def.clean(input.value) : input.value;
        input.value = v;
        LL.store.setSetting(def.key, v);
        if (def.after) def.after(v);
      });
      row.appendChild(input);
      def.input = input;
    } else {
      var value = document.createElement('span');
      value.className = 'row__value';
      row.appendChild(value);
      def.valueEl = value;
    }
    focusable.push(def);
    return row;
  }

  function refreshValues() {
    var s = LL.store.get().settings;
    ROWS.forEach(function (def) {
      if (def.type === 'text') {
        if (document.activeElement !== def.input) def.input.value = s[def.key] || '';
      } else if (def.type === 'cycle' || def.type === 'toggle') {
        def.valueEl.textContent = def.fmt(s[def.key]);
      } else if (def.type === 'link') {
        def.valueEl.textContent = def.value ? def.value() + '  ›' : '›';
      } else if (def.type === 'info') {
        def.valueEl.textContent = def.value();
      }
    });
  }

  function reset() {
    var now = Date.now();
    if (now > resetArmedUntil) {
      resetArmedUntil = now + 3000;
      LL.toast.show(t('resetConfirm'), 3000);
      return;
    }
    resetArmedUntil = 0;
    LL.store.reset();
    LL.platform.applyTier('auto');
    LL.store.seedShelf();
    LL.weather.refresh(true);
    refreshValues();
    LL.toast.show(t('resetDone'));
  }

  function onEnter(el, index) {
    var def = focusable[index];
    if (!def) return;
    var s = LL.store.get().settings;
    if (def.type === 'cycle') {
      var i = def.values.indexOf(s[def.key]);
      var next = def.values[(i + 1) % def.values.length];
      LL.store.setSetting(def.key, next);
      if (def.after) def.after(next);
    } else if (def.type === 'toggle') {
      LL.store.setSetting(def.key, !s[def.key]);
      if (def.after) def.after(!s[def.key]);
    } else if (def.type === 'text') {
      def.input.focus();          // opens the TV keyboard; keys.js gives control back on Done
    } else if (def.type === 'link') {
      LL.router.show(def.go);
    } else if (def.type === 'action') {
      def.run();
    }
    refreshValues();
  }

  LL.screens = LL.screens || {};
  LL.screens.settings = {
    overlay: true,

    init: function () {
      list = this.el.querySelector('.panel__list');
      scroller = new LL.VScroll(this.el.querySelector('.panel__viewport'), list, 70);
      var frag = document.createDocumentFragment();
      ROWS.forEach(function (def) { frag.appendChild(buildRow(def)); });
      list.appendChild(frag);

      LL.nav.defineZone('settings.list', {
        el: list,
        selector: '.row',
        orientation: 'vertical',
        onFocus: function (el) { scroller.reveal(el); },
        onEnter: onEnter
      });
      LL.store.on(function (topic) { if (topic === 'settings') refreshValues(); });
    },

    onShow: function (params) {
      refreshValues();
      LL.nav.focus('settings.list', params.restored ? undefined : 0);
    }
  };
})(window.LL = window.LL || {});
