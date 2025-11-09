(function(){
  // Delegated submit for booking forms (Formspree)
  document.addEventListener('submit', async (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!form.classList.contains('booking-form')) return;
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn && (btn.disabled = true, btn.textContent = 'Sending...');
    try {
      const res = await fetch(form.action, {
        method: form.method || 'POST',
        body: new FormData(form),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        alert("Thanks! We'll contact you soon.");
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = (data && data.errors && data.errors.length) ? data.errors.map(e => e.message).join('\n') : 'Something went wrong. Please try again later.';
        alert(msg);
      }
    } catch(err){
      alert('Network error. Please try again later.');
    } finally {
      btn && (btn.disabled = false, btn.textContent = 'Send');
    }
  });

  // Swiper init helper (used on initial and PJAX loads)
  function initSwipers(ctx){
    if (typeof Swiper === 'undefined') return;
    const list = (ctx || document).querySelectorAll('.swiper-container[data-swiper]');
    list.forEach(el => {
      try {
        const opts = JSON.parse(el.getAttribute('data-swiper') || '{}');
        new Swiper(el, opts);
      } catch(_) {}
    });
  }

  // Simple PJAX navigation for internal .html links (keeps audio playing)
  async function loadPage(url, addHistory){
    try {
      const res = await fetch(url, { credentials: 'same-origin' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const newMain = doc.querySelector('main.main');
      if (!newMain) return location.assign(url);
      const curMain = document.querySelector('main.main');
      if (curMain) curMain.replaceWith(newMain);
      document.title = doc.title || document.title;
      if (addHistory) history.pushState({}, '', url);
      window.scrollTo(0, 0);
      initSwipers(newMain);
    } catch (e) {
      location.assign(url);
    }
  }

  function isInternalHTML(href){
    try {
      const u = new URL(href, location.href);
      return u.origin === location.origin && /\.html$/.test(u.pathname);
    } catch { return false; }
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) return;
    const abs = new URL(href, location.href).href;
    if (isInternalHTML(abs)) {
      e.preventDefault();
      loadPage(abs, true);
    }
  });
  window.addEventListener('popstate', () => loadPage(location.href, false));

  // Initialize swipers on first load
  initSwipers(document);

  // Background music: autoplay muted; unmute on first user interaction; persist state across reloads
  (function(){
    const audio = document.getElementById('bgm');
    if(!audio) return;
    const DEFAULT_VOL = 0.25; // 50% quieter
    audio.volume = DEFAULT_VOL;
    const tryPlay = () => { audio.play().catch(() => {}); };
    tryPlay();

    const enableSound = () => {
      audio.muted = false;
      tryPlay();
      window.removeEventListener('pointerdown', enableSound);
      window.removeEventListener('keydown', enableSound);
      window.removeEventListener('touchstart', enableSound);
    };
    window.addEventListener('pointerdown', enableSound, { once: true });
    window.addEventListener('keydown', enableSound, { once: true });
    window.addEventListener('touchstart', enableSound, { once: true });

    const STORAGE_KEY = 'tubbies_bgm_state';
    function saveState(){
      try {
        const state = {
          t: Math.max(0, audio.currentTime || 0),
          m: !!audio.muted,
          v: Math.min(DEFAULT_VOL, audio.volume || DEFAULT_VOL)
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch(_) {}
    }
    function restoreState(){
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const st = JSON.parse(raw);
        if (st && typeof st.t === 'number') {
          const seek = () => {
            try { audio.currentTime = st.t; } catch(_) {}
          };
          if (isFinite(audio.duration)) seek(); else audio.addEventListener('loadedmetadata', seek, { once: true });
        }
        if (typeof st.v === 'number') audio.volume = Math.min(DEFAULT_VOL, st.v);
        if (typeof st.m === 'boolean') audio.muted = st.m;
        tryPlay();
      } catch(_) {}
    }
    restoreState();
    window.addEventListener('pagehide', saveState);
    window.addEventListener('beforeunload', saveState);
  })();
})();
