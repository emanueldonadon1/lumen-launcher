/*
 * Web shortcut editor: name, URL, color. Opens in the TV's browser.
 * One geometric (grid) zone over every form item, so ↑↓←→ behave as the
 * layout suggests without hand-written neighbors.
 */
(function (LL) {
  'use strict';

  var t = LL.i18n.t;
  var COLORS = ['#3949ab', '#c62828', '#2e7d32', '#ef6c00', '#6a1b9a', '#00838f', '#37474f'];

  var form = null;
  var title = null;
  var nameInput = null;
  var urlInput = null;
  var removeBtn = null;
  var editing = null;   // entry being edited, or null for a new one
  var color = COLORS[0];

  function paintSwatches() {
    form.querySelectorAll('.swatch').forEach(function (s) {
      s.classList.toggle('is-selected', s.getAttribute('data-color') === color);
    });
  }

  function normalizeUrl(v) {
    v = String(v || '').trim();
    if (v && !/^https?:\/\//i.test(v)) v = 'https://' + v;
    return /^https?:\/\/[^\s/$.?#][^\s]*$/i.test(v) ? v : '';
  }

  function save() {
    var name = nameInput.value.trim();
    var url = normalizeUrl(urlInput.value);
    if (!name) { LL.toast.show(t('invalidName')); return; }
    if (!url) { LL.toast.show(t('invalidUrl')); return; }
    LL.store.upsertUrl({ type: 'url', id: editing ? editing.id : '', name: name, target: url, color: color });
    LL.toast.show(t('saved'), 1400);
    LL.router.back();
  }

  function remove() {
    if (!editing) return;
    LL.store.setShelf(LL.store.get().shelf.filter(function (e) { return !(e.type === 'url' && e.id === editing.id); }));
    LL.toast.show(t('removed'), 1400);
    LL.router.back();
  }

  function onEnter(el) {
    var action = el.getAttribute('data-action');
    if (action === 'field') el.querySelector('input').focus();
    else if (action === 'color') { color = el.getAttribute('data-color'); paintSwatches(); }
    else if (action === 'save') save();
    else if (action === 'remove') remove();
    else if (action === 'cancel') LL.router.back();
  }

  LL.screens = LL.screens || {};
  LL.screens.editor = {
    init: function () {
      form = this.el.querySelector('.form');
      title = this.el.querySelector('.sheet__title');
      nameInput = form.querySelector('input[name="name"]');
      urlInput = form.querySelector('input[name="url"]');
      removeBtn = form.querySelector('[data-action="remove"]');

      var swatches = form.querySelector('.swatches');
      COLORS.forEach(function (c) {
        var s = document.createElement('div');
        s.className = 'swatch form-item';
        s.setAttribute('role', 'button');
        s.setAttribute('data-action', 'color');
        s.setAttribute('data-color', c);
        s.style.backgroundColor = c;
        swatches.appendChild(s);
      });

      LL.nav.defineZone('editor.form', {
        el: form,
        selector: '.form-item',
        orientation: 'grid',
        onEnter: onEnter
      });
    },

    onShow: function (params) {
      if (params.restored) { LL.nav.focus('editor.form'); return; }
      editing = params.entry || null;
      title.textContent = t(editing ? 'editorEdit' : 'editorNew');
      nameInput.value = editing ? editing.name : '';
      urlInput.value = editing ? editing.target : '';
      color = editing && editing.color ? editing.color : COLORS[0];
      removeBtn.style.display = editing ? '' : 'none';
      paintSwatches();
      LL.nav.focus('editor.form', 0);
    }
  };
})(window.LL = window.LL || {});
