// Toast notification utility

export interface ToastOptions {
  duration?: number;
  id?: string;
  position?: 'top' | 'bottom';
  style?: 'default' | 'music';
}

/**
 * Show a toast notification
 */
export function showToast(message: string, options: ToastOptions = {}): void {
  const {
    duration = 3000,
    id = 'toast',
    position = 'top',
    style = 'default',
  } = options;

  // Remove existing toast with same id if any
  const existing = document.getElementById(id);
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = id;
  toast.innerHTML = message;

  const positionY = position === 'top' ? 'top: 80px;' : 'bottom: 80px;';

  let bgStyle = 'background: rgba(0, 0, 0, 0.85);';
  let extraStyle = '';

  if (style === 'music') {
    bgStyle = 'background: linear-gradient(135deg, rgba(74, 158, 255, 0.9), rgba(138, 43, 226, 0.9));';
    extraStyle = 'border: 1px solid rgba(255, 255, 255, 0.2);';
  }

  toast.style.cssText = `
    position: fixed;
    ${positionY}
    left: 50%;
    transform: translateX(-50%);
    ${bgStyle}
    ${extraStyle}
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-family: 'Press Start 2P', monospace;
    font-size: 12px;
    text-align: center;
    z-index: 1000;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  `;
  document.body.appendChild(toast);

  // Fade in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
  });

  // Fade out and remove
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/**
 * Show a music toast with track info
 */
export function showMusicToast(trackName: string, duration: number = 5000): void {
  // Parse artist and title if in "Artist - Title" format
  let displayHtml: string;

  if (trackName.includes(' - ')) {
    const [artist, title] = trackName.split(' - ', 2);
    displayHtml = `<div style="font-size: 10px; opacity: 0.8; margin-bottom: 4px;">Now Playing</div><div style="font-size: 14px; font-weight: bold;">${title}</div><div style="font-size: 11px; opacity: 0.9; margin-top: 4px;">${artist}</div>`;
  } else {
    displayHtml = `<div style="font-size: 10px; opacity: 0.8; margin-bottom: 4px;">Now Playing</div><div style="font-size: 14px; font-weight: bold;">${trackName}</div>`;
  }

  showToast(displayHtml, {
    duration,
    id: 'music-toast',
    position: 'bottom',
    style: 'music',
  });
}
