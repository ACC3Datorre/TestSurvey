/* ============================================================
   ADMIN — Recognition Points (v3 — Power BI redirect)
   El dashboard custom desapareció. La jefa ve todo en Power BI.
   Acá solo manejamos: login, link a PBI, fallback offline.
   ============================================================ */

const Admin = (() => {

  const $ = (id) => document.getElementById(id);

  function displayName(name) {
    return String(name).replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }
  function toast(msg) {
    $('toastMsg').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => $('toast').classList.remove('show'), 3000);
  }
  function go(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    $('screen-' + name).classList.add('active');
    window.scrollTo(0, 0);
  }

  /* ---------- login ---------- */
  function login() {
    const u = $('loginUser').value.trim();
    const p = $('loginPass').value;
    const res = Auth.login(u, p);
    if (!res.ok) {
      $('loginError').style.display = 'block';
      $('loginPass').value = '';
      $('loginPass').focus();
      return;
    }
    $('loginError').style.display = 'none';
    enterAdmin();
  }
  function logout() {
    Auth.logout();
    go('login');
    $('loginUser').value = '';
    $('loginPass').value = '';
  }

  /* ---------- admin landing ---------- */
  function enterAdmin() {
    go('admin');
    const date = new Date().toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase();
    if ($('dashMeta')) $('dashMeta').textContent = `${date} · MAIL+EXCEL+PBI`;

    // Configurar el link de Power BI
    const pbiLink = $('pbiLink');
    const pbiUrl = window.APP_CONFIG.POWER_BI.DASHBOARD_URL;
    if (pbiLink) {
      if (!pbiUrl || pbiUrl.startsWith('PEGAR_AQUI')) {
        // Sin URL configurada: deshabilitamos visualmente y avisamos
        pbiLink.classList.add('admin-card-disabled');
        pbiLink.removeAttribute('href');
        pbiLink.querySelector('.arrow').textContent = '⚠ URL no configurada';
        pbiLink.onclick = (e) => {
          e.preventDefault();
          toast('Falta configurar POWER_BI.DASHBOARD_URL en js/config.js');
        };
      } else {
        pbiLink.href = pbiUrl;
      }
    }
    renderFallbackPreview();
  }

  /* ---------- IMPORT JSON (fallback) ---------- */
  async function importJSON(event) {
    const f = event.target.files[0];
    if (!f) return;
    try {
      const r = await DataLayer.importJSON(f);
      toast(`Importado: +${r.added} (total ${r.total})`);
      renderFallbackPreview();
    } catch (e) { toast('Error: ' + e.message); }
    event.target.value = '';
  }

  /* ---------- IMPORT EXCEL (.xlsx de SharePoint) ----------
     La jefa puede bajar el Excel desde SharePoint y arrastrarlo
     acá si quiere ver un preview rápido sin abrir Power BI.
  */
  function importExcel(event) {
    const f = event.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array' });
        // Buscar la hoja con la tabla
        const sheet = wb.Sheets['Votes'] || wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        // Mapear a nuestro formato
        const votes = rows
          .filter(r => r.id || r.nominee) // ignorar filas vacías
          .map(r => ({
            id: String(r.id || ''),
            voter: String(r.voter || ''),
            nominee: String(r.nominee || ''),
            justification: String(r.justification || ''),
            timestamp: String(r.timestamp || '')
          }));

        // Reemplazar el storage local con esta data
        localStorage.setItem('rcg_votes_v2', JSON.stringify(votes));
        toast(`Excel importado: ${votes.length} nominaciones`);
        renderFallbackPreview();
      } catch (err) {
        toast('Error al leer Excel: ' + err.message);
      }
    };
    reader.onerror = () => toast('No se pudo leer el archivo.');
    reader.readAsArrayBuffer(f);
    event.target.value = '';
  }

  /* ---------- EXPORT EXCEL ---------- */
  async function exportExcel() {
    const votes = await DataLayer.getVotes();
    if (!votes.length) { toast('No hay datos para exportar.'); return; }

    const counts = {};
    votes.forEach(v => { counts[v.nominee] = (counts[v.nominee] || 0) + 1; });
    const sorted = [...votes].sort((a, b) =>
      (counts[b.nominee] - counts[a.nominee]) || a.nominee.localeCompare(b.nominee));

    const detail = [
      ['Nominado', 'Votado por', 'Justificación', 'Timestamp'],
      ...sorted.map(v => [
        displayName(v.nominee), v.voter, v.justification, v.timestamp || ''
      ])
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(detail);
    ws1['!cols'] = [{ wch: 28 }, { wch: 24 }, { wch: 70 }, { wch: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Detalle');
    XLSX.writeFile(wb, `recognition_points_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast('Excel exportado');
  }

  /* ---------- FALLBACK PREVIEW (mini KPIs en avanzado) ---------- */
  async function renderFallbackPreview() {
    const votes = await DataLayer.getVotes();
    const preview = $('fallbackPreview');
    if (!preview) return;
    if (!votes.length) {
      preview.style.display = 'none';
      return;
    }
    preview.style.display = 'block';
    $('fbTotal').textContent = votes.length;
    $('fbNominees').textContent = new Set(votes.map(v => v.nominee)).size;
    $('fbVoters').textContent = new Set(votes.map(v => v.voter.toLowerCase())).size;

    const counts = {};
    votes.forEach(v => { counts[v.nominee] = (counts[v.nominee] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    $('fbTop').textContent = top
      ? `${displayName(top[0])} (${top[1]})`
      : '—';
  }

  /* ---------- CLEAR ---------- */
  function askClear() { $('clearModal').classList.add('open'); }
  function cancelClear() { $('clearModal').classList.remove('open'); }
  function confirmClear() {
    DataLayer.clearLocal();
    cancelClear();
    renderFallbackPreview();
    toast('Datos locales eliminados');
  }

  /* ---------- INIT ---------- */
  function init() {
    if (Auth.isLoggedIn()) {
      enterAdmin();
    } else {
      go('login');
      setTimeout(() => $('loginUser') && $('loginUser').focus(), 80);
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && $('screen-login').classList.contains('active')) {
        login();
      }
    });
  }

  return {
    init, login, logout,
    importJSON, importExcel, exportExcel,
    askClear, cancelClear, confirmClear
  };
})();

window.addEventListener('load', Admin.init);
window.Admin = Admin;
