/*
 * Clock aligned to the minute boundary (one timer per minute, not per second).
 * Pauses while the app is hidden and resyncs on return. Other modules hook
 * onMinute() instead of running their own timers (day/night, dim, weather...).
 * Date strings are built by hand: Intl locale data on TV firmwares is inconsistent.
 */
(function (LL) {
  'use strict';

  var NAMES = {
    pt: {
      days: ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'],
      short: ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'],
      months: ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'],
      date: function (d, n) { return n.days[d.getDay()] + ', ' + d.getDate() + ' de ' + n.months[d.getMonth()]; }
    },
    en: {
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      short: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      date: function (d, n) { return n.days[d.getDay()] + ', ' + n.months[d.getMonth()] + ' ' + d.getDate(); }
    }
  };

  var outputs = [];     // [{ time, date, greeting }] elements to keep updated
  var listeners = [];
  var timer = null;

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function formatTime(d) {
    var h = d.getHours();
    if (LL.store.get().settings.clock24h) return pad(h) + ':' + pad(d.getMinutes());
    var h12 = h % 12 || 12;
    return h12 + ':' + pad(d.getMinutes()) + (h < 12 ? ' AM' : ' PM');
  }

  function formatDate(d) {
    var n = NAMES[LL.i18n.lang];
    return n.date(d, n);
  }

  function shortDay(ms) { return NAMES[LL.i18n.lang].short[new Date(ms).getDay()]; }
  function hourLabel(ms) {
    var d = new Date(ms);
    return LL.store.get().settings.clock24h ? pad(d.getHours()) + 'h' : ((d.getHours() % 12) || 12) + (d.getHours() < 12 ? 'am' : 'pm');
  }

  function greetingKey(h) {
    if (h >= 5 && h < 12) return 'greetMorning';
    if (h >= 12 && h < 18) return 'greetAfternoon';
    return 'greetEvening';
  }

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function render() {
    var now = new Date();
    var time = formatTime(now);
    var date = formatDate(now);
    var greet = LL.i18n.t(greetingKey(now.getHours()));
    outputs.forEach(function (o) {
      setText(o.time, time);
      setText(o.date, date);
      setText(o.greeting, greet);
    });
    return now;
  }

  function tick() {
    var now = render();
    listeners.forEach(function (fn) { fn(now); });
    timer = setTimeout(tick, 60000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 30);
  }

  function stop() { clearTimeout(timer); timer = null; }

  function start() {
    tick();
    document.addEventListener('visibilitychange', function () {
      stop();
      if (!document.hidden) tick();
    });
  }

  LL.clock = {
    start: start,
    bind: function (els) { outputs.push(els); render(); },
    onMinute: function (fn) { listeners.push(fn); },
    refresh: function () { if (timer) { stop(); tick(); } else render(); },
    formatTime: formatTime,
    shortDay: shortDay,
    hourLabel: hourLabel
  };
})(window.LL = window.LL || {});
