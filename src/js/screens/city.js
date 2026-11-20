/*
 * City picker: type a name (TV keyboard), pick a result, or go back to the
 * automatic city from the TV's time zone. One vertical zone: field, results.
 */
(function (LL) {
  'use strict';

  var t = LL.i18n.t;
  var list = null;
  var input = null;
  var status = null;
  var results = [];

  function row(label, value, action) {
    var r = document.createElement('div');
    r.className = 'row result';
    r.setAttribute('role', 'button');
    r.setAttribute('data-action', action);
    var l = document.createElement('span');
    l.className = 'row__label';
    l.textContent = label;
    r.appendChild(l);
    if (value) {
      var v = document.createElement('span');
      v.className = 'row__value';
      v.textContent = value;
      r.appendChild(v);
    }
    return r;
  }

  function clearResults() {
    Array.prototype.slice.call(list.querySelectorAll('.result')).forEach(function (r) { r.parentNode.removeChild(r); });
  }

  function renderResults() {
    clearResults();
    list.appendChild(row(t('cityAuto'), LL.place.isAuto() ? '✓' : '', 'auto'));
    results.forEach(function (r, i) {
      var el = row(r.label, '', 'pick');
      el.setAttribute('data-index', String(i));
      list.appendChild(el);
    });
  }

  function search() {
    var q = input.value.trim();
    if (q.length < 2) return;
    status.textContent = t('searching');
    LL.place.search(q).then(function (found) {
      results = found;
      status.textContent = found.length ? '' : t('noResults');
      renderResults();
      if (found.length) LL.nav.focus('city.list', 2);   // first result
    }, function () {
      status.textContent = t('noConnection');
    });
  }

  function choose(place) {
    LL.place.set(place);
    LL.weather.refresh(true);
    LL.picks.refresh(true);
    LL.toast.show(t('citySet', { name: place ? place.city : LL.place.get().city }), 1800);
    LL.router.back();
  }

  LL.screens = LL.screens || {};
  LL.screens.city = {
    init: function () {
      list = this.el.querySelector('.city__list');
      input = this.el.querySelector('input[name="city"]');
      status = this.el.querySelector('.city__status');
      input.addEventListener('change', search);
      LL.nav.defineZone('city.list', {
        el: list,
        selector: '.row',
        orientation: 'vertical',
        onEnter: function (el) {
          var a = el.getAttribute('data-action');
          if (a === 'field') input.focus();
          else if (a === 'auto') choose(null);
          else if (a === 'pick') choose(results[+el.getAttribute('data-index')]);
        }
      });
    },

    onShow: function (params) {
      if (!params.restored) {
        input.value = '';
        results = [];
        status.textContent = '';
        renderResults();
      }
      LL.nav.focus('city.list', params.restored ? undefined : 0);
    }
  };
})(window.LL = window.LL || {});
