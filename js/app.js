/* ============================================================
   APP — Recognition Points (página pública)
   Maneja el flujo de votación: bienvenida → identificación →
   votación → confirmar otra → terminar.
   ============================================================ */

const App = (() => {

  let people = [];
  let currentVoter = null;
  let selectedNominee = null;
  let sessionVotes = [];

  /* ---------- helpers ---------- */
  const $ = (id) => document.getElementById(id);

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
    toast._t = setTimeout(() => $('toast').classList.remove('show'), 3000);
  }

  /* ---------- people ---------- */
  const PEOPLE_KEY = 'rcg_people_v2';
  function loadPeople() {
    const saved = localStorage.getItem(PEOPLE_KEY);
    people = saved ? JSON.parse(saved) : [...window.APP_CONFIG.TEAM];
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
      vote: 'Votación', confirm: 'Confirmar', done: 'Listo'
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
  function resetVoterInput() {
    $('voterNameInput').value = '';
    $('voterAlert').style.display = 'none';
    currentVoter = null;
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
    const others = people.filter(p =>
      p.toLowerCase() !== currentVoter.toLowerCase().replace(/\s+/g, '.')
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
    $('charCount').textContent = $('justification').value.length;
  }
  async function submitVote() {
    const just = $('justification').value.trim();
    if (!selectedNominee || !just) {
      $('voteAlert').style.display = 'block';
      return;
    }
    try {
      const vote = await DataLayer.submitVote({
        voter: currentVoter,
        nominee: selectedNominee,
        justification: just
      });
      sessionVotes.push(vote);
      showConfirmScreen();
      toast('Nominación registrada');
    } catch (err) {
      toast('Error al guardar: ' + err.message);
    }
  }

  /* ---------- confirm ---------- */
  function showConfirmScreen() {
    go('confirm');
    $('confirmList').innerHTML = sessionVotes.map(v => `
      <div class="summary-item">
        <div class="who">${displayName(v.nominee)}</div>
        <div class="why">${v.justification.length > 140
          ? v.justification.slice(0, 140) + '…'
          : v.justification}</div>
      </div>`).join('');
  }
  function voteAgain() {
    go('vote');
    $('currentVoterName').textContent = currentVoter;
    renderNomineeGrid();
  }
  function finishVoting() {
    go('done');
    const count = sessionVotes.length;
    const names = sessionVotes.map(v => displayName(v.nominee)).join(', ');
    $('doneSummaryText').textContent = count === 1
      ? `Nominaste a ${names}. Tu reconocimiento ya quedó registrado.`
      : `Nominaste a ${count} personas: ${names}. Tu reconocimiento ya quedó registrado.`;
  }
  function newVoter() {
    sessionVotes = [];
    go('welcome');
  }

  /* ---------- init ---------- */
  function init() {
    loadPeople();
    renderPersonList();

    // Enter en input de persona
    const newPerson = $('newPersonInput');
    if (newPerson) {
      newPerson.addEventListener('keydown', e => {
        if (e.key === 'Enter') addPerson();
      });
    }
    // Enter en pantalla de voter
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && $('screen-voter').classList.contains('active')) {
        confirmVoter();
      }
    });
  }

  return {
    init, go, startSurvey, addPerson, removePerson,
    confirmVoter, selectNominee, updateCharCount,
    submitVote, voteAgain, finishVoting, newVoter
  };
})();

window.addEventListener('load', App.init);
window.App = App;
