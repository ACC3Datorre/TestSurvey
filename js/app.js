/* ============================================================
   APP — Recognition Points (v7 — un solo mail con todas las nominaciones)
   Flujo: welcome → voter → hub → nominees (por categoría) → review → sent
   ============================================================ */

const App = (() => {

  let team = [];
  let currentVoter = null;
  let nominations = {};      // { catId: { nomineeIds: [], justification: '' } }
  let activeCategory = null; // objeto de CATEGORIES que está editando ahora
  let selectedNomineeIds = [];

  let filters = {
    level: 'all',
    search: ''
  };

  /* ---------- helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const cfg = () => window.APP_CONFIG;

  function initials(name) {
    return name.trim().split(/\s+/)
      .map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  function toast(msg) {
    $('toastMsg').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $('toast').classList.remove('show'), 3500);
  }
  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function normalize(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function initNominations() {
    nominations = {};
    cfg().CATEGORIES.forEach(cat => {
      nominations[cat.id] = { nomineeIds: [], justification: '' };
    });
  }

  function filledNominations() {
    return cfg().CATEGORIES.filter(cat => {
      const n = nominations[cat.id];
      return n.nomineeIds.length > 0 && n.justification.trim().length > 0;
    });
  }

  /* ---------- screens ---------- */
  function go(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = $('screen-' + name);
    if (target) target.classList.add('active');
    const tagMap = {
      welcome:  'Inicio',
      voter:    'Identificación',
      hub:      'Mis nominaciones',
      nominees: 'Elegir nominados',
      review:   'Revisar y enviar',
      sent:     'Enviado'
    };
    const tag = $('navTag');
    if (tag) tag.textContent = tagMap[name] || name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- voter ---------- */
  function startSurvey() {
    go('voter');
    setTimeout(() => $('voterNameInput').focus(), 80);
  }
  function confirmVoter() {
    const name = $('voterNameInput').value.trim();
    if (!name) { $('voterAlert').style.display = 'block'; return; }
    currentVoter = name;
    initNominations();
    renderHub();
    go('hub');
  }

  /* ---------- HUB ---------- */
  function renderHub() {
    const container = $('hubNominations');
    if (!container) return;

    const cats = cfg().CATEGORIES;
    const individualCats = cats.filter(c => c.type === 'individual');
    const teamCats       = cats.filter(c => c.type === 'team');

    function catRow(cat) {
      const nom    = nominations[cat.id] || { nomineeIds: [], justification: '' };
      const filled = nom.nomineeIds.length > 0 && nom.justification.trim().length > 0;
      const names  = nom.nomineeIds.map(id => {
        const p = team.find(x => x.id === id);
        return p ? p.name.split(' ')[0] : id;
      }).join(', ');

      return `
        <div class="hub-row ${filled ? 'hub-row--filled' : ''}">
          <div class="hub-row-info">
            <span class="hub-row-badge">${cat.badge}</span>
            <span class="hub-row-name">${cat.name}</span>
            ${filled
              ? `<span class="hub-row-nominees">✓ ${names}</span>`
              : `<span class="hub-row-empty">Sin nominar</span>`}
          </div>
          <button class="btn btn-sm ${filled ? 'btn-ghost' : 'btn-primary'}"
                  onclick="App.openCategoryEditor('${cat.id}')">
            ${filled ? 'Editar' : 'Nominar →'}
          </button>
        </div>`;
    }

    container.innerHTML = `
      <div class="section-rule" style="margin-bottom:12px">
        <span class="label">— Premios Individuales</span>
        <span class="line"></span>
      </div>
      <div class="hub-list">${individualCats.map(catRow).join('')}</div>
      <div class="section-rule" style="margin-top:32px; margin-bottom:12px">
        <span class="label">— Premios de Equipo</span>
        <span class="line"></span>
      </div>
      <div class="hub-list">${teamCats.map(catRow).join('')}</div>`;

    const filled = filledNominations().length;
    const btn = $('hubSendBtn');
    if (btn) {
      btn.disabled = filled === 0;
      btn.textContent = filled === 0
        ? 'Completá al menos una categoría para continuar'
        : `Revisar ${filled} nominación${filled !== 1 ? 'es' : ''} →`;
    }
    const voterEl = $('hubVoterName');
    if (voterEl) voterEl.textContent = currentVoter;
  }

  /* ---------- NOMINEES (editor por categoría) ---------- */
  function openCategoryEditor(categoryId) {
    const cat = cfg().CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return;
    activeCategory = cat;

    // Cargar selecciones guardadas previamente
    selectedNomineeIds = [...(nominations[cat.id].nomineeIds)];

    // Actualizar cabecera
    const el = (id, txt) => { const e = $(id); if (e) e.textContent = txt; };
    el('nomScreenCatName',  cat.name);
    el('nomScreenCatBadge', cat.badge);
    el('nomScreenHint', cat.type === 'team'
      ? `Seleccioná hasta ${cat.maxNominees} personas del equipo.`
      : 'Seleccioná a la persona que querés nominar.');

    // Pre-llenar justificación guardada
    const justEl = $('justification');
    if (justEl) justEl.value = nominations[cat.id].justification || '';

    resetFilters();
    renderNomineeGrid();
    updateSelectionBadge();
    updateCharCount();
    $('voteAlert').style.display = 'none';
    go('nominees');
  }

  function saveCategory() {
    const just = $('justification').value.trim();
    if (selectedNomineeIds.length === 0 || !just) {
      $('voteAlert').style.display = 'block';
      return;
    }
    nominations[activeCategory.id] = {
      nomineeIds: [...selectedNomineeIds],
      justification: just
    };
    activeCategory = null;
    selectedNomineeIds = [];
    renderHub();
    go('hub');
  }

  /* ---------- filtros ---------- */
  function setFilter(btn) {
    const filter = btn.dataset.filter;
    const value  = btn.dataset.value;
    filters[filter] = value;
    document.querySelectorAll(`.filter-chip[data-filter="${filter}"]`)
      .forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  }
  function clearSearch() {
    $('searchInput').value = '';
    filters.search = '';
    $('searchClear').style.display = 'none';
    applyFilters();
  }
  function resetFilters() {
    filters = { level: 'all', search: '' };
    const si = $('searchInput'); if (si) si.value = '';
    const sc = $('searchClear'); if (sc) sc.style.display = 'none';
    document.querySelectorAll('.filter-chip')
      .forEach(c => c.classList.toggle('active', c.dataset.value === 'all'));
  }
  function applyFilters() {
    filters.search = $('searchInput').value.trim();
    $('searchClear').style.display = filters.search ? 'flex' : 'none';
    renderNomineeGrid();
  }

  /* ---------- nominees grid ---------- */
  function getEligibleTeam() {
    let base = team;
    if (activeCategory && activeCategory.eligibleLevels.length > 0) {
      base = team.filter(p => activeCategory.eligibleLevels.includes(p.level));
    }
    const voterSlug = currentVoter
      ? normalize(currentVoter).replace(/\s+/g, '.') : '';
    const search = normalize(filters.search);

    return base.filter(p => {
      if (p.id === voterSlug) return false;
      if (filters.level !== 'all' && p.level !== filters.level) return false;
      if (search) {
        if (!normalize(p.name + ' ' + p.id).includes(search)) return false;
      }
      return true;
    });
  }

  function renderNomineeGrid() {
    const filtered = getEligibleTeam();
    const grid    = $('nomineeGrid');
    const empty   = $('emptyResults');
    const counter = $('resultCount');
    if (!grid) return;

    if (!filtered.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      counter.textContent = '';
    } else {
      empty.style.display = 'none';
      const isTeam = activeCategory && activeCategory.type === 'team';
      counter.textContent = `${filtered.length} persona${filtered.length !== 1 ? 's' : ''}`;

      grid.innerHTML = filtered.map(p => {
        const selected = selectedNomineeIds.includes(p.id);
        const safeId   = p.id.replace(/'/g, "\\'");
        const classes  = ['nominee-card', selected ? 'selected' : '', isTeam ? 'multi' : '']
          .filter(Boolean).join(' ');
        return `
          <div class="${classes}" onclick="App.selectNominee('${safeId}', this)">
            <span class="initials">${initials(p.name)}</span>
            <div class="name">${p.name}</div>
            <div class="role">${p.level}</div>
            <div class="nominee-id">${p.id}</div>
            <div class="check">${selected ? '✓' : (isTeam ? '☐' : '✓')}</div>
          </div>`;
      }).join('');
    }
    $('voteAlert').style.display = 'none';
  }

  function selectNominee(id, el) {
    if (!activeCategory) return;

    if (activeCategory.type === 'individual') {
      document.querySelectorAll('#nomineeGrid .nominee-card.selected')
        .forEach(c => { c.classList.remove('selected'); c.querySelector('.check').textContent = '✓'; });
      el.classList.add('selected');
      selectedNomineeIds = [id];
    } else {
      const idx = selectedNomineeIds.indexOf(id);
      if (idx === -1) {
        if (selectedNomineeIds.length >= activeCategory.maxNominees) {
          toast(`Máximo ${activeCategory.maxNominees} personas para ${activeCategory.name}.`);
          return;
        }
        selectedNomineeIds.push(id);
        el.classList.add('selected');
        el.querySelector('.check').textContent = '✓';
      } else {
        selectedNomineeIds.splice(idx, 1);
        el.classList.remove('selected');
        el.querySelector('.check').textContent = '☐';
      }
    }
    updateSelectionBadge();
    $('voteAlert').style.display = 'none';
    if (activeCategory.type === 'individual') {
      $('justification').focus({ preventScroll: true });
    }
  }

  function updateSelectionBadge() {
    const badge = $('selectionBadge');
    if (!badge || !activeCategory) return;
    const count = selectedNomineeIds.length;
    badge.textContent = activeCategory.type === 'individual'
      ? (count ? '1 seleccionada' : 'Ninguna seleccionada')
      : `${count} de ${activeCategory.maxNominees} seleccionada${count !== 1 ? 's' : ''}`;
  }

  function updateCharCount() {
    const v   = ($('justification') || {}).value || '';
    const max = cfg().MAIL.MAX_JUSTIFICATION_CHARS;
    const cc  = $('charCount'); if (cc) cc.textContent = v.length;
    const cm  = $('charMax');   if (cm) cm.textContent = max;
    if (v.length > max && $('justification')) {
      $('justification').value = v.slice(0, max);
      if (cc) cc.textContent = max;
    }
    const pct     = v.length / max;
    const counter = cc ? cc.parentElement : null;
    if (counter) {
      counter.classList.toggle('warn',   pct > 0.85 && pct < 1);
      counter.classList.toggle('danger', pct >= 1);
    }
  }

  /* ---------- REVIEW ---------- */
  function goToReview() {
    const filled = filledNominations();
    if (filled.length === 0) {
      toast('Completá al menos una categoría antes de continuar.');
      return;
    }
    renderReviewScreen(filled);
    go('review');
  }

  function renderReviewScreen(filled) {
    const container = $('reviewContent');
    if (!container) return;

    container.innerHTML = filled.map(cat => {
      const nom   = nominations[cat.id];
      const names = nom.nomineeIds.map(id => {
        const p = team.find(x => x.id === id);
        return p ? p.name : id;
      }).join(', ');
      return `
        <div class="review-card">
          <span class="review-cat-badge">${cat.badge}</span>
          <div class="review-cat-name">${cat.name}</div>
          <div class="review-nominees"><strong>Nominado/s:</strong> ${names}</div>
          <div class="review-justification">"${nom.justification}"</div>
        </div>`;
    }).join('');

    const el = (id, txt) => { const e = $(id); if (e) e.textContent = txt; };
    el('reviewVoterName', currentVoter);
    el('reviewCount', `${filled.length} nominación${filled.length !== 1 ? 'es' : ''}`);
  }

  /* ---------- SANITIZE ---------- */
  function sanitizeForSubject(text) {
    const sep = cfg().MAIL.FIELD_SEP;
    return String(text)
      .replace(new RegExp('\\' + sep, 'g'), '/')
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function sanitizeForBody(text) {
    // Eliminar separadores ~ y | para que el parseo en Power Automate sea limpio
    return String(text)
      .replace(/~/g, '-')
      .replace(/\|/g, '/')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  /* ---------- BUILD MAILTO ----------
     Subject: RP-FY26-VOTE|uid|voterName|timestamp
     Body: 5 segmentos fijos separados por |, uno por categoría (siempre las 5, vacías si no nominó):
       inspiring-leader~nom1;nom2~justificacion|breaking-new~nom~just|...
     Power Automate: split(body, '|')[0..4] → split(seg, '~')[1]=nominees, [2]=just
  ------------------------------------------------------------ */
  function buildMailtoUrl() {
    const c    = cfg();
    const id   = uid();
    const ts   = new Date().toISOString();
    const subject = [
      c.MAIL.SUBJECT_PREFIX,
      id,
      sanitizeForSubject(currentVoter),
      ts
    ].join(c.MAIL.FIELD_SEP);

    // Siempre las 5 categorías en orden fijo; vacías si no fueron nominadas
    const body = c.CATEGORIES.map(cat => {
      const nom    = nominations[cat.id];
      const nomStr = (nom && nom.nomineeIds.length > 0)
        ? nom.nomineeIds.join(c.MAIL.NOMINEE_SEP)
        : '';
      const just   = (nom && nom.justification.trim())
        ? sanitizeForBody(nom.justification)
        : '';
      return `${cat.id}~${nomStr}~${just}`;
    }).join('|');

    return 'mailto:' + encodeURIComponent(c.MAIL.ADMIN_EMAIL) +
      '?subject=' + encodeURIComponent(subject) +
      '&body='    + encodeURIComponent(body);
  }

  /* ---------- SEND ---------- */
  function sendAll() {
    const filled = filledNominations();
    if (filled.length === 0) { toast('Completá al menos una nominación.'); return; }

    window.location.href = buildMailtoUrl();
    setTimeout(() => showSentScreen(filled), 400);
  }

  function showSentScreen(filled) {
    go('sent');
    const el = (id, txt) => { const e = $(id); if (e) e.textContent = txt; };
    el('sentVoterName', currentVoter);
    el('sentCount', `${filled.length} nominación${filled.length !== 1 ? 'es' : ''} enviadas`);

    const detail = $('sentDetail');
    if (detail) {
      detail.innerHTML = filled.map(cat => {
        const nom   = nominations[cat.id];
        const names = nom.nomineeIds.map(id => {
          const p = team.find(x => x.id === id);
          return p ? p.name : id;
        }).join(', ');
        return `<div class="sent-row"><strong>${cat.name}:</strong> ${names}</div>`;
      }).join('');
    }
  }

  function resendLast() {
    window.location.href = buildMailtoUrl();
  }

  function finishVoting() {
    initNominations();
    go('welcome');
  }

  /* ---------- init ---------- */
  function init() {
    team = [...cfg().TEAM];
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && $('screen-voter').classList.contains('active')) {
        confirmVoter();
      }
    });
    updateCharCount();
  }

  return {
    init, go, startSurvey, confirmVoter,
    openCategoryEditor, saveCategory,
    selectNominee, updateCharCount, updateSelectionBadge,
    goToReview, sendAll, resendLast, finishVoting,
    setFilter, applyFilters, clearSearch
  };
})();

window.addEventListener('load', App.init);
window.App = App;
