/* Shared case-study behaviour: email toast, reveal on scroll, and the annotated prototype. */
(function () {
  document.documentElement.classList.add('js');

  /* Email links copy the address and offer Gmail, as on the landing page */
  var ADDR = 'ankushmeena0779@gmail.com';
  var pop = document.getElementById('mail-pop'), popTimer;
  function copyText(t) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t);
    var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} document.body.removeChild(ta);
    return Promise.resolve();
  }
  function showPop() { pop.classList.add('show'); clearTimeout(popTimer); popTimer = setTimeout(function () { pop.classList.remove('show'); }, 9000); }
  if (pop) {
    document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
      if (pop.contains(a)) return;
      a.addEventListener('click', function (e) { e.preventDefault(); copyText(ADDR).then(showPop, showPop); });
    });
    var mc = document.getElementById('mail-close');
    if (mc) mc.addEventListener('click', function () { pop.classList.remove('show'); });
  }

  /* Reveal on scroll */
  var rv = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    rv.forEach(function (el) { io.observe(el); });
  } else { rv.forEach(function (el) { el.classList.add('in'); }); }

  /* Annotated prototype */
  var P = window.CS_PROTO;
  var root = document.getElementById('proto');
  if (!P || !root) return;

  var tabs = root.querySelector('.flow');
  var vp = root.querySelector('.viewport');
  var notes = root.querySelector('.notes');
  var full = root.querySelector('.frame-bar a');
  var url = root.querySelector('.frame-bar .url');
  var iframe = null, ready = false, active = null;

  if (P.device) root.querySelector('.proto').classList.add('device-' + P.device);
  if (P.bg) vp.style.background = P.bg;
  vp.style.setProperty('--vw', P.vw || 1440);
  vp.style.setProperty('--vh', P.vh || 900);
  tabs.style.setProperty('--n', P.screens.length);

  // Tabs
  P.screens.forEach(function (s, k) {
    var li = document.createElement('li');
    li.setAttribute('role', 'presentation');
    li.innerHTML = '<button type="button" role="tab" id="tab-' + s.id + '" aria-controls="proto-panel" aria-selected="false" tabindex="-1">' +
      '<span class="fstep">' + (k + 1) + ' · ' + s.step + '</span><span class="fname">' + s.name + '</span><span class="fcap">' + s.cap + '</span></button>';
    tabs.appendChild(li);
  });
  var btns = tabs.querySelectorAll('button');
  btns.forEach(function (b, k) {
    b.addEventListener('click', function () { select(P.screens[k].id, true); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = (k + d + btns.length) % btns.length;
      btns[n].focus(); select(P.screens[n].id, true);
    });
  });

  function screenById(id) { for (var i = 0; i < P.screens.length; i++) if (P.screens[i].id === id) return P.screens[i]; return null; }

  function screenMsg(s) { return { type: 'screen', name: s.id, marks: s.marks, color: P.color, ring: P.ring, call: s.call }; }
  function send(msg) { if (iframe && ready) iframe.contentWindow.postMessage(msg, '*'); }

  function renderNotes(s) {
    var html = '<div class="fade"><p class="label">' + s.kicker + '</p><h3 class="h3" style="margin-top:10px">' + s.title + '</h3><ol>';
    s.marks.forEach(function (m) {
      html += '<li data-n="' + m.n + '" tabindex="0"><span class="n" aria-hidden="true">' + m.n + '</span><div><b>' + m.t + '</b><span>' + m.d + '</span></div></li>';
    });
    notes.innerHTML = html + '</ol></div>';
    notes.querySelectorAll('li').forEach(function (li) {
      var on = function () { notes.querySelectorAll('li').forEach(function (x) { x.classList.toggle('on', x === li); }); send({ type: 'hl', n: li.getAttribute('data-n') }); };
      var off = function () { li.classList.remove('on'); send({ type: 'hl', n: null }); };
      li.addEventListener('mouseenter', on); li.addEventListener('focus', on);
      li.addEventListener('mouseleave', off); li.addEventListener('blur', off);
    });
  }

  function select(id, fromUser) {
    var s = screenById(id); if (!s) return;
    if (active === id && !fromUser) return;
    active = id;
    btns.forEach(function (b, k) {
      var on = P.screens[k].id === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });
    renderNotes(s);
    if (url) url.textContent = (P.host || 'prototype') + ' / ' + s.name;
    if (full) full.href = P.app + '#' + id;
    send(screenMsg(s));
  }

  // Scale the fixed-size prototype to the frame width
  function fit() { vp.style.setProperty('--scale', vp.clientWidth / (P.vw || 1440)); }
  if ('ResizeObserver' in window) new ResizeObserver(fit).observe(vp); else window.addEventListener('resize', fit);
  fit();

  window.addEventListener('message', function (e) {
    if (!iframe || e.source !== iframe.contentWindow) return;
    var m = e.data || {};
    if (m.type === 'proto-ready') {
      ready = true;
      var l = vp.querySelector('.loading'); if (l) l.remove();
      send(screenMsg(screenById(active)));
    } else if (m.type === 'screen-changed' && screenById(m.name)) {
      if (m.name !== active) select(m.name, false);
      else send(screenMsg(screenById(active)));
    }
  });

  // Load the prototype when it comes near the viewport
  function load() {
    if (iframe) return;
    iframe = document.createElement('iframe');
    iframe.title = P.title || 'Interactive prototype';
    iframe.src = P.app + '?embed';
    iframe.setAttribute('loading', 'lazy');
    vp.appendChild(iframe);
  }
  select(P.screens[0].id, false);
  if ('IntersectionObserver' in window) {
    var lo = new IntersectionObserver(function (es) { if (es.some(function (e) { return e.isIntersecting; })) { load(); lo.disconnect(); } }, { rootMargin: '600px 0px' });
    lo.observe(vp);
  } else load();
})();
