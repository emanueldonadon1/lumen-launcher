/*
 * Inputs side panel: TV, HDMI 1-4 (connected ones first-class), TV settings.
 */
(function (LL) {
  'use strict';

  var t = LL.i18n.t;
  var list = null;
  var inputs = [];

  function row(label, value, action) {
    var r = document.createElement('div');
    r.className = 'row';
    r.setAttribute('role', 'button');
    r.setAttribute('data-action', action);
    var l = document.createElement('span');
    l.className = 'row__label';
    l.textContent = label;
    var v = document.createElement('span');
    v.className = 'row__value';
    v.textContent = value;
    r.appendChild(l);
    r.appendChild(v);
    return r;
  }

  function render(focusIndex) {
    return LL.inputs.list().then(function (items) {
      inputs = items;
      list.textContent = '';
      items.forEach(function (input, i) {
        var r = row(input.label, input.connected ? (input.type === 'TV' ? '' : t('connected')) : t('notConnected'), 'input');
        r.setAttribute('data-index', String(i));
        if (!input.connected) r.classList.add('row--dim');
        list.appendChild(r);
      });
      list.appendChild(row(t('tvSettings'), '›', 'tvsettings'));
      LL.nav.focus('inputs.list', focusIndex);
    });
  }

  LL.screens = LL.screens || {};
  LL.screens.inputs = {
    overlay: true,

    init: function () {
      list = this.el.querySelector('.panel__list');
      LL.nav.defineZone('inputs.list', {
        el: list,
        selector: '.row',
        orientation: 'vertical',
        onEnter: function (el) {
          if (el.getAttribute('data-action') === 'tvsettings') {
            LL.inputs.openTvSettings().catch(function () { LL.toast.show(t('tvSettingsFailed'), 3000); });
            return;
          }
          var input = inputs[+el.getAttribute('data-index')];
          if (!input) return;
          LL.toast.show(t('switchingTo', { name: input.label }), 1500);
          LL.inputs.open(input).catch(function () {
            LL.toast.show(t('inputFailed', { name: input.label }), 3000);
          });
        }
      });
    },

    onShow: function (params) {
      render(params.restored ? undefined : 0);
    }
  };
})(window.LL = window.LL || {});
