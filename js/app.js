/* ============================================================
   APP — Recognition Points (v6 — categorías de premios)
   Flujo: welcome → voter → category → vote → sent
   ============================================================ */

const App = (() => {

  let team = [];
  let currentVoter = null;
  let selectedCategory = null;    // objeto de APP_CONFIG.CATEGORIES
  let selectedNomineeIds = [];    // array de ids (multi-select para equipo)
  let sessionVotes = [];

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

  /* ---------- screens ---------- */
  function go(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = $('screen-' + name);
    if (target) target.classList.add('active');
    const tagMap = {
      welcome: 'Inicio',
      voter: 'Identificación',
      category: 'Categoría',
      vote: 'Nominación',
      sent: 'Enviado'
    };
    const tag = $('navTag');
    if (tag) tag.textContent = tagMap[name] || name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- voter ---------- */
  function startSurvey() {
    sessionVotes = [];
    go('voter');
    setTimeout(() => $('voterNameInput').focus(), 80);
  }
  function confirmVoter() {
    const name = $('voterNameInput').value.trim();
    if (!name) { $('voterAlert').style.display = 'block'; return; }
    currentVoter = name;
    sessionVotes = [];
    selectedCategory = null;
    selectedNomineeIds = [];
    renderCategoryGrid();
    go('category');
  }

  /* ---------- category ---------- */
  function renderCategoryGrid() {
    const grid = $('categoryGrid');
    if (!grid) return;
    const cats = cfg().CATEGORIES;

    const individualCats = cats.filter(c => c.type === 'individual');
    const teamCats = cats.filter(c => c.type === 'team');

    function catCard(cat) {
      const eligLabel = cat.eligibleLevels.length
        ? cat.eligibleLevels.join(' · ')
        : 'Todos los niveles';
      const teamNote = cat.type === 'team'
        ? `<span class="cat-team-note">Seleccioná hasta ${cat.maxNominees} personas</span>`
        : '';
      return `
        <button class="action-card cat-card" onclick="App.selectCategory('${cat.id}')">
          <span class="cat-badge">${cat.badge}</span>
          <h3 class="cat-name">${cat.name}</h3>
          <p class="cat-desc">${cat.description}</p>
          <span class="cat-eligibility">Elegibles: ${eligLabel}</span>
          ${teamNote}
          <span class="arrow">Nominar →</span>
        </button>`;
    }

    grid.innerHTML = `
      <div class="section-rule" style="margin-bottom:16px">
        <span class="label">— Premios Individuales</span>
        <span class="line"></span>
      </div>
      <div class="cat-grid cat-grid-3">
        ${individualCats.map(catCard).join('')}
      </div>
      <div class="section-rule" style="margin-top:40px; margin-bottom:16px">
        <span class="label">— Premios de Equipo</span>
        <span class="line"></span>
      </div>
      <div class="cat-grid cat-grid-2">
        ${teamCats.map(catCard).join('')}
      </div>`;
  }

  function selectCategory(categoryId) {
    const cats = cfg().CATEGORIES;
    selectedCategory = cats.find(c => c.id === categoryId) || null;
    if (!selectedCategory) return;
    selectedNomineeIds = [];
    resetFilters();

    // Actualizar contexto en la pantalla de votación
    const catCtx = $('categoryContext');
    if (catCtx) catCtx.textContent = selectedCategory.name;
    const catBadgeCtx = $('categoryBadgeCtx');
    if (catBadgeCtx) catBadgeCtx.textContent = selectedCategory.badge;
    const voteHint = $('voteHint');
    if (voteHint) {
      voteHint.textContent = selectedCategory.type === 'team'
        ? `Seleccioná hasta ${selectedCategory.maxNominees} personas del equipo.`
        : 'Elegí a la persona que querés nominar.';
    }

    renderNomineeGrid();
    go('vote');
    updateSelectionBadge();
  }

  /* ---------- filtros ---------- */
  function setFilter(btn) {
    const filter = btn.dataset.filter;
    const value = btn.dataset.value;
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
    const si = $('searchInput');
    if (si) si.value = '';
    const sc = $('searchClear');
    if (sc) sc.style.display = 'none';
    document.querySelectorAll('.filter-chip').forEach(c => {
      c.classList.toggle('active', c.dataset.value === 'all');
    });
  }

  function applyFilters() {
    filters.search = $('searchInput').value.trim();
    $('searchClear').style.display = filters.search ? 'flex' : 'none';
    renderNomineeGrid();
  }

  /* ---------- vote / nominees ---------- */
  function getEligibleTeam() {
    // Primero filtrar por elegibilidad de la categoría
    let base = team;
    if (selectedCategory && selectedCategory.eligibleLevels.length > 0) {
      base = team.filter(p => selectedCategory.eligibleLevels.includes(p.level));
    }

    const voterSlug = currentVoter
      ? normalize(currentVoter).replace(/\s+/g, '.')
      : '';
    const search = normalize(filters.search);

    return base.filter(p => {
      if (p.id === voterSlug) return false;
      if (filters.level !== 'all' && p.level !== filters.level) return false;
      if (search) {
        const haystack = normalize(p.name + ' ' + p.id);
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  function renderNomineeGrid() {
    const filtered = getEligibleTeam();

    // Solo deshabilitar los que ya fueron nominados en esta sesión y esta categoría
    const alreadyNomIds = new Set(
      sessionVotes
        .filter(v => v.categoryId === (selectedCategory ? selectedCategory.id : null))
        .map(v => v.nomineeIds)
        .flat()
    );

    const grid = $('nomineeGrid');
    const empty = $('emptyResults');
    const counter = $('resultCount');
    if (!grid) return;

    if (!filtered.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      counter.textContent = '';
    } else {
      empty.style.display = 'none';
      const isTeam = selectedCategory && selectedCategory.type === 'team';
      counter.textContent = `${filtered.length} persona${filtered.length === 1 ? '' : 's'}`;

      grid.innerHTML = filtered.map(p => {
        const alreadyVoted = alreadyNomIds.has(p.id);
        const selected = selectedNomineeIds.includes(p.id);
        const safeId = p.id.replace(/'/g, "\\'");
        const classes = [
          'nominee-card',
          alreadyVoted ? 'disabled' : '',
          selected ? 'selected' : '',
          isTeam ? 'multi' : ''
        ].filter(Boolean).join(' ');

        return `
          <div class="${classes}"
               ${alreadyVoted ? '' : `onclick="App.selectNominee('${safeId}', this)"`}>
            <span class="initials">${initials(p.name)}</span>
            <div class="name">${p.name}</div>
            <div class="role">${p.level} · ${p.track}</div>
            <div class="nominee-id">${p.id}</div>
            ${alreadyVoted
              ? '<div class="check">✓ Ya nominado</div>'
              : `<div class="check">${selected ? '✓' : (isTeam ? '☐' : '✓')}</div>`}
          </div>`;
      }).join('');
    }

    $('justification').value = '';
    updateCharCount();
    $('sessionVoteCount').textContent = sessionVotes.length;
    $('voteAlert').style.display = 'none';
  }

  function selectNominee(id, el) {
    if (!selectedCategory) return;

    if (selectedCategory.type === 'individual') {
      document.querySelectorAll('#nomineeGrid .nominee-card.selected')
        .forEach(c => c.classList.remove('selected'));
      el.classList.add('selected');
      selectedNomineeIds = [id];
    } else {
      // Multi-select para equipos
      const idx = selectedNomineeIds.indexOf(id);
      if (idx === -1) {
        if (selectedNomineeIds.length >= selectedCategory.maxNominees) {
          toast(`Máximo ${selectedCategory.maxNominees} personas para ${selectedCategory.name}.`);
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

    if (selectedCategory.type === 'individual') {
      $('justification').focus({ preventScroll: true });
    }
  }

  function updateSelectionBadge() {
    const badge = $('selectionBadge');
    if (!badge || !selectedCategory) return;
    const count = selectedNomineeIds.length;
    const max = selectedCategory.maxNominees;
    if (selectedCategory.type === 'individual') {
      badge.textContent = count ? '1 persona seleccionada' : 'Ninguna seleccionada';
    } else {
      badge.textContent = `${count} de ${max} seleccionada${count !== 1 ? 's' : ''}`;
    }
  }

  function updateCharCount() {
    const v = $('justification').value;
    const max = cfg().MAIL.MAX_JUSTIFICATION_CHARS;
    $('charCount').textContent = v.length;
    $('charMax').textContent = max;
    if (v.length > max) {
      $('justification').value = v.slice(0, max);
      $('charCount').textContent = max;
    }
    const pct = v.length / max;
    const counter = $('charCount').parentElement;
    if (counter) {
      counter.classList.toggle('warn', pct > 0.85 && pct < 1);
      counter.classList.toggle('danger', pct >= 1);
    }
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

  /* ---------- BUILD MAILTO ----------
     Nuevo schema (v6):
     Subject: RP-FY26-VOTE|uid|voterName|categoryId|nominee1;nominee2|timestamp
     Body: justificación (texto libre, sin límite de subject)
     Power Automate: split(subject,'|') → [0..5], body = justificación
  ------------------------------------------------------------ */
  function buildMailtoUrl(vote) {
    const c = cfg();
    const nominees = vote.nomineeIds.join(c.MAIL.NOMINEE_SEP);
    const fields = [
      c.MAIL.SUBJECT_PREFIX,
      vote.id,
      sanitizeForSubject(vote.voter),
      vote.categoryId,
      nominees,
      vote.timestamp
    ];
    const subject = fields.join(c.MAIL.FIELD_SEP);
    const body = vote.justification;
    return 'mailto:' + encodeURIComponent(c.MAIL.ADMIN_EMAIL) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  }

  /* ---------- SUBMIT ---------- */
  function submitVote() {
    const just = $('justification').value.trim();
    if (selectedNomineeIds.length === 0 || !just) {
      $('voteAlert').style.display = 'block';
      return;
    }
    if (!selectedCategory) {
      toast('Error: seleccioná una categoría primero.');
      return;
    }

    const nominees = selectedNomineeIds
      .map(id => team.find(p => p.id === id))
      .filter(Boolean);

    const vote = {
      id: uid(),
      voter: currentVoter,
      categoryId: selectedCategory.id,
      categoryName: selectedCategory.name,
      nomineeIds: [...selectedNomineeIds],
      nomineeNames: nominees.map(n => n.name),
      justification: just,
      timestamp: new Date().toISOString()
    };
    sessionVotes.push(vote);

    if (cfg().STORAGE_MODE === 'mailto') {
      window.location.href = buildMailtoUrl(vote);
      setTimeout(() => showSentScreen(vote), 400);
    } else {
      try {
        const arr = JSON.parse(localStorage.getItem('rcg_votes_v2') || '[]');
        arr.push(vote);
        localStorage.setItem('rcg_votes_v2', JSON.stringify(arr));
      } catch (e) { /* ignore */ }
      showSentScreen(vote);
    }
  }

  function showSentScreen(vote) {
    go('sent');
    const names = vote.nomineeNames.join(', ');
    $('sentNomineeName').textContent = names;
    $('sentCategoryName').textContent = vote.categoryName;
    $('sentSessionLabel').textContent =
      sessionVotes.length === 1
        ? '1 nominación en esta sesión'
        : `${sessionVotes.length} nominaciones en esta sesión`;
  }

  function voteAgain() {
    selectedCategory = null;
    selectedNomineeIds = [];
    renderCategoryGrid();
    go('category');
  }

  function finishVoting() {
    sessionVotes = [];
    selectedCategory = null;
    selectedNomineeIds = [];
    go('welcome');
  }

  function resendLast() {
    if (!sessionVotes.length) return;
    const last = sessionVotes[sessionVotes.length - 1];
    window.location.href = buildMailtoUrl(last);
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
    init, go, startSurvey,
    confirmVoter, selectCategory,
    selectNominee, updateCharCount, updateSelectionBadge,
    submitVote, voteAgain, finishVoting, resendLast,
    setFilter, applyFilters, clearSearch
  };
})();

window.addEventListener('load', App.init);
window.App = App;
