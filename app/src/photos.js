// Photo loading: everything is read on the visitor's own machine — files come from a
// file picker or a drop and are held as object URLs; the two built-in samples ship
// with the app so it works the moment it opens. Nothing is ever uploaded.

let nextPhotoId = 1;

export function photoFromImage(img, name, url) {
  return {
    id: nextPhotoId++,
    name,
    url,
    img,
    width: img.naturalWidth,
    height: img.naturalHeight,
  };
}

export function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load image ${src}`));
    img.src = src;
  });
}

export async function loadSamplePhotos() {
  const boulevard = await loadImageElement('samples/boulevard.jpg');
  const pier = await loadImageElement('samples/pier.jpg');
  return [
    photoFromImage(boulevard, 'Boulevard (sample)', 'samples/boulevard.jpg'),
    photoFromImage(pier, 'Pier (sample)', 'samples/pier.jpg'),
  ];
}

export async function loadPhotoFiles(fileList) {
  const photos = [];
  for (const file of fileList) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImageElement(url);
      photos.push(photoFromImage(img, file.name, url));
    } catch {
      URL.revokeObjectURL(url);
    }
  }
  return photos;
}
