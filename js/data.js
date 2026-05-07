/* ============================================================
   DATA LAYER — Recognition Points
   Esta capa abstrae si los datos viven en localStorage
   o en SharePoint vía Power Automate. El resto del código
   solo llama a DataLayer.submitVote() y DataLayer.getVotes()
   y no se entera de dónde sale la info.
   ============================================================ */

const DataLayer = (() => {

  const cfg = window.APP_CONFIG;
  const LS_KEY = 'rcg_votes_v2';

  /* -------- helpers genéricos -------- */
  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2, 9);

  const nowISO = () => new Date().toISOString();

  /* -------- modo LOCAL -------- */
  const local = {
    getAll() {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); }
      catch { return []; }
    },
    saveAll(arr) {
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    },
    push(vote) {
      const arr = this.getAll();
      arr.push(vote);
      this.saveAll(arr);
      return Promise.resolve(vote);
    },
    clear() {
      localStorage.removeItem(LS_KEY);
    }
  };

  /* -------- modo POWER AUTOMATE -------- */
  const remote = {
    async submit(vote) {
      const url = cfg.POWER_AUTOMATE.SUBMIT_VOTE_URL;
      if (!url || url.startsWith('PEGAR_AQUI')) {
        throw new Error('La URL del flow de submit no está configurada.');
      }
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shared-Token': cfg.POWER_AUTOMATE.SHARED_TOKEN || ''
        },
        body: JSON.stringify(vote)
      });
      if (!res.ok) throw new Error('Error enviando voto: ' + res.status);
      return vote;
    },
    async getAll() {
      const url = cfg.POWER_AUTOMATE.GET_VOTES_URL;
      if (!url || url.startsWith('PEGAR_AQUI')) {
        throw new Error('La URL del flow de GET no está configurada.');
      }
      const res = await fetch(url, {
        method: 'GET',
        headers: { 'X-Shared-Token': cfg.POWER_AUTOMATE.SHARED_TOKEN || '' }
      });
      if (!res.ok) throw new Error('Error leyendo votos: ' + res.status);
      const data = await res.json();
      // Esperamos un array; si Power Automate lo envuelve, ajustá acá.
      return Array.isArray(data) ? data : (data.value || []);
    }
  };

  /* -------- API pública -------- */
  return {

    /** Devuelve true si estamos hablando con SharePoint. */
    isRemote() { return cfg.STORAGE_MODE === 'powerautomate'; },

    /** Guarda un nuevo voto. Devuelve Promise. */
    async submitVote({ voter, nominee, justification }) {
      const vote = {
        id: uid(),
        voter: voter.trim(),
        nominee: nominee.trim(),
        justification: justification.trim(),
        timestamp: nowISO()
      };
      if (this.isRemote()) {
        await remote.submit(vote);
        // Cacheamos también local para que el votante vea al instante.
        local.push(vote);
      } else {
        await local.push(vote);
      }
      return vote;
    },

    /** Devuelve todos los votos. Promise. */
    async getVotes() {
      if (this.isRemote()) {
        try { return await remote.getAll(); }
        catch (e) {
          console.warn('Fallback a local:', e.message);
          return local.getAll();
        }
      }
      return local.getAll();
    },

    /** Solo modo local — para limpiar la caché del navegador. */
    clearLocal() { local.clear(); },

    /* ----- IMPORT / EXPORT JSON ----- */

    /** Descarga todos los votos locales como JSON. */
    exportJSON() {
      const votes = local.getAll();
      const blob = new Blob([JSON.stringify(votes, null, 2)],
        { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recognition_votes_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },

    /** Importa un archivo JSON exportado por otro navegador.
     *  Hace merge por id (no duplica). */
    importJSON(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const incoming = JSON.parse(e.target.result);
            if (!Array.isArray(incoming)) throw new Error('Formato inválido.');
            const current = local.getAll();
            const seen = new Set(current.map(v => v.id));
            let added = 0;
            incoming.forEach(v => {
              if (v && v.id && !seen.has(v.id)) {
                current.push(v); seen.add(v.id); added++;
              }
            });
            local.saveAll(current);
            resolve({ added, total: current.length });
          } catch (err) { reject(err); }
        };
        reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
        reader.readAsText(file);
      });
    }
  };
})();

window.DataLayer = DataLayer;
