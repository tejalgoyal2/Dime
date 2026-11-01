/**
 * Shrinks a photo in the browser before upload: longest side 1600px, JPEG.
 * A 4 MB phone photo becomes a few hundred KB, which uploads fast and is
 * still sharp enough to read a receipt. Respects the camera's rotation.
 */
export async function shrinkPhoto(file: Blob, max = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * k);
  canvas.height = Math.round(bitmap.height * k);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo"))), "image/jpeg", 0.85));
}
