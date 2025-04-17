/** Core state variables */
let currentImage = null
let currentVideo = null
let currentVideoFile = null
let videoFrames = []
let asciiFrames = []
let currentFrameIndex = 0
let totalFrames = 0
let isVideoLoaded = false
let isPlaying = false
let animationInterval = null
let settingsChangedWhilePaused = false
let settingsChangedWhilePlaying = false
let lastSettingsChangeTime = 0
let frameRegenerationDebounceTime = 500 // ms
const BASE_FONT_SIZE = 7

/**
 * Clamps a value within a specified range.
 * @param {number} value - Value to clamp.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {number} - Clamped value.
 */
function clamp (value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/**
 * Generates ASCII art and displays it.
 * @param {Image} img - The input image.
 */
function generateASCII (img) {
  const edgeMethod = document.getElementById('edgeMethod').value
  let ascii
  if (edgeMethod === 'dog') {
    ascii = generateContourASCII(img)
  } else {
    ascii = generateASCIIForFrame(img)
  }
  document.getElementById('ascii-art').textContent = ascii
}

/**
 * Downloads the ASCII art as a PNG image.
 */
function downloadPNG () {
  const preElement = document.getElementById('ascii-art')
  const asciiText = preElement.textContent
  if (!asciiText.trim()) {
    showNotification('No ASCII art to download')

    return
  }

  // Splits the ASCII art into lines
  const lines = asciiText.split('\n')

  // Creates a high-resolution canvas
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha: false })

  // Using a higher base font size for better resolution
  const scaleFactor = 4
  const fontSize = BASE_FONT_SIZE * scaleFactor

  // Sets font with better quality
  ctx.font = `bold ${fontSize}px "Courier New", monospace`
  ctx.textRendering = 'geometricPrecision'

  // Measures character dimensions
  const metrics = ctx.measureText('M')
  const charWidth = metrics.width
  const charHeight = fontSize * 1.2

  // Calculates canvas dimensions
  const maxLineLength = Math.max(...lines.map(line => line.length))
  canvas.width = maxLineLength * charWidth
  canvas.height = lines.length * charHeight

  // Apply high-DPI settings if available
  if (window.devicePixelRatio > 1) {
    const dpr = window.devicePixelRatio
    canvas.width *= dpr
    canvas.height *= dpr
    ctx.scale(dpr, dpr)
  }

  // Sets background color based on theme
  const isDarkTheme = document.getElementById('theme').value === 'dark'
  ctx.fillStyle = isDarkTheme ? '#000000' : '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Configures text rendering
  ctx.font = `bold ${fontSize}px "Courier New", monospace`
  ctx.textBaseline = 'top'
  ctx.fillStyle = isDarkTheme ? '#ffffff' : '#000000'
  ctx.imageSmoothingEnabled = false

  // Draw each line of text
  lines.forEach((line, index) => {
    ctx.fillText(line, 0, index * charHeight)
  })

  // Create download link
  const link = document.createElement('a')
  link.download = 'ascii-art.png'
  link.href = canvas.toDataURL('image/png', 1.0)
  link.click()
  showNotification('High-resolution PNG downloaded successfully')
}
