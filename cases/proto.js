/* Prototype bridge.
   Loaded by each *-app.html prototype. When the page is opened with ?embed it hides its own
   top bar and listens to the case study page around it:
     {type:'screen', name, marks:[{n, sel, i, x, y, dx, dy}], color}  switch screen and pin numbered markers
     {type:'hl', n}                                                    highlight one marker and scroll it into view
   It reports back {type:'screen-changed', name} when someone clicks through the prototype. */
(function () {
  var embed = /[?&]embed\b/.test(location.search);
  if (embed) document.documentElement.classList.add('embed');

  var css = document.createElement('style');
  css.textContent =
    'html.embed .top-nav,html.embed .app-topbar{display:none!important}' +
    'html.embed .page-wrap{margin-top:0!important}html.embed body{padding-top:0!important}' +
    'html.embed .app-shell{height:100vh!important}' +
    '.cm{position:absolute;z-index:9999;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;' +
    'background:var(--cm-c,#C8102E);color:#fff;font:700 12px/26px system-ui,-apple-system,"Segoe UI",sans-serif;text-align:center;' +
    'box-shadow:0 0 0 3px #fff,0 6px 16px -4px rgba(0,0,0,.45);pointer-events:none;' +
    'transition:transform .3s cubic-bezier(.16,1,.3,1),box-shadow .3s ease;animation:cm-in .45s cubic-bezier(.16,1,.3,1) both}' +
    '.cm.on{transform:scale(1.3);box-shadow:0 0 0 3px #fff,0 0 0 10px var(--cm-r,rgba(200,16,46,.28)),0 6px 16px -4px rgba(0,0,0,.45)}' +
    '@keyframes cm-in{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:none}}';
  document.head.appendChild(css);

  var marks = [], current = null;

  function scrollParent(el) {
    var p = el.parentElement;
    while (p && p !== document.body) {
      var oy = getComputedStyle(p).overflowY;
      if ((oy === 'auto' || oy === 'scroll') && p.scrollHeight > p.clientHeight) return p;
      p = p.parentElement;
    }
    return null;
  }

  function clear() { document.querySelectorAll('.cm').forEach(function (e) { e.remove(); }); }

  function place() {
    clear();
    marks.forEach(function (m, k) {
      var el = document.querySelectorAll(m.sel)[m.i || 0];
      if (!el || !el.getClientRects().length) return;
      var r = el.getBoundingClientRect();
      var host = scrollParent(el) || document.body;
      var hr = host === document.body ? { left: -scrollX, top: -scrollY } : host.getBoundingClientRect();
      if (host !== document.body && getComputedStyle(host).position === 'static') host.style.position = 'relative';
      var d = document.createElement('div');
      d.className = 'cm';
      d.setAttribute('data-n', m.n);
      d.textContent = m.n;
      d.style.animationDelay = (k * 60) + 'ms';
      d.style.left = (r.left - hr.left + (host.scrollLeft || 0) + (m.x || 0) * r.width + (m.dx || 0)) + 'px';
      d.style.top = (r.top - hr.top + (host.scrollTop || 0) + (m.y || 0) * r.height + (m.dy || 0)) + 'px';
      host.appendChild(d);
    });
  }

  function hl(n) {
    document.querySelectorAll('.cm').forEach(function (d) {
      var on = String(d.getAttribute('data-n')) === String(n);
      d.classList.toggle('on', on);
      if (on) {
        var host = d.parentElement, top = parseFloat(d.style.top);
        if (host && host !== document.body && (top < host.scrollTop + 40 || top > host.scrollTop + host.clientHeight - 60)) {
          host.scrollTo({ top: Math.max(0, top - host.clientHeight / 3), behavior: 'smooth' });
        } else if (host === document.body && (top < scrollY + 40 || top > scrollY + innerHeight - 60)) {
          scrollTo({ top: Math.max(0, top - innerHeight / 3), behavior: 'smooth' });
        }
      }
    });
  }

  // Wrap the page's own show() so clicks inside the prototype keep the tabs outside in sync
  function hook() {
    if (typeof window.show !== 'function' || window.show.__bridged) return;
    var orig = window.show;
    var wrapped = function (name) {
      var r = orig.apply(this, arguments);
      if (current !== name) { current = name; marks = []; clear(); }
      if (embed && !window.__bridgeSilent && window.parent !== window) window.parent.postMessage({ type: 'screen-changed', name: name }, '*');
      return r;
    };
    wrapped.__bridged = true;
    window.show = wrapped;
  }

  window.addEventListener('message', function (e) {
    var m = e.data || {};
    if (m.type === 'screen') {
      hook();
      if (m.color) {
        document.documentElement.style.setProperty('--cm-c', m.color);
        if (m.ring) document.documentElement.style.setProperty('--cm-r', m.ring);
      }
      if (current !== m.name) {
        current = m.name;
        try { window.__bridgeSilent = true; window.show(m.name); } finally { window.__bridgeSilent = false; }
      }
      marks = m.marks || [];
      requestAnimationFrame(function () { requestAnimationFrame(place); });
    } else if (m.type === 'hl') {
      hl(m.n);
    }
  });

  window.addEventListener('resize', function () { if (marks.length) place(); });
  window.addEventListener('load', function () {
    hook();
    if (embed && window.parent !== window) window.parent.postMessage({ type: 'proto-ready' }, '*');
  });
})();
