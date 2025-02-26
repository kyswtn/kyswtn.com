async function readFileAsDataURL(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.addEventListener('load', (e) => resolve(e.target?.result as string))
    reader.readAsDataURL(file)
  })
}

async function loadImageFromFile(file: File) {
  const img = new Image()
  img.src = await readFileAsDataURL(file)
  return new Promise<typeof img>((resolve) => {
    img.addEventListener('load', () => resolve(img))
  })
}

export async function getImageDataFromFile(file: File, background = '#fff') {
  const img = await loadImageFromFile(file)

  const canvas = document.createElement('canvas')
  canvas.style.background = background
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')!

  ctx.drawImage(img, 0, 0, img.width, img.height)
  const imageData = ctx.getImageData(0, 0, img.width, img.height)
  return imageData
}
