/*
 * App tile ("face"): brand logo on its gradient, or the TV's own icon, or the
 * name as a wordmark when nothing can be loaded. All text via textContent.
 */
(function (LL) {
  'use strict';

  function darken(hex, f) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return '#17191e';
    var n = parseInt(m[1], 16);
    return 'rgb(' + Math.round(((n >> 16) & 255) * f) + ',' + Math.round(((n >> 8) & 255) * f) + ',' + Math.round((n & 255) * f) + ')';
  }

  /* Shelf entry (or installed app) -> what to draw. */
  function resolve(entry) {
    if (entry.type === 'url') {
      var c = entry.color || '#3949ab';
      return { name: entry.name, logo: '', icon: '', gradient: [c, darken(c, 0.55)], badge: 'WEB', missing: false };
    }
    var appId = entry.type === 'app' ? entry.target : entry.appId;
    var app = LL.installed.get(appId);
    if (!app) {
      return { name: entry.name || appId, logo: '', icon: '', gradient: LL.catalog.neutralGradient, badge: '', missing: true };
    }
    return { name: app.title, logo: app.logo, icon: app.icon, gradient: app.gradient, badge: '', missing: false };
  }

  function wordmark(art, name) {
    var w = document.createElement('span');
    w.className = 'tile__name';
    w.textContent = name;
    art.appendChild(w);
  }

  function build(view, opts) {
    opts = opts || {};
    var tile = document.createElement('div');
    tile.className = 'tile' + (opts.extraClass ? ' ' + opts.extraClass : '');
    tile.setAttribute('role', 'button');

    var art = document.createElement('div');
    art.className = 'tile__art';
    art.style.backgroundImage = 'linear-gradient(160deg,' + view.gradient[0] + ',' + view.gradient[1] + ')';

    var src = view.logo || view.icon;
    if (src) {
      var img = new Image();
      img.alt = '';
      img.className = view.logo ? 'tile__logo' : 'tile__icon';
      img.onerror = function () {
        if (img.parentNode) img.parentNode.removeChild(img);
        wordmark(art, view.name);
      };
      img.src = src;
      art.appendChild(img);
    } else {
      wordmark(art, view.name);
    }

    if (view.badge) {
      var badge = document.createElement('span');
      badge.className = 'tile__badge';
      badge.textContent = view.badge;
      art.appendChild(badge);
    }
    if (opts.starred) {
      var star = document.createElement('span');
      star.className = 'tile__star';
      star.textContent = '★';
      art.appendChild(star);
    }

    var label = document.createElement('div');
    label.className = 'tile__label';
    label.textContent = view.name;

    tile.appendChild(art);
    tile.appendChild(label);
    return tile;
  }

  function buildAdd(label) {
    var tile = build({ name: label, gradient: ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)'] }, { extraClass: 'tile--add' });
    tile.querySelector('.tile__name').textContent = '+';
    return tile;
  }

  /* TMDB pick: backdrop image, title over a bottom gradient, the app as a chip. */
  function buildPoster(pick, app) {
    var tile = document.createElement('div');
    tile.className = 'tile tile--poster';
    tile.setAttribute('role', 'button');

    var art = document.createElement('div');
    art.className = 'tile__art';
    art.style.backgroundImage = 'url("' + String(pick.image).replace(/"/g, '%22') + '")';

    var shade = document.createElement('div');
    shade.className = 'tile__shade';
    var title = document.createElement('span');
    title.className = 'tile__title';
    title.textContent = pick.title;
    shade.appendChild(title);
    art.appendChild(shade);

    var badge = document.createElement('span');
    badge.className = 'tile__badge';
    badge.textContent = app.title;
    art.appendChild(badge);

    var label = document.createElement('div');
    label.className = 'tile__label';
    label.textContent = pick.year ? pick.title + ' · ' + pick.year : pick.title;

    tile.appendChild(art);
    tile.appendChild(label);
    return tile;
  }

  LL.tile = { resolve: resolve, build: build, buildAdd: buildAdd, buildPoster: buildPoster, darken: darken };
})(window.LL = window.LL || {});
