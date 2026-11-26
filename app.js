(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { const v = localStorage.getItem('a4y:' + k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem('a4y:' + k, JSON.stringify(v)); } catch { /* private mode */ } },
  };
  const pid = (n) => 'p' + String(n).padStart(3, '0');
  const vid = (n) => 'v' + String(n).padStart(2, '0');

  let C = null;   // decrypted content
  let KEY = null; // AES key

  /* ================= crypto ================= */
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  async function deriveKey(pw) {
    const meta = await fetch('data/meta.json', { cache: 'no-store' }).then((r) => r.json());
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(meta.s), iterations: meta.i, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  }
  async function decryptBuf(buf, key = KEY) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
  }
  const mediaCache = new Map();
  function media(id, type = 'image/jpeg') {
    if (!mediaCache.has(id)) {
      const p = fetch('data/m/' + C.media[id] + '.bin')
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((b) => decryptBuf(b))
        .then((d) => URL.createObjectURL(new Blob([d], { type })));
      p.catch(() => mediaCache.delete(id));
      mediaCache.set(id, p);
    }
    return mediaCache.get(id);
  }

  /* lazy photo element: <div class="ph"><img></div> */
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { io.unobserve(e.target); loadPh(e.target); }
  }, { rootMargin: '400px 0px' });
  function loadPh(ph) {
    const img = ph.querySelector('img');
    media(ph.dataset.id).then((url) => {
      img.onload = () => { img.classList.add('in'); ph.classList.add('done'); };
      img.src = url;
    }).catch(() => { ph.classList.add('done'); });
  }
  function photo(n, { thumb = true, ratio = false } = {}) {
    const ph = el('div', 'ph');
    ph.dataset.id = pid(n) + (thumb ? '_t' : '');
    if (ratio && C.dims[pid(n)]) { const [w, h] = C.dims[pid(n)]; ph.style.aspectRatio = `${w} / ${h}`; }
    const img = el('img'); img.alt = ''; img.decoding = 'async';
    ph.append(img);
    io.observe(ph);
    return ph;
  }
  function polaroid(n, opts = {}) {
    const p = el('div', 'polaroid');
    if (opts.tape) p.append(el('span', 'tape' + (opts.tape === 'blue' ? ' blue' : '')));
    p.append(photo(n, opts));
    if (opts.zoom) { p.addEventListener('click', () => openLightbox(opts.zoom, opts.zoom.indexOf(n))); }
    return p;
  }

  /* ================= toast / petals ================= */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600);
  }
  function petals(n = 30) {
    const set = ['🌸', '💗', '🌷', '☁️', '💙', '✿'];
    for (let i = 0; i < n; i++) {
      const p = el('span', 'petal', set[i % set.length]);
      p.style.left = Math.random() * 100 + 'vw';
      p.style.animationDuration = 3 + Math.random() * 3 + 's';
      p.style.animationDelay = Math.random() * 1.5 + 's';
      p.style.fontSize = 14 + Math.random() * 18 + 'px';
      document.body.append(p);
      setTimeout(() => p.remove(), 7000);
    }
  }

  /* ================= lock ================= */
  const thaiDigits = '๐๑๒๓๔๕๖๗๘๙';
  function normalize(raw) {
    let d = raw.replace(/[๐-๙]/g, (c) => thaiDigits.indexOf(c)).replace(/\D/g, '');
    if (/^0?27(11)(2565|65|2022|22)$/.test(d) || /^0?2711(2565|65|2022|22)$/.test(d)) d = '27112565';
    return d;
  }
  const nopes = [
    'ผิดจ้า 🙅 ลองใหม่',
    'เอ๊ะ... จำวันครบรอบไม่ได้หรอ 🥲',
    'ใบ้ให้: เดือนที่มีพลุที่พัทยา 🎆',
    'ใบ้อีก: วันที่ 27 ... ที่เหลือคิดเอง 😤',
    'สกายกับคลาวดี้เริ่มสงสัยแล้วนะ 🐱🐱',
    'ใบ้สุดท้าย: 27 11 แล้วต่อด้วยปี พ.ศ. 🙏',
    'ไม่ใช่แฟนเค้าใช่มั้ย... ใช่มั้ย 😾',
    'สกายขู่ฟ่อแล้ว ลองอีกทีก่อนโดนข่วน 🐾',
    'คลาวดี้หูพับ (ปกติก็พับอยู่แล้ว) แต่ยังรอเธออยู่นะ 🥺',
    'ลองพิมพ์แบบ วว ดด ปปปป ดูน้า 💗',
  ];
  let tries = 0;
  $('#lockForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const btn = $('#unlockBtn'), msg = $('#lockMsg'), pw = normalize($('#pw').value);
    if (!pw) { msg.textContent = 'พิมพ์รหัสก่อนน้า 🥺'; return; }
    if (!window.crypto || !crypto.subtle) { msg.textContent = 'เบราว์เซอร์นี้เปิดไม่ได้ ลองเปิดด้วย Safari หรือ Chrome นะ'; return; }
    btn.disabled = true; btn.textContent = 'กำลังเช็ก... 🔍';
    try {
      const key = await deriveKey(pw);
      const buf = await fetch('data/c.bin', { cache: 'no-store' }).then((r) => r.arrayBuffer());
      const data = await decryptBuf(buf, key);
      KEY = key;
      C = JSON.parse(new TextDecoder().decode(data));
      msg.textContent = 'ถูกต้อง! ยินดีต้อนรับแฟนตัวจริง 💗';
      $('.lock-card').classList.add('lock-out');
      setTimeout(start, 650);
    } catch (e) {
      const card = $('.lock-card');
      card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      msg.textContent = tries < 5 ? nopes[tries] : nopes[5 + ((tries - 5) % (nopes.length - 5))];
      tries++;
      btn.disabled = false; btn.textContent = 'เปิดเลย 💗';
    }
  });

  /* ================= start ================= */
  function start() {
    $('#lock').remove();
    $('#app').hidden = false; $('#fab').hidden = false;
    document.querySelectorAll('[data-k]').forEach((n) => {
      const v = n.dataset.k.split('.').reduce((o, k) => o?.[k], C);
      if (v != null) n.textContent = v;
    });
    window.scrollTo(0, 0);
    petals(36);
    buildHero(); buildQuiz(); buildTimeline(); buildMap(); buildGallery();
    buildReasons(); buildCoupons(); buildBucket(); buildLetter(); buildVideos(); buildFinale(); buildControls();
    initChapters();
  }

  /* ================= chapters (no skipping) ================= */
  const CHAPS = ['hero', 'quiz', 'timeline', 'map', 'gallery', 'reasons', 'coupons', 'bucket', 'letter', 'videos', 'finale'];
  const WAIT = {
    quiz: 'ตอบให้ครบทุกข้อก่อน ถึงจะไปต่อได้ 🔒',
    timeline: 'อ่านให้ถึงเรื่องสุดท้ายก่อนน้า 🔒',
    map: 'แตะดูให้ครบทุกที่ก่อนน้า 🔒',
    gallery: 'เลื่อนดูรูปให้ถึงล่างสุดก่อนน้า 🔒',
    reasons: 'พลิกการ์ดให้ครบทุกใบก่อนน้า 🔒',
    letter: 'เปิดอ่านจดหมายให้จบก่อนน้า 🔒',
    videos: 'ดูวิดีโอสักแป๊บก่อนน้า 🎬 🔒',
  };
  let prog = 0, allDone = false;
  const readyNow = {};
  const isOpen = (id) => allDone || CHAPS.indexOf(id) < prog;
  function ready(id, note) {
    readyNow[id] = !note;
    const w = $('#' + id + ' .next'); if (!w) return;
    const ok = !note || isOpen(id);
    w.querySelector('button').disabled = !ok;
    w.querySelector('.next-note').textContent = ok ? '' : note;
  }
  function updateMenu() {
    $('#menu').querySelectorAll('a').forEach((a) => a.classList.toggle('locked', !allDone && CHAPS.indexOf(a.hash.slice(1)) > prog));
  }
  function reveal(i) {
    const s = $('#' + CHAPS[i]); s.hidden = false;
    if (CHAPS[i] === 'letter') music.prepare();
  }
  function goNext(i) {
    if (i + 1 > prog) { prog = i + 1; store.set('prog', prog); }
    reveal(i + 1); updateMenu();
    requestAnimationFrame(() => $('#' + CHAPS[i + 1]).scrollIntoView({ behavior: 'smooth', block: 'start' }));
    if (i + 1 === 1) petals(12);
  }
  function completeAll() {
    if (allDone) return;
    allDone = true; store.set('done', true);
    CHAPS.forEach((_, i) => reveal(i)); updateMenu();
    CHAPS.forEach((id) => { if (WAIT[id]) ready(id, readyNow[id] ? '' : WAIT[id]); });
  }
  function initChapters() {
    if (/[?&]reset\b/.test(location.search)) { store.set('prog', 0); store.set('done', false); }
    prog = Math.min(store.get('prog', 0), CHAPS.length - 1); allDone = store.get('done', false);
    CHAPS.forEach((id, i) => {
      const s = $('#' + id);
      if (i > prog && !allDone) s.hidden = true; else if (id === 'letter') music.prepare();
      if (id === 'finale') return;
      const w = el('div', 'next');
      w.innerHTML = `<button class="btn btn-big next-btn">${i === 0 ? 'เริ่มบทที่ 1 →' : `ไปบทที่ ${i + 1} →`}</button><p class="next-note" role="status"></p>`;
      w.querySelector('button').onclick = () => goNext(i);
      s.append(w);
      ready(id, readyNow[id] === true ? '' : (WAIT[id] || ''));
    });
    updateMenu();
    if (prog > 0 && !allDone) setTimeout(() => { $('#' + CHAPS[prog]).scrollIntoView({ block: 'start' }); toast('กลับมาต่อที่บทเดิมนะ 💗'); }, 400);
  }

  /* ================= hero ================= */
  function buildHero() {
    const box = $('#heroPhotos');
    C.hero.photos.forEach((n, i) => box.append(polaroid(n, { tape: i % 2 ? 'blue' : 'pink', zoom: C.hero.photos })));
    $('#facts').innerHTML = C.hero.facts.map(([k, v]) => `<span class="fact">${esc(k)}: <b>${esc(v)}</b></span>`).join('');
    const startD = new Date(C.start);
    const counter = $('#counter');
    const tick = () => {
      const now = new Date();
      let y = now.getFullYear() - startD.getFullYear();
      let m = now.getMonth() - startD.getMonth();
      let d = now.getDate() - startD.getDate();
      if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
      if (m < 0) { y--; m += 12; }
      const secs = Math.floor((now - startD) / 1000);
      const parts = [[y, 'ปี'], [m, 'เดือน'], [d, 'วัน'], [now.getHours(), 'ชั่วโมง'], [now.getMinutes(), 'นาที'], [now.getSeconds(), 'วินาที']];
      counter.innerHTML = parts.map(([v, l]) => `<div><b>${v}</b><small>${l}</small></div>`).join('');
      $('#counterTotal').textContent = `รวมทั้งหมด ${Math.floor(secs / 86400).toLocaleString('th-TH')} วัน · ${secs.toLocaleString('th-TH')} วินาที 💗`;
    };
    tick(); setInterval(tick, 1000);
  }

  /* ================= quiz ================= */
  function buildQuiz() {
    const Q = C.quiz.questions, card = $('#quizCard');
    let i = 0, score = 0, firstTry = true;
    const render = () => {
      if (i >= Q.length) {
        card.innerHTML = `<p class="q-score">${score} / ${Q.length}</p><p class="q-done">${esc(C.quiz.done)}</p><button class="btn btn-sky btn-sm q-next" id="qAgain">เล่นอีกรอบ</button>`;
        $('#qAgain').onclick = () => { i = 0; score = 0; render(); };
        petals(24);
        ready('quiz');
        return;
      }
      const q = Q[i]; firstTry = true; let wrongs = 0;
      card.innerHTML = `<div class="q-prog">${Q.map((_, k) => `<i class="${k <= i ? 'on' : ''}"></i>`).join('')}</div>
        <p class="q-text">${esc(q.q)}</p><div class="q-opts">${q.a.map((a, k) => `<button data-k="${k}">${esc(a)}</button>`).join('')}</div>
        <p class="q-msg" role="status"></p>`;
      card.querySelectorAll('.q-opts button').forEach((b) => b.addEventListener('click', () => {
        const k = +b.dataset.k, msg = card.querySelector('.q-msg');
        if (k === q.ok) {
          if (firstTry) score++;
          b.classList.add('right');
          card.querySelectorAll('.q-opts button').forEach((x) => (x.disabled = true));
          msg.textContent = q.yay;
          const nx = el('button', 'btn btn-pink btn-sm q-next', i === Q.length - 1 ? 'ดูผลคะแนน 🎉' : 'ข้อต่อไป →');
          nx.onclick = () => { i++; render(); };
          card.append(nx);
        } else {
          firstTry = false;
          b.classList.add('wrong'); b.disabled = true;
          wrongs++;
          const own = q.no && q.no[k];
          const generic = C.quiz.nope[Math.floor(Math.random() * C.quiz.nope.length)];
          msg.textContent = wrongs >= 2 && C.quiz.hints?.[i] ? `${own || generic} · ${C.quiz.hint}${C.quiz.hints[i]}` : (own || generic);
          card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
        }
      }));
    };
    render();
  }

  /* ================= timeline ================= */
  function buildTimeline() {
    const ol = $('#tl');
    C.timeline.forEach((t, idx) => {
      const li = el('li', t.big ? 'big' : '');
      li.innerHTML = `<span class="dot">${esc(t.sticker || '💗')}</span><span class="when">${esc(t.when)}</span><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>`;
      const ph = el('div', 'tl-photos');
      if (t.photos.length) t.photos.forEach((n, k) => ph.append(polaroid(n, { tape: (idx + k) % 2 ? 'blue' : 'pink', zoom: t.photos })));
      else ph.append(el('div', 'tl-sticker', esc(t.sticker)));
      li.append(ph);
      ol.append(li);
    });
    ol.insertAdjacentHTML('afterend', '<p class="tl-end">...และบทต่อไปของเรา กำลังจะเริ่มเขียน ✍️</p>');
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); ready('timeline'); } }).observe($('.tl-end'));
  }

  /* ================= map ================= */
  function buildMap() {
    const list = $('#placeList');
    if (!window.L) {
      $('#leaflet').innerHTML = '<p style="padding:20px;text-align:center">โหลดแผนที่ไม่ได้ ลองเช็กเน็ตแล้วรีเฟรชนะ</p>';
    }
    let map = null; const markers = [];
    const init = () => {
      if (map || !window.L) return;
      map = L.map('leaflet', { scrollWheelZoom: false, tap: true });
      // CARTO now serves an "API key required" tile, so use OpenStreetMap (no key needed)
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '&copy; OpenStreetMap' }).addTo(map);
      C.places.forEach((p, i) => {
        const icon = L.divIcon({ className: 'pin', html: '📍', iconSize: [30, 30], iconAnchor: [15, 28], popupAnchor: [0, -26] });
        const box = el('div');
        box.innerHTML = `<div class="ph pop-img" data-id="${pid(p.photo)}_t"><img alt=""></div><div class="pop-name">${i + 1}. ${esc(p.name)}</div><div>${esc(p.text)}</div>`;
        const m = L.marker([p.lat, p.lng], { icon }).addTo(map).bindPopup(box, { maxWidth: 230 });
        m.on('popupopen', () => { loadPh(box.querySelector('.ph')); setOn(i); });
        markers.push(m);
      });
      map.fitBounds(L.latLngBounds(C.places.map((p) => [p.lat, p.lng])).pad(0.25));
    };
    const seen = new Set();
    const setOn = (i) => {
      list.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === i));
      seen.add(i); list.children[i].querySelector('button').classList.add('seen');
      ready('map', seen.size >= C.places.length ? '' : `แตะดูให้ครบทุกที่ก่อนน้า (ดูแล้ว ${seen.size}/${C.places.length}) 🔒`);
    };
    C.places.forEach((p, i) => {
      const li = el('li'); const b = el('button');
      b.innerHTML = `<span class="n">${i + 1}</span><span><b>${esc(p.name)}</b><small>${esc(p.text)}</small></span>`;
      b.onclick = () => { setOn(i); init(); if (!map) return; map.flyTo([p.lat, p.lng], p.lat > 15 ? 11 : 13, { duration: 1.2 }); setTimeout(() => markers[i].openPopup(), 1250); };
      li.append(b); list.append(li);
    });
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { init(); o.disconnect(); } }, { rootMargin: '300px' }).observe($('#leaflet'));
  }

  /* ================= gallery + lightbox ================= */
  function buildGallery() {
    const chips = $('#chips'), grid = $('#grid');
    const groups = [{ name: 'ทั้งหมด', ids: C.gallery.flatMap((g) => g.ids) }, ...C.gallery];
    const show = (g) => {
      grid.innerHTML = '';
      g.ids.forEach((n) => grid.append(polaroid(n, { ratio: true, zoom: g.ids })));
    };
    groups.forEach((g, i) => {
      const b = el('button', '', `${esc(g.name)} <small>${g.ids.length}</small>`);
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0);
      b.onclick = () => { chips.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', x === b)); show(g); };
      chips.append(b);
    });
    show(groups[0]);
    new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { o.disconnect(); ready('gallery'); } }).observe($('#gridEnd'));
  }
  let lbList = [], lbI = 0;
  function openLightbox(list, i) { lbList = list; lbI = Math.max(0, i); $('#lb').hidden = false; document.body.style.overflow = 'hidden'; lbShow(); }
  function lbShow() {
    const img = $('#lbImg'), n = lbList[lbI];
    img.style.opacity = .3;
    media(pid(n) + '_t').then((u) => { if (lbList[lbI] === n && !img.dataset.full) img.src = u; });
    img.dataset.full = '';
    media(pid(n)).then((u) => { if (lbList[lbI] === n) { img.src = u; img.dataset.full = '1'; img.style.opacity = 1; } });
    $('#lbCount').textContent = `${lbI + 1} / ${lbList.length}`;
    const multi = lbList.length > 1; $('#lbPrev').hidden = !multi; $('#lbNext').hidden = !multi;
    if (lbList[lbI + 1]) media(pid(lbList[lbI + 1]));
  }
  const lbMove = (d) => { lbI = (lbI + d + lbList.length) % lbList.length; lbShow(); };
  const lbClose = () => { $('#lb').hidden = true; document.body.style.overflow = ''; };
  $('#lbX').onclick = lbClose;
  $('#lbPrev').onclick = (e) => { e.stopPropagation(); lbMove(-1); };
  $('#lbNext').onclick = (e) => { e.stopPropagation(); lbMove(1); };
  $('#lb').addEventListener('click', (e) => { if (e.target.id === 'lb') lbClose(); });
  document.addEventListener('keydown', (e) => {
    if ($('#lb').hidden) return;
    if (e.key === 'Escape') lbClose(); if (e.key === 'ArrowLeft') lbMove(-1); if (e.key === 'ArrowRight') lbMove(1);
  });
  let tx = null;
  $('#lb').addEventListener('touchstart', (e) => { tx = e.touches[0].clientX; }, { passive: true });
  $('#lb').addEventListener('touchend', (e) => {
    if (tx == null) return; const dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) lbMove(dx < 0 ? 1 : -1);
  });

  /* ================= reasons ================= */
  function buildReasons() {
    const wrap = $('#cards');
    const all = [...C.reasons.map((r, i) => ({ n: i + 1, r })), { n: '∞', r: C.reasonsBonus, bonus: true }];
    all.forEach(({ n, r, bonus }) => {
      const b = el('button', 'card' + (bonus ? ' bonus' : ''));
      b.innerHTML = `<div class="card-in"><div class="card-f"><span class="num">#${n}</span><small>${bonus ? 'ข้อสุดท้าย' : 'เหตุผลที่รัก'}</small></div><div class="card-b"><b>${esc(r[0])}</b><span>${esc(r[1])}</span></div></div>`;
      b.setAttribute('aria-label', `เหตุผลข้อ ${n}`);
      b.onclick = () => { b.classList.toggle('flip'); b.classList.add('seen'); count(); };
      wrap.append(b);
    });
    const count = () => {
      const n = wrap.querySelectorAll('.card.seen').length, all = wrap.children.length;
      ready('reasons', n >= all ? '' : `พลิกการ์ดให้ครบทุกใบก่อนน้า (เปิดแล้ว ${n}/${all}) 🔒`);
      if (n >= all && !wrap.dataset.done) { wrap.dataset.done = 1; toast('อ่านครบทุกเหตุผลแล้ว 💗'); }
    };
    $('#randReason').onclick = () => {
      const closed = [...wrap.querySelectorAll('.card:not(.flip)')];
      if (!closed.length) { toast('เปิดครบทุกข้อแล้ว ยังรักเท่าเดิม (เพิ่มขึ้นด้วย) 💗'); return; }
      const c = closed[Math.floor(Math.random() * closed.length)];
      c.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => { c.classList.add('flip', 'seen'); count(); }, 450);
    };
  }

  /* ================= coupons ================= */
  function buildCoupons() {
    const used = store.get('coupons', {});
    const wrap = $('#couponList');
    C.coupons.forEach(([icon, title, sub], i) => {
      const b = el('button', 'coupon' + (used[i] ? ' used' : ''));
      b.innerHTML = `<span class="stub">${icon}</span><span class="body"><b>${esc(title)}</b><small>${esc(sub)}</small><span class="exp">หมดอายุ: ไม่มีวันหมด · No.${String(i + 1).padStart(3, '0')}</span></span><span class="stamp">ใช้แล้ว ✓<br><small>${used[i] || ''}</small></span>`;
      b.onclick = () => {
        if (used[i]) {
          if (!confirm('ยกเลิกการใช้คูปองนี้ไหม?')) return;
          delete used[i]; b.classList.remove('used');
        } else {
          if (!confirm(`ใช้ "${title}" เลยไหม? 🎟️`)) return;
          used[i] = new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
          b.querySelector('.stamp small').textContent = used[i];
          b.classList.add('used');
          toast('ใช้คูปองแล้ว! แคปหน้าจอส่งให้เค้าเลย 📸');
        }
        store.set('coupons', used);
      };
      wrap.append(b);
    });
  }

  /* ================= bucket ================= */
  function buildBucket() {
    const done = store.get('bucket', {});
    const ul = $('#bucketList');
    C.bucket.forEach((t, i) => {
      const li = el('li');
      li.innerHTML = `<label><input type="checkbox" ${done[i] ? 'checked' : ''}><span>${esc(t)}</span></label>`;
      li.querySelector('input').onchange = (e) => {
        done[i] = e.target.checked; store.set('bucket', done);
        if (e.target.checked) { toast('เย้! ทำสำเร็จไปอีกหนึ่งอย่าง 🎉'); petals(14); }
      };
      ul.append(li);
    });
  }

  /* ================= letter ================= */
  function heartBurst(fromEl, n = 26) {
    const b = fromEl.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    const set = ['💗', '💕', '💖', '🌸', '✨', '💙'];
    for (let i = 0; i < n; i++) {
      const h = el('span', 'burst', set[i % set.length]);
      const a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 180;
      h.style.setProperty('--x0', cx - 12 + 'px'); h.style.setProperty('--y0', cy - 12 + 'px');
      h.style.setProperty('--x1', cx - 12 + Math.cos(a) * d + 'px'); h.style.setProperty('--y1', cy - 12 + Math.sin(a) * d - 60 + 'px');
      h.style.setProperty('--r', (Math.random() * 120 - 60) + 'deg');
      h.style.fontSize = 16 + Math.random() * 18 + 'px';
      document.body.append(h); setTimeout(() => h.remove(), 1500);
    }
  }
  function buildLetter() {
    const env = $('#envelope'), body = $('#letterBody'), L = C.letter;
    const texts = [`${L.to},`, ...L.paras, L.sign];
    body.innerHTML = texts.map((_, i) => `<p class="${i === 0 ? 'to' : i === texts.length - 2 ? 'last' : i === texts.length - 1 ? 'sign' : ''}"></p>`).join('')
      + (L.ps ? `<button class="ps" type="button"><span class="ps-out">📝 มีโน้ตแปะไว้ แตะเพื่อเปิด</span><span class="ps-in">${esc(L.ps)}</span></button>` : '')
      + '<p class="letter-skip">แตะที่จดหมายเพื่ออ่านเร็วขึ้น</p>';
    const ps = body.querySelector('.ps'); if (ps) { ps.hidden = true; ps.onclick = (e) => { e.stopPropagation(); ps.classList.add('open'); heartBurst(ps, 18); }; }
    if (L.photo) {
      const lp = $('#letterPhoto'), fig = el('figure'); fig.style.margin = 0;
      fig.append(photo(L.photo, { thumb: false }), el('figcaption', '', esc(L.photoCaption || '')));
      lp.append(fig); lp.onclick = () => openLightbox([L.photo], 0);
    }
    const seg = window.Intl?.Segmenter ? new Intl.Segmenter('th', { granularity: 'grapheme' }) : null;
    const split = (t) => (seg ? [...seg.segment(t)].map((x) => x.segment) : [...t]);
    let fast = false, typing = false;
    body.addEventListener('click', () => { if (typing) fast = true; });
    const typeAll = async () => {
      typing = true;
      const ps_ = body.querySelectorAll('p:not(.letter-skip)');
      for (let i = 0; i < texts.length; i++) {
        const p = ps_[i], chars = split(texts[i]);
        p.classList.add('in', 'typing');
        if (fast) { p.textContent = texts[i]; } else {
          for (let k = 0; k < chars.length; k++) {
            if (fast) { p.textContent = texts[i]; break; }
            p.textContent += chars[k];
            await new Promise((r) => setTimeout(r, /[ ,.!?]/.test(chars[k]) ? 70 : 28));
          }
        }
        p.classList.remove('typing');
        if (i === texts.length - 2) heartBurst(p, 20);
        if (!fast) await new Promise((r) => setTimeout(r, 350));
      }
      typing = false;
      body.querySelector('.letter-skip').remove();
      if (ps) ps.hidden = false;
      ready('letter');
    };
    const open = () => {
      if (env.classList.contains('open')) return;
      env.classList.add('open');
      heartBurst(env);
      music.play();
      setTimeout(() => {
        if (L.photo) $('#letterPhoto').hidden = false;
        body.hidden = false;
        ($('#letterPhoto').hidden ? body : $('#letterPhoto')).scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(typeAll, 900);
      }, 1300);
    };
    env.addEventListener('click', open);
    env.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  }

  /* ================= videos: two film strips, every clip looping at once ================= */
  const film = { pauseAll() {} };
  function buildVideos() {
    const wrap = $('#film'), rows = [$('#filmTop'), $('#filmBottom')];
    const half = Math.ceil(C.videos.length / 2);
    const groups = [C.videos.slice(0, half), C.videos.slice(half)];
    const pairs = []; // [video, canvas clone]
    let inView = false, raf = 0, seenMs = 0, lastT = 0, loaded = false;

    const openFull = (n) => {
      film.pauseAll(); music.pause();
      const mv = $('#vmVid');
      $('#vm').hidden = false; document.body.style.overflow = 'hidden';
      mv.removeAttribute('src'); mv.load();
      media(vid(n), 'video/mp4').then((u) => { mv.src = u; mv.play().catch(() => {}); });
    };
    $('#vmX').onclick = () => {
      const mv = $('#vmVid'); mv.pause();
      $('#vm').hidden = true; document.body.style.overflow = '';
      music.resume(); if (inView) playAll();
    };

    groups.forEach((g, r) => {
      const originals = [], clones = [];
      g.forEach((n) => {
        const f = el('button', 'frame'); f.setAttribute('aria-label', 'ดูคลิปเต็มจอ');
        const v = el('video');
        v.muted = true; v.defaultMuted = true; v.loop = true; v.playsInline = true;
        v.setAttribute('muted', ''); v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
        f.append(v); f.onclick = () => openFull(n);
        const c = el('button', 'frame'); c.setAttribute('aria-label', 'ดูคลิปเต็มจอ');
        const cv = el('canvas'); cv.width = 320; cv.height = 180;
        c.append(cv); c.onclick = () => openFull(n);
        media(vid(n) + '_p').then((u) => { f.style.backgroundImage = c.style.backgroundImage = `url(${u})`; });
        originals.push(f); clones.push(c);
        pairs.push([v, cv.getContext('2d'), n]);
      });
      // second copy makes the loop seamless: the track slides exactly half its width
      rows[r].append(...originals, ...clones);
    });

    const load = () => {
      if (loaded) return; loaded = true;
      pairs.forEach(([v, , n]) => media(vid(n) + '_s', 'video/mp4').then((u) => { v.src = u; if (inView) v.play().catch(() => {}); }));
    };
    const playAll = () => pairs.forEach(([v]) => { if (v.src) v.play().catch(() => {}); });
    film.pauseAll = () => pairs.forEach(([v]) => v.pause());
    const draw = (t) => {
      raf = requestAnimationFrame(draw);
      if (t - lastT < 40) return; // ~25fps is plenty for small clones
      if (lastT && $('#vm').hidden) {
        seenMs += t - lastT;
        if (seenMs > 12000) ready('videos');
      }
      lastT = t;
      pairs.forEach(([v, ctx]) => { if (v.readyState >= 2) ctx.drawImage(v, 0, 0, 320, 180); });
    };
    new IntersectionObserver((es) => {
      inView = es[0].isIntersecting;
      wrap.classList.toggle('paused', !inView);
      if (inView) { load(); playAll(); lastT = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
      else { film.pauseAll(); cancelAnimationFrame(raf); }
    }, { threshold: 0.2 }).observe(wrap);
  }

  /* ================= finale + fireworks ================= */
  function buildFinale() {
    $('#fireBtn').textContent = C.finale.button;
    $('#storyPhoto').append(photo(C.finale.storyPhoto, { thumb: false }));
    const ft = $('#fireText');
    ft.querySelector('.big').textContent = C.finale.big;
    ft.querySelector('.small').textContent = C.finale.small;
    $('#fireBtn').onclick = () => {
      film.pauseAll();
      document.body.classList.add('night'); ft.hidden = false;
      fireworks.start();
      const first = !allDone;
      completeAll();
      if (first) setTimeout(() => toast('ปลดล็อกครบทุกบทแล้ว! กด ☰ ข้ามไปบทไหนก็ได้ 💗'), 6000);
    };
    $('#fireClose').onclick = () => { fireworks.stop(); document.body.classList.remove('night'); ft.hidden = true; };
  }
  const fireworks = (() => {
    const cv = $('#fx'), ctx = cv.getContext('2d');
    let parts = [], rockets = [], raf = 0, last = 0, W = 0, H = 0, dpr = 1;
    const colors = ['#ff8fb8', '#ffd1e3', '#7cc6f5', '#c9ecff', '#ffe08a', '#ffffff', '#ffb3c7'];
    const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const launch = () => rockets.push({ x: W * (.15 + Math.random() * .7), y: H, vx: (Math.random() - .5) * 1.5, vy: -(H * .011 + Math.random() * 4), c: colors[Math.floor(Math.random() * colors.length)] });
    const burst = (r) => {
      const n = 70 + Math.random() * 50, heart = Math.random() < .35;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        let vx, vy;
        if (heart) { vx = 16 * Math.sin(a) ** 3 * .32; vy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * .32; }
        else { const s = 2 + Math.random() * 4.5; vx = Math.cos(a) * s; vy = Math.sin(a) * s; }
        parts.push({ x: r.x, y: r.y, vx, vy, life: 1, c: Math.random() < .2 ? '#fff' : r.c });
      }
    };
    const loop = (t) => {
      raf = requestAnimationFrame(loop);
      if (t - last > 520) { last = t; launch(); if (Math.random() < .4) launch(); }
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      rockets = rockets.filter((r) => {
        r.x += r.vx; r.y += r.vy; r.vy += .12;
        ctx.fillStyle = r.c; ctx.beginPath(); ctx.arc(r.x, r.y, 2.2, 0, 7); ctx.fill();
        if (r.vy >= -1) { burst(r); return false; } return true;
      });
      parts = parts.filter((p) => {
        p.x += p.vx; p.y += p.vy; p.vx *= .975; p.vy = p.vy * .975 + .05; p.life -= .011;
        ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, 7); ctx.fill();
        return p.life > 0;
      });
      ctx.globalAlpha = 1;
    };
    return {
      start() { resize(); parts = []; rockets = []; cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); addEventListener('resize', resize); },
      stop() { cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); removeEventListener('resize', resize); },
    };
  })();

  /* ================= music (Spotify embed) ================= */
  const music = (() => {
    let ctrl = null, loading = false, playing = false, wantPlay = false, fallback = false;
    const panel = () => $('#music');
    const trackUri = () => { const m = /track\/([A-Za-z0-9]+)/.exec(C.spotify); return m ? 'spotify:track:' + m[1] : null; };
    const open = (on) => { panel().classList.toggle('open', on); panel().setAttribute('aria-hidden', !on); };
    const plainIframe = () => {
      if ($('#musicFrame iframe')) return;
      fallback = true;
      const f = el('iframe');
      f.src = C.spotify; f.width = '100%'; f.height = '152'; f.style.border = '0'; f.style.borderRadius = '12px';
      f.allow = 'autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture';
      $('#musicFrame').append(f);
    };
    function prepare() {
      if (ctrl || loading || fallback) return;
      const uri = trackUri(); if (!uri) return;
      loading = true;
      window.onSpotifyIframeApiReady = (API) => {
        const host = el('div'); $('#musicFrame').append(host);
        API.createController(host, { uri, width: '100%', height: 152 }, (c) => {
          ctrl = c; loading = false;
          c.addListener('playback_update', (e) => {
            playing = !e.data.isPaused;
            $('#musicBtn').classList.toggle('playing', playing);
          });
          if (wantPlay) play();
        });
      };
      const sc = document.createElement('script');
      sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true;
      sc.onerror = () => { loading = false; plainIframe(); };
      document.head.append(sc);
      setTimeout(() => { if (!ctrl) { loading = false; plainIframe(); } }, 8000);
    }
    function play() {
      wantPlay = true;
      prepare();
      if (!ctrl) { if (fallback) { open(true); toast('แตะ ▶ ในกล่องเพลงเพื่อเปิดเพลงของเรานะ 🎶'); } return; }
      try { ctrl.play(); } catch { /* ignore */ }
      // browsers can block autoplay; if it didn't start, show the player so one tap starts it
      setTimeout(() => { if (!playing) { open(true); toast('แตะ ▶ ในกล่องเพลงเพื่อเปิดเพลงของเรานะ 🎶'); } }, 2500);
    }
    let resumeLater = false;
    const pause = () => { resumeLater = playing; if (ctrl && playing) try { ctrl.pause(); } catch { /* ignore */ } };
    const resume = () => { if (ctrl && resumeLater) try { ctrl.resume(); } catch { /* ignore */ } resumeLater = false; };
    return { prepare, play, pause, resume, toggle: () => open(!panel().classList.contains('open')) };
  })();

  /* ================= floating controls ================= */
  function buildControls() {
    const menu = $('#menu'), musicBox = $('#music');
    $('#menuBtn').onclick = (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; };
    menu.addEventListener('click', (e) => {
      const a = e.target.closest('a');
      if (a && a.classList.contains('locked')) { e.preventDefault(); toast('ต้องทำบทก่อนหน้าให้ครบก่อนน้า 🔒'); return; }
      menu.hidden = true;
    });
    document.addEventListener('click', (e) => { if (!menu.hidden && !menu.contains(e.target) && e.target.id !== 'menuBtn') menu.hidden = true; });
    $('#musicBtn').onclick = () => { music.prepare(); music.toggle(); };
    $('#musicClose').onclick = () => { musicBox.classList.remove('open'); musicBox.setAttribute('aria-hidden', 'true'); };
  }
})();
