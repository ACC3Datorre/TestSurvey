/* ============================================================
   ADMIN DASHBOARD — Recognition Points (v2 - control center)
   Charts con altura fija, word cloud limitado, header compacto.
   ============================================================ */

const Admin = (() => {

  let chartBar, chartPie;
  let votes = [];

  /* ---------- helpers ---------- */
  const $ = (id) => document.getElementById(id);

  function displayName(name) {
    return name.replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
    enterDashboard();
  }
  function logout() {
    Auth.logout();
    go('login');
    $('loginUser').value = '';
    $('loginPass').value = '';
  }

  /* ---------- dashboard ---------- */
  async function enterDashboard() {
    go('dash');
    const dateStr = new Date().toLocaleDateString('es-AR', {
      day: '2-digit', month: 'short', year: 'numeric'
    }).toUpperCase();
    const mode = window.APP_CONFIG.STORAGE_MODE.toUpperCase();
    if ($('dashMeta')) $('dashMeta').textContent = `${dateStr} · ${mode}`;
    if ($('kpiMode')) $('kpiMode').textContent = mode;
    if ($('kpiUpdated')) $('kpiUpdated').textContent = 'recién actualizado';
    await refresh();
  }

  async function refresh() {
    try { votes = await DataLayer.getVotes(); }
    catch (err) { toast('Error: ' + err.message); votes = []; }
    if ($('kpiUpdated')) {
      const t = new Date().toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'});
      $('kpiUpdated').textContent = `actualizado ${t}`;
    }
    renderKPIs();
    renderBarChart();
    renderPieChart();
    renderWordCloud();
    renderNomineeSelect();
    renderPerNomineeWords();
    renderTable();
  }

  /* ---------- KPIs ---------- */
  function renderKPIs() {
    const total = votes.length;
    const nominees = new Set(votes.map(v => v.nominee)).size;
    const voters = new Set(votes.map(v => v.voter.toLowerCase())).size;
    const avg = voters ? (total / voters).toFixed(1) : '0';
    $('kpiTotal').textContent = total;
    $('kpiNominees').textContent = nominees;
    $('kpiVoters').textContent = voters;
    $('kpiAvg').textContent = avg;
  }

  /* ---------- counts ---------- */
  function nomineeCounts() {
    const m = {};
    votes.forEach(v => { m[v.nominee] = (m[v.nominee] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }

  /* ---------- BAR CHART (top 8) ---------- */
  function renderBarChart() {
    const ctx = $('chartBar');
    if (!ctx) return;
    const data = nomineeCounts().slice(0, 8);

    if (chartBar) chartBar.destroy();

    if (!data.length) {
      // Limpiar si no hay datos
      const cctx = ctx.getContext('2d');
      cctx.clearRect(0, 0, ctx.width, ctx.height);
      return;
    }

    const labels = data.map(([n]) => displayName(n));
    const values = data.map(([_, c]) => c);

    chartBar = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: barCtx => {
            const i = barCtx.dataIndex;
            return i === 0 ? '#A100FF'
                 : i < 3   ? '#7500BA'
                 : '#4A0073';
          },
          borderRadius: 0,
          barThickness: 14,
          maxBarThickness: 18
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0E0E12',
            titleColor: '#FAFAF7',
            bodyColor: '#FAFAF7',
            borderColor: '#A100FF',
            borderWidth: 1,
            padding: 8,
            titleFont: { family: 'Inter Tight', size: 11 },
            bodyFont: { family: 'Inter Tight', size: 11 }
          }
        },
        scales: {
          x: {
            ticks: {
              color: '#9A9A92',
              font: { family: 'Inter Tight', size: 10 },
              precision: 0,
              maxTicksLimit: 5
            },
            grid: { color: '#2A2A33', drawBorder: false }
          },
          y: {
            ticks: {
              color: '#FAFAF7',
              font: { family: 'Inter Tight', size: 11, weight: 500 },
              autoSkip: false
            },
            grid: { display: false, drawBorder: false }
          }
        },
        animation: { duration: 500, easing: 'easeOutQuart' }
      }
    });
  }

  /* ---------- PIE / DOUGHNUT ---------- */
  function renderPieChart() {
    const ctx = $('chartPie');
    if (!ctx) return;
    const all = nomineeCounts();

    if (chartPie) chartPie.destroy();
    if (!all.length) return;

    // top 6 + "Otros"
    const top = all.slice(0, 6);
    const rest = all.slice(6).reduce((s, [_, c]) => s + c, 0);
    const labels = top.map(([n]) => {
      const dn = displayName(n);
      return dn.length > 18 ? dn.slice(0, 17) + '…' : dn;
    });
    const values = top.map(([_, c]) => c);
    if (rest > 0) { labels.push('Otros'); values.push(rest); }

    const palette = [
      '#A100FF', '#7500BA', '#C159FF', '#5A0090',
      '#D798FF', '#3D0061', '#9A9A92'
    ];

    chartPie = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: palette,
          borderColor: '#1A1A22',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: {
              color: '#FAFAF7',
              font: { family: 'Inter Tight', size: 10 },
              boxWidth: 8,
              boxHeight: 8,
              padding: 8
            }
          },
          tooltip: {
            backgroundColor: '#0E0E12',
            titleColor: '#FAFAF7',
            bodyColor: '#FAFAF7',
            borderColor: '#A100FF',
            borderWidth: 1,
            padding: 8,
            titleFont: { family: 'Inter Tight', size: 11 },
            bodyFont: { family: 'Inter Tight', size: 11 }
          }
        },
        cutout: '58%',
        animation: { duration: 600, easing: 'easeOutQuart' }
      }
    });
  }

  /* ---------- WORD CLOUDS ---------- */
  function tokenize(text) {
    return text
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zñ\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !window.APP_CONFIG.STOPWORDS.has(w));
  }
  function wordFrequencies(texts) {
    const m = {};
    texts.forEach(t => tokenize(t).forEach(w => { m[w] = (m[w] || 0) + 1; }));
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }
  function renderCloud(targetId, freq, max = 25, minSize = 11, maxSize = 24) {
    const el = $(targetId);
    if (!el) return;
    if (!freq.length) {
      el.innerHTML = '<span style="color: var(--muted-2); font-size: 11px; font-style: normal; letter-spacing: 0.04em;">Sin datos suficientes.</span>';
      return;
    }
    const top = freq.slice(0, max);
    const maxCount = top[0][1];
    const palette = ['#A100FF', '#C159FF', '#D798FF', '#FAFAF7', '#9A9A92'];
    el.innerHTML = top.map(([w, c], i) => {
      const ratio = Math.sqrt(c / maxCount);
      const size = Math.round(minSize + (maxSize - minSize) * ratio);
      const colorIdx = Math.min(Math.floor(i / Math.ceil(top.length / palette.length)), palette.length - 1);
      const color = palette[colorIdx];
      return `<span style="font-size:${size}px; color:${color};" title="${c} menciones">${w}</span>`;
    }).join('');
  }
  function renderWordCloud() {
    const freq = wordFrequencies(votes.map(v => v.justification));
    renderCloud('wordCloud', freq, 25, 11, 24);
  }

  function renderNomineeSelect() {
    const sel = $('nomSelect');
    if (!sel) return;
    const list = [...new Set(votes.map(v => v.nominee))]
      .sort((a, b) => a.localeCompare(b));
    if (!list.length) {
      sel.innerHTML = '<option>— sin datos —</option>';
      return;
    }
    sel.innerHTML = list.map((n, i) =>
      `<option value="${n}" ${i === 0 ? 'selected' : ''}>${displayName(n)}</option>`
    ).join('');
  }
  function renderPerNomineeWords() {
    const sel = $('nomSelect');
    const nom = sel ? sel.value : null;
    if (!nom) { renderCloud('perNomineeCloud', []); return; }
    const texts = votes.filter(v => v.nominee === nom).map(v => v.justification);
    const freq = wordFrequencies(texts);
    renderCloud('perNomineeCloud', freq, 18, 11, 22);
  }

  /* ---------- TABLE ---------- */
  function renderTable() {
    const body = $('resultsBody');
    const empty = $('emptyState');
    if (!votes.length) {
      body.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    const counts = Object.fromEntries(nomineeCounts());
    const sorted = [...votes].sort((a, b) => {
      const d = counts[b.nominee] - counts[a.nominee];
      return d !== 0 ? d : a.nominee.localeCompare(b.nominee);
    });
    body.innerHTML = sorted.map(v => `
      <tr>
        <td class="nominee">${displayName(v.nominee)}</td>
        <td class="voter">${escapeHtml(v.voter)}</td>
        <td class="just">${escapeHtml(v.justification)}</td>
      </tr>`).join('');
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  /* ---------- EXPORT EXCEL ---------- */
  function exportExcel() {
    if (!votes.length) { toast('No hay datos para exportar.'); return; }
    const counts = Object.fromEntries(nomineeCounts());
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

    const grouped = {};
    sorted.forEach(v => {
      grouped[v.nominee] = grouped[v.nominee] || { count: 0, comments: [] };
      grouped[v.nominee].count++;
      grouped[v.nominee].comments.push(v.justification);
    });
    const summary = [['Nominado', 'Votos', 'Comentarios']];
    Object.keys(grouped)
      .sort((a, b) => grouped[b].count - grouped[a].count)
      .forEach(n => {
        summary.push([
          displayName(n),
          grouped[n].count,
          grouped[n].comments.map((c, i) => `${i + 1}. ${c}`).join('\n')
        ]);
      });
    const ws2 = XLSX.utils.aoa_to_sheet(summary);
    ws2['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 90 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Detalle');
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');
    XLSX.writeFile(wb, `recognition_points_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast('Excel exportado');
  }

  /* ---------- IMPORT JSON ---------- */
  async function importJSON(event) {
    const f = event.target.files[0];
    if (!f) return;
    try {
      const r = await DataLayer.importJSON(f);
      toast(`Importado: +${r.added} (total ${r.total})`);
      await refresh();
    } catch (e) { toast('Error: ' + e.message); }
    event.target.value = '';
  }

  /* ---------- CLEAR ---------- */
  function askClear() { $('clearModal').classList.add('open'); }
  function cancelClear() { $('clearModal').classList.remove('open'); }
  function confirmClear() {
    DataLayer.clearLocal();
    cancelClear();
    refresh();
    toast('Datos locales eliminados');
  }

  /* ---------- INIT ---------- */
  function init() {
    if (Auth.isLoggedIn()) {
      enterDashboard();
    } else {
      go('login');
      setTimeout(() => $('loginUser') && $('loginUser').focus(), 80);
    }
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && $('screen-login').classList.contains('active')) {
        login();
      }
    });
    // Re-render charts on resize (Chart.js no reescala bien con grids)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (chartBar) chartBar.resize();
        if (chartPie) chartPie.resize();
      }, 120);
    });
  }

  return {
    init, login, logout, refresh, exportExcel, importJSON,
    askClear, cancelClear, confirmClear, renderPerNomineeWords
  };
})();

window.addEventListener('load', Admin.init);
window.Admin = Admin;
