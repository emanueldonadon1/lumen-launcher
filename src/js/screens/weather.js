/*
 * Weather side panel: now, the next hours, the next 5 days, sun times.
 * Only two focusable rows (change city / refresh) - the rest is read-only.
 */
(function (LL) {
  'use strict';

  var t = LL.i18n.t;
  var body = null;

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  function icon(code, isDay, cls) {
    var i = node('span', cls);
    i.innerHTML = LL.wicons.icon(code, isDay);   // static trusted SVG template
    return i;
  }

  function render() {
    var w = LL.weather.get();
    body.textContent = '';
    var city = LL.place.get().city;
    body.appendChild(node('div', 'wx__city', city + (LL.place.isAuto() ? ' · ' + t('auto') : '')));

    if (!w) {
      body.appendChild(node('p', 'wx__empty', t('weatherUnavailable')));
      return;
    }

    var now = node('div', 'wx__now');
    now.appendChild(icon(w.code, w.isDay, 'wx__bigicon'));
    var nowText = node('div', 'wx__nowtext');
    nowText.appendChild(node('div', 'wx__temp', LL.weather.temp(w.temp)));
    nowText.appendChild(node('div', 'wx__desc', t(LL.weather.describe(w.code))));
    now.appendChild(nowText);
    body.appendChild(now);

    var facts = [
      t('wMaxMin', { max: LL.weather.temp(w.max), min: LL.weather.temp(w.min) }),
      t('wFeels', { v: LL.weather.temp(w.feels) }),
      t('wHumidity', { v: w.humidity }),
      t('wRainChance', { v: w.rain === null ? '--' : w.rain }),
      t('wSun', { rise: LL.clock.formatTime(new Date(w.sunrise)), set: LL.clock.formatTime(new Date(w.sunset)) }),
      t('wUv', { v: w.uv === null ? '--' : Math.round(w.uv) })
    ];
    var factsEl = node('div', 'wx__facts');
    facts.forEach(function (f) { factsEl.appendChild(node('span', 'wx__fact', f)); });
    body.appendChild(factsEl);

    var hours = node('div', 'wx__hours');
    w.hours.forEach(function (h) {
      var c = node('div', 'wx__hour');
      c.appendChild(node('span', 'wx__label', LL.clock.hourLabel(h.at)));
      c.appendChild(icon(h.code, h.day, 'wx__icon'));
      c.appendChild(node('span', 'wx__value', LL.weather.temp(h.temp)));
      hours.appendChild(c);
    });
    body.appendChild(hours);

    var days = node('div', 'wx__days');
    w.days.forEach(function (d) {
      var r = node('div', 'wx__day');
      r.appendChild(node('span', 'wx__dayname', LL.clock.shortDay(d.at)));
      r.appendChild(icon(d.code, true, 'wx__icon'));
      r.appendChild(node('span', 'wx__range', LL.weather.temp(d.max) + ' / ' + LL.weather.temp(d.min)));
      days.appendChild(r);
    });
    body.appendChild(days);
  }

  LL.screens = LL.screens || {};
  LL.screens.weather = {
    overlay: true,

    init: function () {
      body = this.el.querySelector('.wx');
      var actions = this.el.querySelector('.panel__actions');
      LL.nav.defineZone('weather.actions', {
        el: actions,
        selector: '.row',
        orientation: 'vertical',
        onEnter: function (el) {
          var a = el.getAttribute('data-action');
          if (a === 'city') LL.router.show('city');
          else if (a === 'refresh') {
            LL.toast.show(t('updating'), 1200);
            LL.weather.refresh(true).then(render);
          }
        }
      });
      LL.weather.onChange(function () { if (LL.router.top() === LL.screens.weather) render(); });
    },

    onShow: function (params) {
      render();
      LL.nav.focus('weather.actions', params.restored ? undefined : 0);
    }
  };
})(window.LL = window.LL || {});
