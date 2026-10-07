/** A phone photo shrunk for upload: longest side ≤ `max` px, JPEG. Keeps the request small (and fast on box Wi-Fi)
 *  while staying sharp enough to read a whiteboard. Orientation from the camera is applied by createImageBitmap. */
export async function shrinkPhoto(file: Blob, max = 1600): Promise<{ data: string; mediaType: 'image/jpeg' }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const url = canvas.toDataURL('image/jpeg', 0.82);
  return { data: url.slice(url.indexOf(',') + 1), mediaType: 'image/jpeg' };
}
