/* ============================================================
   AUTH — Recognition Points
   Login simple. Como acordamos, contraseña en código.
   No es seguro contra alguien que abra el HTML, sirve solo
   para evitar que cualquier persona casual entre al dashboard.
   ============================================================ */

const Auth = (() => {

  const SESSION_KEY = 'rcg_admin_session';
  const SESSION_TTL_MS = 1000 * 60 * 60 * 4; // 4 horas

  function login(username, password) {
    const cfg = window.APP_CONFIG.ADMIN;
    if (username === cfg.USERNAME && password === cfg.PASSWORD) {
      const session = {
        user: username,
        loggedAt: Date.now(),
        expiresAt: Date.now() + SESSION_TTL_MS
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      return { ok: true };
    }
    return { ok: false, error: 'Credenciales incorrectas.' };
  }

  function logout() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function getSession() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const s = JSON.parse(raw);
      if (s.expiresAt < Date.now()) { logout(); return null; }
      return s;
    } catch { return null; }
  }

  function isLoggedIn() {
    return !!getSession();
  }

  return { login, logout, getSession, isLoggedIn };
})();

window.Auth = Auth;
