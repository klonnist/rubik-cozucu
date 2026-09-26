const PARTICLE_COLORS = ['#f4f4f4', '#ffd500', '#00a651', '#0057b8', '#c8102e', '#ff6a13'];

export function celebrate(container) {
  const count = 26;
  for (let i = 0; i < count; i++) {
    const particle = document.createElement('span');
    const size = 6 + Math.random() * 6;
    const startX = 45 + Math.random() * 10;
    const drift = (Math.random() - 0.5) * 70;
    const duration = 900 + Math.random() * 700;
    const delay = Math.random() * 150;
    particle.style.cssText = `
      position:absolute; left:${startX}%; top:40%;
      width:${size}px; height:${size}px;
      background:${PARTICLE_COLORS[i % PARTICLE_COLORS.length]};
      border-radius:${Math.random() > 0.5 ? '50%' : '3px'};
      opacity:0.95;
      transform: translate(0,0) rotate(0deg);
      animation: kutlama-parcacik ${duration}ms cubic-bezier(0.2,0.7,0.3,1) ${delay}ms forwards;
      --drift: ${drift}px;
    `;
    container.appendChild(particle);
    setTimeout(() => particle.remove(), duration + delay + 100);
  }
}

if (!document.getElementById('kutlama-keyframes')) {
  const style = document.createElement('style');
  style.id = 'kutlama-keyframes';
  style.textContent = `
    @keyframes kutlama-parcacik {
      0% { transform: translate(0,0) rotate(0deg); opacity: 0.95; }
      100% { transform: translate(var(--drift), -160px) rotate(340deg); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}
