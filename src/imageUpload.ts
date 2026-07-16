const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const TARGET_DATA_URL_LENGTH = 220_000;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('That image could not be opened.'));
    image.src = url;
  });
}

async function createStoredCover(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image file.');
  if (file.size > MAX_SOURCE_BYTES) throw new Error('That image is too large. Choose one under 20 MB.');

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const sourceWidth = image.naturalWidth || image.width;
    const sourceHeight = image.naturalHeight || image.height;
    if (!sourceWidth || !sourceHeight) throw new Error('That image has no usable dimensions.');

    let scale = Math.min(1, 720 / sourceWidth, 1080 / sourceHeight);
    let result = '';
    const qualities = [0.82, 0.72, 0.62, 0.54];

    for (let sizeAttempt = 0; sizeAttempt < 3; sizeAttempt += 1) {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Image editing is unavailable in this browser.');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of qualities) {
        result = canvas.toDataURL('image/jpeg', quality);
        if (result.length <= TARGET_DATA_URL_LENGTH) return result;
      }
      scale *= 0.8;
    }

    return result;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function chooseCoverImage(): Promise<string | undefined> {
  if (typeof document === 'undefined') {
    return Promise.reject(new Error('Image upload is available in the web app.'));
  }

  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    let settled = false;

    const finish = (value?: string, error?: unknown) => {
      if (settled) return;
      settled = true;
      input.remove();
      if (error) reject(error);
      else resolve(value);
    };

    input.addEventListener('cancel', () => finish(), { once: true });
    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) {
        finish();
        return;
      }
      try {
        finish(await createStoredCover(file));
      } catch (error) {
        finish(undefined, error);
      }
    }, { once: true });

    document.body.appendChild(input);
    input.click();
  });
}
