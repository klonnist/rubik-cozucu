const STORAGE_KEY = 'rubik-tema';

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* localStorage kullanılamıyor (gizli sekme vb.); tema tercihi kalıcı olmaz. */
  }
}

export function initTheme(toggleBtn) {
  const stored = safeGet(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') {
    document.documentElement.setAttribute('data-theme', stored);
  }

  toggleBtn.addEventListener('click', () => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = document.documentElement.getAttribute('data-theme') || (prefersDark ? 'dark' : 'light');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    safeSet(STORAGE_KEY, next);
  });
}
