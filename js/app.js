/* ============================================================
   APP — Recognition Points (v3 — mailto flow)
   El submit arma un subject formato:
     RP-FY26-VOTE|<id>|<voter>|<nominee>|<justification>|<timestamp>
   y abre Outlook con mailto:.
   ============================================================ */

const App = (() => {

  let people = [];
  let currentVoter = null;
  let selectedNominee = null;
  let sessionVotes = [];

  /* ---------- helpers ---------- */
  const $ = (id) => document.getElementById(id);
  const cfg = () => window.APP_CONFIG;

  function initials(name) {
    return name.replace(/\./g, ' ').trim().split(/\s+/)
      .map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  function displayName(name) {
    return name.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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

  /* ---------- people (lista del equipo) ---------- */
  const PEOPLE_KEY = 'rcg_people_v2';
  function loadPeople() {
    const saved = localStorage.getItem(PEOPLE_KEY);
    people = saved ? JSON.parse(saved) : [...cfg().TEAM];
    if (!saved) savePeople();
  }
  function savePeople() {
    localStorage.setItem(PEOPLE_KEY, JSON.stringify(people));
  }
  function addPerson() {
    const inp = $('newPersonInput');
    const name = inp.value.trim().toLowerCase().replace(/\s+/g, '.');
    if (!name) return;
    if (!people.includes(name)) {
      people.push(name);
      savePeople();
      renderPersonList();
    }
    inp.value = '';
    inp.focus();
  }
  function removePerson(name) {
    people = people.filter(p => p !== name);
    savePeople();
    renderPersonList();
  }
  function renderPersonList() {
    const list = $('personList');
    if (!list) return;
    list.innerHTML = people.map(p => `
      <span class="tag">
        ${displayName(p)}
        <span class="x" onclick="App.removePerson('${p.replace(/'/g,"\\'")}')">×</span>
      </span>`).join('');
    const msg = $('previewMsg');
    if (msg) msg.textContent = people.length
      ? `${people.length} integrante(s) en la lista.`
      : 'No hay integrantes cargados.';
  }

  /* ---------- screens ---------- */
  function go(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const target = $('screen-' + name);
    if (target) target.classList.add('active');
    const tagMap = {
      welcome: 'Inicio', setup: 'Setup', voter: 'Identificación',
      vote: 'Votación', sent: 'Enviado'
    };
    const tag = $('navTag');
    if (tag) tag.textContent = tagMap[name] || name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ---------- voter ---------- */
  function startSurvey() {
    if (people.length < 2) { alert('Cargá al menos 2 integrantes.'); return; }
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
    renderNomineeGrid();
  }

  /* ---------- vote ---------- */
  function renderNomineeGrid() {
    const alreadyNom = sessionVotes.map(v => v.nominee);
    // Excluyo al votante de la lista de nominables
    const voterSlug = currentVoter.toLowerCase().replace(/\s+/g, '.');
    const others = people.filter(p =>
      p.toLowerCase() !== voterSlug
    );
    selectedNominee = null;
    $('nomineeGrid').innerHTML = others.map(p => {
      const voted = alreadyNom.includes(p);
      const safeId = p.replace(/'/g, "\\'");
      return `
        <div class="nominee-card ${voted ? 'disabled' : ''}"
             ${voted ? '' : `onclick="App.selectNominee('${safeId}', this)"`}>
          <span class="initials">${initials(p)}</span>
          <div class="name">${displayName(p)}</div>
          <div class="role">FinOps</div>
          ${voted
            ? '<div class="check">✓ Ya nominado</div>'
            : '<div class="check">✓</div>'}
        </div>`;
    }).join('');
    $('justification').value = '';
    updateCharCount();
    $('sessionVoteCount').textContent = sessionVotes.length;
  }
  function selectNominee(name, el) {
    document.querySelectorAll('#nomineeGrid .nominee-card:not(.disabled)')
      .forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedNominee = name;
    $('voteAlert').style.display = 'none';
  }
  function updateCharCount() {
    const v = $('justification').value;
    const max = cfg().MAIL.MAX_JUSTIFICATION_CHARS;
    $('charCount').textContent = v.length;
    $('charMax').textContent = max;
    // Enforzar límite (algunos browsers no respetan maxlength en paste)
    if (v.length > max) {
      $('justification').value = v.slice(0, max);
      $('charCount').textContent = max;
    }
    // Aviso visual cuando estamos cerca del límite
    const pct = v.length / max;
    const counter = $('charCount').parentElement;
    if (counter) {
      counter.classList.toggle('warn', pct > 0.85 && pct < 1);
      counter.classList.toggle('danger', pct >= 1);
    }
  }

  /* ---------- SANITIZE ----------
     Remueve caracteres que rompen el subject:
     - el separador de campos (lo reemplazamos)
     - saltos de línea, tabs (Outlook no los pone en subject pero por si acaso)
  */
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
      sanitizeForSubject(vote.nominee),
      sanitizeForSubject(vote.justification),
      vote.timestamp
    ];
    const subject = fields.join(c.MAIL.FIELD_SEP);
    // Construimos los params manualmente para evitar que URLSearchParams
    // codifique espacios como '+' (algunos clientes no lo decodifican).
    // Usamos encodeURIComponent que codifica espacios como %20.
    const url = 'mailto:' + encodeURIComponent(c.MAIL.ADMIN_EMAIL) +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(c.MAIL.BODY);
    return url;
  }

  /* ---------- SUBMIT ---------- */
  function submitVote() {
    const just = $('justification').value.trim();
    if (!selectedNominee || !just) {
      $('voteAlert').style.display = 'block';
      return;
    }
    const vote = {
      id: uid(),
      voter: currentVoter,
      nominee: selectedNominee,
      justification: just,
      timestamp: new Date().toISOString()
    };
    sessionVotes.push(vote);

    if (cfg().STORAGE_MODE === 'mailto') {
      // Abrir Outlook con el mail prellenado
      const url = buildMailtoUrl(vote);
      window.location.href = url;
      // Damos un instante y mostramos pantalla de confirmación
      setTimeout(() => showSentScreen(vote), 400);
    } else {
      // modo local: guardar en localStorage (legacy)
      try {
        const arr = JSON.parse(localStorage.getItem('rcg_votes_v2') || '[]');
        arr.push(vote);
        localStorage.setItem('rcg_votes_v2', JSON.stringify(arr));
      } catch (e) { /* ignore */ }
      showSentScreen(vote);
    }
  }

  /* ---------- SENT SCREEN ---------- */
  function showSentScreen(vote) {
    go('sent');
    $('sentNomineeName').textContent = displayName(vote.nominee);
    $('sentSessionCount').textContent = sessionVotes.length;
    $('sentSessionLabel').textContent =
      sessionVotes.length === 1
        ? '1 nominación en esta sesión'
        : `${sessionVotes.length} nominaciones en esta sesión`;
  }
  function voteAgain() {
    go('vote');
    $('currentVoterName').textContent = currentVoter;
    renderNomineeGrid();
  }
  function finishVoting() {
    sessionVotes = [];
    go('welcome');
  }

  /* ---------- RESEND last ----------
     Por si el browser bloqueó el primer mailto (raro pero pasa).
  */
  function resendLast() {
    if (!sessionVotes.length) return;
    const last = sessionVotes[sessionVotes.length - 1];
    window.location.href = buildMailtoUrl(last);
  }

  /* ---------- init ---------- */
  function init() {
    loadPeople();
    renderPersonList();

    const newPerson = $('newPersonInput');
    if (newPerson) {
      newPerson.addEventListener('keydown', e => {
        if (e.key === 'Enter') addPerson();
      });
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && $('screen-voter').classList.contains('active')) {
        confirmVoter();
      }
    });
    // Inicializar contador
    updateCharCount();
  }

  return {
    init, go, startSurvey, addPerson, removePerson,
    confirmVoter, selectNominee, updateCharCount,
    submitVote, voteAgain, finishVoting, resendLast
  };
})();

window.addEventListener('load', App.init);
window.App = App;
