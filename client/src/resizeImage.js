// Shrinks a picture file to a 160x160 square (cut from the middle) and
// returns it as a data URL: the image written out as text, e.g.
// "data:image/jpeg;base64,/9j/4AAQ...". That is small enough (about 10 KB)
// to keep in the user's `image` column, so we need no file storage.
export function resizeImage(file, size = 160) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      // The biggest square that fits, centred
      const side = Math.min(img.width, img.height)
      const x = (img.width - side) / 2
      const y = (img.height - side) / 2
      canvas.getContext('2d').drawImage(img, x, y, side, side, 0, 0, size, size)
      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => reject(new Error('That file is not a picture we can read'))
    // A temporary local URL for the file, so <img> can load it
    img.src = URL.createObjectURL(file)
  })
}
