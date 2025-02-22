type PixelateImageOptions = {
  size?: number
  colors?: number
}

export function pixelateImage(_imageData: ImageData, _options: PixelateImageOptions = {}) {
  let imageData = _imageData
  const options = {
    ..._options,
    size: 16,
    colors: 16,
  }

  // Remove white-ish pixels into 0 alpha before quantizing.
  for (let i = 0; i < imageData.data.length; i += 4) {
    const [r, g, b] = imageData.data.slice(i, i + 3)
    if (isWhiteish(r, g, b)) imageData.data[i + 3] = 0
  }

  // Quantize, reduce the number of colors used.
  const factor = Math.floor(256 / Math.sqrt(options.colors))
  for (let i = 0; i < imageData.data.length; i += 4) {
    const [r, g, b] = imageData.data.slice(i, i + 3)
    imageData.data[i] = Math.floor(r / factor) * factor
    imageData.data[i + 1] = Math.floor(g / factor) * factor
    imageData.data[i + 2] = Math.floor(b / factor) * factor
  }

  // Enhance contrast by adjusting color intensity.
  const contrast = 1.025
  for (let i = 0; i < imageData.data.length; i += 4) {
    imageData.data[i] = Math.min(imageData.data[i] * contrast, 255) // Red
    imageData.data[i + 1] = Math.min(imageData.data[i + 1] * contrast, 255) // Green
    imageData.data[i + 2] = Math.min(imageData.data[i + 2] * contrast, 255) // Blue
  }

  // Pixelate.
  const {width, height} = imageData
  const {canvas: imageCanvas, context: imageCanvasCtx} = makeCanvas(width, height)
  imageCanvasCtx.putImageData(imageData, 0, 0)

  const widthFactor = width > height ? 1.75 : 1
  const widthScale = (options.size * widthFactor) / width
  const heightScale = options.size / height
  const scale = Math.min(widthScale, heightScale)
  const scaledWidth = Math.ceil(width * scale)
  const scaledHeight = Math.ceil(height * scale)

  const {context: scaledCtx} = makeCanvas(scaledWidth, scaledHeight)
  scaledCtx.clearRect(0, 0, scaledWidth, scaledHeight)
  scaledCtx.drawImage(
    imageCanvas,
    0,
    0,
    imageData.width,
    imageData.height,
    0,
    0,
    scaledWidth,
    scaledHeight,
  )
  imageData = scaledCtx.getImageData(0, 0, scaledWidth, scaledHeight)

  // Remove faint pixels.
  for (let i = 0; i < imageData.data.length; i += 4) {
    const a = imageData.data[i + 3]
    imageData.data[i + 3] = a > 254 ? a : 0
  }

  return imageData
}

function makeCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas')
  canvas.style.background = '#fff'
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')!
  return {canvas, context}
}

function isWhiteish(r: number, g: number, b: number, threshold = 245, tolerance = 50) {
  const avg = (r + g + b) / 3
  return avg > threshold && Math.max(r, g, b) - Math.min(r, g, b) <= tolerance
}
