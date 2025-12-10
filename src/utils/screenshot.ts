// Screenshot utility - captures the game canvas and downloads as PNG

export function initScreenshotHandler(): void {
  document.addEventListener('keydown', (e) => {
    // Shift + P to take screenshot
    if (e.shiftKey && (e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      takeScreenshot();
    }
  });
}

export function takeScreenshot(): void {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    console.warn('No canvas found for screenshot');
    return;
  }

  try {
    // Get the canvas data as a PNG
    const dataUrl = canvas.toDataURL('image/png');

    // Create a download link
    const link = document.createElement('a');
    link.download = `screenshot-${getTimestamp()}.png`;
    link.href = dataUrl;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('Screenshot saved!');
  } catch (error) {
    console.error('Failed to take screenshot:', error);
  }
}

function getTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}
