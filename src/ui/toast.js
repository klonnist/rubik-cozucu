export function createToaster(container) {
  return function showToast(message, type = 'info', durationMs = 4500) {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    const timer = setTimeout(() => remove(), durationMs);
    function remove() {
      clearTimeout(timer);
      el.style.transition = 'opacity 0.25s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }
    el.addEventListener('click', remove);
    return remove;
  };
}
