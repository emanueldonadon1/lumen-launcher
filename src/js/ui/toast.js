(function (LL) {
  'use strict';

  var el = null;
  var timer = null;

  function show(message, durationMs) {
    if (!el) el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(timer);
    timer = setTimeout(function () { el.classList.remove('is-visible'); }, durationMs || 2200);
  }

  LL.toast = { show: show };
})(window.LL = window.LL || {});
