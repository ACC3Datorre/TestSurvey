/* ============================================================
   APP — Recognition Points (v5 — equipo completo + filtros)
   - Equipo como array de objetos {id, name, level, track}
   - Buscador por nombre o id
   - Filtros por track y level
   ============================================================ */

const App = (() => {

  let team = [];          // copia de APP_CONFIG.TEAM
  let currentVoter = null;
  let selectedNomineeId = null;
  let sessionVotes = [];

  // Estado de filtros
  let filters = {
    track: 'all',
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
      .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // sin tildes
  }

  /* ---------- screens ---------- */
  function go(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = $('screen-' + name);
    if (target) target.classList.add('active');
    const tagMap = {
      welcome: 'Inicio', voter: 'Identificación',
      vote: 'Votación', sent: 'Enviado'
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
    go('vote');
    $('currentVoterName').textContent = currentVoter;
    resetFilters();
    renderNomineeGrid();
  }

  /* ---------- filtros ---------- */
  function setFilter(btn) {
    const filter = btn.dataset.filter;   // 'track' | 'level'
    const value = btn.dataset.value;     // 'all' | 'FinOps' | etc.
    filters[filter] = value;
    // marcar visual
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
    filters = { track: 'all', level: 'all', search: '' };
    $('searchInput').value = '';
    $('searchClear').style.display = 'none';
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
  function getFilteredTeam() {
    const voterSlug = currentVoter
      ? normalize(currentVoter).replace(/\s+/g, '.')
      : '';
    const search = normalize(filters.search);

    return team.filter(p => {
      // No mostrar al votante (best effort, tomando su nombre escrito)
      if (p.id === voterSlug) return false;

      if (filters.track !== 'all' && p.track !== filters.track) return false;
      if (filters.level !== 'all' && p.level !== filters.level) return false;

      if (search) {
        const haystack = normalize(p.name + ' ' + p.id);
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }

  function renderNomineeGrid() {
    const filtered = getFilteredTeam();
    const alreadyNomIds = new Set(sessionVotes.map(v => v.nomineeId));
    selectedNomineeId = null;

    const grid = $('nomineeGrid');
    const empty = $('emptyResults');
    const counter = $('resultCount');

    if (!filtered.length) {
      grid.innerHTML = '';
      empty.style.display = 'block';
      counter.textContent = '';
    } else {
      empty.style.display = 'none';
      counter.textContent = `${filtered.length} persona${filtered.length === 1 ? '' : 's'}`;

      grid.innerHTML = filtered.map(p => {
        const voted = alreadyNomIds.has(p.id);
        const safeId = p.id.replace(/'/g, "\\'");
        return `
          <div class="nominee-card ${voted ? 'disabled' : ''}"
               ${voted ? '' : `onclick="App.selectNominee('${safeId}', this)"`}>
            <span class="initials">${initials(p.name)}</span>
            <div class="name">${p.name}</div>
            <div class="role">${p.level} · ${p.track}</div>
            <div class="nominee-id">${p.id}</div>
            ${voted
              ? '<div class="check">✓ Ya nominado</div>'
              : '<div class="check">✓</div>'}
          </div>`;
      }).join('');
    }

    $('justification').value = '';
    updateCharCount();
    $('sessionVoteCount').textContent = sessionVotes.length;
  }

  function selectNominee(id, el) {
    document.querySelectorAll('#nomineeGrid .nominee-card:not(.disabled)')
      .forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedNomineeId = id;
    $('voteAlert').style.display = 'none';
    // scroll suave al textarea
    $('justification').focus({ preventScroll: true });
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

  /* ---------- BUILD MAILTO ---------- */
  function buildMailtoUrl(vote) {
    const c = cfg();
    const fields = [
      c.MAIL.SUBJECT_PREFIX,
      vote.id,
      sanitizeForSubject(vote.voter),
      sanitizeForSubject(vote.nomineeId),
      sanitizeForSubject(vote.justification),
      vote.timestamp
    ];
    const subject = fields.join(c.MAIL.FIELD_SEP);
    return 'mailto:' + encodeURIComponent(c.MAIL.ADMIN_EMAIL) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(c.MAIL.BODY);
  }

  /* ---------- SUBMIT ---------- */
  function submitVote() {
    const just = $('justification').value.trim();
    if (!selectedNomineeId || !just) {
      $('voteAlert').style.display = 'block';
      return;
    }
    const nominee = team.find(p => p.id === selectedNomineeId);
    if (!nominee) {
      toast('Error: persona no encontrada.');
      return;
    }
    const vote = {
      id: uid(),
      voter: currentVoter,
      nomineeId: nominee.id,
      nomineeName: nominee.name,
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
    $('sentNomineeName').textContent = vote.nomineeName;
    $('sentSessionLabel').textContent =
      sessionVotes.length === 1
        ? '1 nominación en esta sesión'
        : `${sessionVotes.length} nominaciones en esta sesión`;
  }
  function voteAgain() {
    go('vote');
    $('currentVoterName').textContent = currentVoter;
    resetFilters();
    renderNomineeGrid();
  }
  function finishVoting() {
    sessionVotes = [];
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
    confirmVoter, selectNominee, updateCharCount,
    submitVote, voteAgain, finishVoting, resendLast,
    setFilter, applyFilters, clearSearch
  };
})();

window.addEventListener('load', App.init);
window.App = App;
