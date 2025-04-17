/**
 * Clamps a value within a specified range.
 * @param {number} value - Value to clamp.
 * @param {number} min - Minimum value.
 * @param {number} max - Maximum value.
 * @returns {number} - Clamped value.
 */
function clamp (value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * Applies Contrast Limited Adaptive Histogram Equalization (CLAHE) to a grayscale image.
 * @param {number[][]} gray2d - Grayscale image as a 2D array.
 * @param {number} tileSize - Tile size for local histogram equalization.
 * @param {number} clipLimit - Clipping limit for contrast enhancement.
 * @returns {number[][]} - Enhanced image.
 */
function applyCLAHE (gray2d, tileSize, clipLimit) {
  const height = gray2d.length
  const width = gray2d[0].length

  // Calculate number of tiles in x and y directions
  const numTilesY = Math.max(2, Math.floor(height / tileSize))
  const numTilesX = Math.max(2, Math.floor(width / tileSize))

  // Calculate actual tile sizes
  const tileSizeY = Math.floor(height / numTilesY)
  const tileSizeX = Math.floor(width / numTilesX)

  // Create result array
  const result = Array(height)
    .fill()
    .map(() => Array(width).fill(0))

  // Step 1: Calculate histograms for each tile
  const histograms = Array(numTilesY)
    .fill()
    .map(() =>
      Array(numTilesX)
        .fill()
        .map(() => Array(256).fill(0))
    )

  // Compute histograms for each tile
  for (let ty = 0; ty < numTilesY; ty++) {
    for (let tx = 0; tx < numTilesX; tx++) {
      const startY = ty * tileSizeY
      const endY = Math.min((ty + 1) * tileSizeY, height)
      const startX = tx * tileSizeX
      const endX = Math.min((tx + 1) * tileSizeX, width)

      // Compute histogram for this tile
      for (let y = startY; y < endY; y++) {
        for (let x = startX; x < endX; x++) {
          const pixelValue = Math.round(clamp(gray2d[y][x], 0, 255))
          histograms[ty][tx][pixelValue]++
        }
      }

      // Apply clip limit
      const numPixelsInTile = (endY - startY) * (endX - startX)
      const actualClipLimit = Math.max(1, Math.round((clipLimit * numPixelsInTile) / 256))

      // Count clipped pixels
      let clippedPixels = 0
      for (let i = 0; i < 256; i++) {
        if (histograms[ty][tx][i] > actualClipLimit) {
          clippedPixels += histograms[ty][tx][i] - actualClipLimit
          histograms[ty][tx][i] = actualClipLimit
        }
      }

      // Redistribute clipped pixels
      const redistributePerBin = Math.floor(clippedPixels / 256)
      let residual = clippedPixels - redistributePerBin * 256
      for (let i = 0; i < 256; i++) {
        histograms[ty][tx][i] += redistributePerBin

        // Distribute residual pixels evenly
        if (residual > 0) {
          histograms[ty][tx][i]++
          residual--
        }
      }

      // Create cumulative histogram (mapping function)
      let sum = 0
      for (let i = 0; i < 256; i++) {
        sum += histograms[ty][tx][i]
        histograms[ty][tx][i] = (sum * 255) / numPixelsInTile
      }
    }
  }

  // Step 2: Apply bilinear interpolation to eliminate artifacts at tile boundaries
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Determine which tiles this pixel belongs to or is between
      const ty = Math.min(numTilesY - 1, Math.floor(y / tileSizeY))
      const tx = Math.min(numTilesX - 1, Math.floor(x / tileSizeX))

      // Calculate normalized coordinates within the image (0 to 1)
      const normY = y / height
      const normX = x / width

      // Calculate normalized coordinates of tile centers
      const tileNormY = (ty + 0.5) / numTilesY
      const tileNormX = (tx + 0.5) / numTilesX

      // Get the pixel value
      const pixelValue = Math.round(clamp(gray2d[y][x], 0, 255))

      // For pixels at the image borders, just use the nearest tile's histogram
      if (ty === numTilesY - 1 && tx === numTilesX - 1) {
        // Bottom-right corner - use bottom-right tile
        result[y][x] = histograms[ty][tx][pixelValue]
      } else if (ty === numTilesY - 1) {
        // Bottom edge - interpolate horizontally between bottom tiles
        const rightWeight = (normX - tx / numTilesX) * numTilesX
        const leftWeight = 1 - rightWeight
        result[y][x] =
          leftWeight * histograms[ty][tx][pixelValue] +
          rightWeight * histograms[ty][Math.min(tx + 1, numTilesX - 1)][pixelValue]
      } else if (tx === numTilesX - 1) {
        // Right edge - interpolate vertically between right tiles
        const bottomWeight = (normY - ty / numTilesY) * numTilesY
        const topWeight = 1 - bottomWeight
        result[y][x] =
          topWeight * histograms[ty][tx][pixelValue] +
          bottomWeight * histograms[Math.min(ty + 1, numTilesY - 1)][tx][pixelValue]
      } else {
        // Interior pixel - bilinear interpolation between four surrounding tiles
        const rightWeight = (normX - tx / numTilesX) * numTilesX
        const leftWeight = 1 - rightWeight
        const bottomWeight = (normY - ty / numTilesY) * numTilesY
        const topWeight = 1 - bottomWeight
        const topLeft = histograms[ty][tx][pixelValue]
        const topRight = histograms[ty][tx + 1][pixelValue]
        const bottomLeft = histograms[ty + 1][tx][pixelValue]
        const bottomRight = histograms[ty + 1][tx + 1][pixelValue]
        result[y][x] =
          topWeight * (leftWeight * topLeft + rightWeight * topRight) +
          bottomWeight * (leftWeight * bottomLeft + rightWeight * bottomRight)
      }
    }
  }

  return result
}

/**
 * Generates ASCII art from a frame using CLAHE enhancement.
 * @param {Image} img - Input image.
 * @returns {string} - ASCII art representation.
 */
function generateCLAHEASCIIForFrame (img) {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const asciiWidth = parseInt(document.getElementById('asciiWidth').value, 10)
  const brightness = parseFloat(document.getElementById('brightness').value)
  const contrastValue = parseFloat(document.getElementById('contrast').value)
  const blurValue = parseFloat(document.getElementById('blur').value)
  const invertEnabled = document.getElementById('invert').checked
  const fontAspectRatio = 0.55
  const asciiHeight = Math.round((img.height / img.width) * asciiWidth * fontAspectRatio)

  // Get CLAHE parameters
  const tileSize = parseInt(document.getElementById('claheTileSize')?.value || '8', 10)
  const clipLimit = parseFloat(document.getElementById('claheClipLimit')?.value || '4.0')
  canvas.width = asciiWidth
  canvas.height = asciiHeight

  // Use blur filter if applicable
  ctx.filter = blurValue > 0 ? `blur(${blurValue}px)` : 'none'
  ctx.drawImage(img, 0, 0, asciiWidth, asciiHeight)
  const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight)
  const data = imageData.data
  let gray2d = []
  const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue))

  // Convert to 2D grayscale array
  for (let y = 0; y < asciiHeight; y++) {
    gray2d[y] = []
    for (let x = 0; x < asciiWidth; x++) {
      const idx = (y * asciiWidth + x) * 4
      let lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      if (invertEnabled) {
        lum = 255 - lum
      }
      lum = clamp(contrastFactor * (lum - 128) + 128 + brightness, 0, 255)
      gray2d[y][x] = lum
    }
  }

  // Apply CLAHE
  const enhanced = applyCLAHE(gray2d, tileSize, clipLimit)

  // Generate ASCII art from enhanced image
  const charset = document.getElementById('charset').value
  let gradient
  switch (charset) {
    case 'standard':
      gradient = '@%#*+=-:.'
      break
    case 'blocks':
      gradient = '█▓▒░ '
      break
    case 'binary':
      gradient = '01'
      break
    case 'manual':
      const manualChar = document.getElementById('manualCharInput').value || '0'
      gradient = manualChar + ' '
      break
    case 'hex':
      gradient = '0123456789ABCDEF'
      break
    case 'detailed':
    default:
      gradient = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'.'
      break
  }
  const nLevels = gradient.length
  const ignoreWhite = document.getElementById('ignoreWhite').checked
  const ignoreGreen = document.getElementById('ignoreGreen').checked

  // Function to check if a pixel is predominantly green (for green screen)
  const isGreenPixel = (r, g, b) => {
    const threshold = 1.4 // Green must be 40% more than red and blue

    return g > r * threshold && g > b * threshold && g > 100
  }

  let ascii = ''
  for (let y = 0; y < asciiHeight; y++) {
    let line = ''
    for (let x = 0; x < asciiWidth; x++) {
      const idx = (y * asciiWidth + x) * 4
      if (
        (ignoreWhite && gray2d[y][x] === 255) ||
        (ignoreGreen && isGreenPixel(data[idx], data[idx + 1], data[idx + 2]))
      ) {
        line += ' '
        continue
      }
      const computedLevel = Math.round((enhanced[y][x] / 255) * (nLevels - 1))
      line += gradient.charAt(computedLevel)
    }
    ascii += line + '\n'
  }

  return ascii
}

/**
 * Applies Gaussian blur to reduce image noise.
 * @param {number[][]} img - Input image.
 * @param {number} sigma - Standard deviation for the Gaussian kernel.
 * @returns {number[][]} - Blurred image.
 */
function applyGaussianBlur (img, sigma) {
  const kernelSize = Math.max(3, Math.ceil(sigma * 6))
  const kernel = gaussianKernel2D(sigma, kernelSize)

  return convolve2D(img, kernel)
}

/**
 * Applies double thresholding to find strong and weak edges.
 * @param {number[][]} img - Input image.
 * @param {number} lowThreshold - Lower threshold.
 * @param {number} highThreshold - Higher threshold.
 * @returns {number[][]} - Thresholded image.
 */
function doubleThreshold (img, lowThreshold, highThreshold) {
  const height = img.length
  const width = img[0].length
  const result = []

  // Initialize result array with zeros
  for (let y = 0; y < height; y++) {
    result[y] = []
    for (let x = 0; x < width; x++) {
      result[y][x] = 0
    }
  }

  // Apply double thresholding
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const val = img[y][x]
      if (val >= highThreshold) {
        // Strong edge
        result[y][x] = 2
      } else if (val >= lowThreshold) {
        // Weak edge
        result[y][x] = 1
      }
    }
  }

  return result
}

/**
 * Tracks edges by hysteresis to link weak and strong edges.
 * @param {number[][]} img - Input image.
 * @returns {number[][]} - Tracked edges.
 */
function edgeTrackingByHysteresis (img) {
  const height = img.length
  const width = img[0].length
  const result = []

  // Copy the input image
  for (let y = 0; y < height; y++) {
    result[y] = [...img[y]]
  }

  // Define 8-connected neighbors
  const dx = [-1, 0, 1, -1, 1, -1, 0, 1]
  const dy = [-1, -1, -1, 0, 0, 1, 1, 1]

  // Track edges using DFS
  function dfs (y, x) {
    // Mark current weak edge as strong
    result[y][x] = 2

    // Check all neighbors
    for (let i = 0; i < 8; i++) {
      const nx = x + dx[i]
      const ny = y + dy[i]

      // Check if neighbor is within bounds and is a weak edge
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && result[ny][nx] === 1) {
        dfs(ny, nx)
      }
    }
  }

  // Start DFS from all strong edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (result[y][x] === 2) {
        // For each strong edge, check its weak edge neighbors
        for (let i = 0; i < 8; i++) {
          const nx = x + dx[i]
          const ny = y + dy[i]
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && result[ny][nx] === 1) {
            dfs(ny, nx)
          }
        }
      }
    }
  }

  // Convert to binary image (only keep strong edges)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      result[y][x] = result[y][x] === 2 ? 255 : 0
    }
  }

  return result
}

/**
 * Applies Canny edge detection to a grayscale image.
 * @param {number[][]} gray2d - Input grayscale image.
 * @param {number} lowThreshold - Lower threshold.
 * @param {number} highThreshold - Higher threshold.
 * @param {number} sigma - Standard deviation for Gaussian kernel.
 * @returns {Object} - Edges and angle information.
 */
function applyCannyEdgeDetection (gray2d, lowThreshold, highThreshold, sigma) {
  // Step 1: Apply Gaussian blur to reduce noise
  const blurred = applyGaussianBlur(gray2d, sigma)

  // Step 2: Compute image gradients (magnitude and direction)
  const { mag, angle } = applySobel2D(blurred, blurred[0].length, blurred.length)

  // Step 3: Apply non-maximum suppression to thin edges
  const suppressed = nonMaxSuppression(mag, angle, blurred[0].length, blurred.length)

  // Step 4: Apply double thresholding to identify strong and weak edges
  const thresholded = doubleThreshold(suppressed, lowThreshold, highThreshold)

  // Step 5: Apply edge tracking by hysteresis to connect weak edges to strong edges
  const edges = edgeTrackingByHysteresis(thresholded)

  // Return both edges and angle for direction-based character selection
  return { edges, angle }
}

/**
 * Generates ASCII art from a frame using Canny edge detection.
 * @param {Image} img - Input image.
 * @returns {string} - ASCII art representation.
 */
function generateCannyASCIIForFrame (img) {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const asciiWidth = parseInt(document.getElementById('asciiWidth').value, 10)
  const brightness = parseFloat(document.getElementById('brightness').value)
  const contrastValue = parseFloat(document.getElementById('contrast').value)
  const blurValue = parseFloat(document.getElementById('blur').value)
  const invertEnabled = document.getElementById('invert').checked
  const fontAspectRatio = 0.55
  const asciiHeight = Math.round((img.height / img.width) * asciiWidth * fontAspectRatio)
  canvas.width = asciiWidth
  canvas.height = asciiHeight

  // Use blur filter if applicable
  ctx.filter = blurValue > 0 ? `blur(${blurValue}px)` : 'none'
  ctx.drawImage(img, 0, 0, asciiWidth, asciiHeight)
  const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight)
  const data = imageData.data
  let gray2d = []
  const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue))

  // Convert to 2D grayscale array
  for (let y = 0; y < asciiHeight; y++) {
    gray2d[y] = []
    for (let x = 0; x < asciiWidth; x++) {
      const idx = (y * asciiWidth + x) * 4
      let lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      if (invertEnabled) {
        lum = 255 - lum
      }
      lum = clamp(contrastFactor * (lum - 128) + 128 + brightness, 0, 255)
      gray2d[y][x] = lum
    }
  }

  // Get Canny parameters
  const lowThreshold = parseInt(document.getElementById('cannyLowThreshold').value, 10)
  const highThreshold = parseInt(document.getElementById('cannyHighThreshold').value, 10)
  const sigma = parseFloat(document.getElementById('cannySigma').value)

  // Apply Canny edge detection
  const { edges, angle } = applyCannyEdgeDetection(gray2d, lowThreshold, highThreshold, sigma)

  // Generate ASCII art from edges
  let ascii = ''
  for (let y = 0; y < asciiHeight; y++) {
    let line = ''
    for (let x = 0; x < asciiWidth; x++) {
      if (edges[y][x] > 0) {
        // For edges, use direction-based characters like in contour mode
        const theta = angle[y][x]
        let adjustedAngle = (theta + 90) % 180
        let edgeChar =
          adjustedAngle < 22.5 || adjustedAngle >= 157.5
            ? '-'
            : adjustedAngle < 67.5
              ? '/'
              : adjustedAngle < 112.5
                ? '|'
                : '\\'

        line += edgeChar
      } else {
        line += ' '
      }
    }
    ascii += line + '\n'
  }

  return ascii
}

/**
 * Generates a normalized 2D Gaussian kernel.
 * @param {number} sigma - Standard deviation.
 * @param {number} kernelSize - Size of the kernel.
 * @returns {number[][]} - Gaussian kernel.
 */
function gaussianKernel2D (sigma, kernelSize) {
  const kernel = []
  const half = Math.floor(kernelSize / 2)
  let sum = 0
  for (let y = -half; y <= half; y++) {
    const row = []
    for (let x = -half; x <= half; x++) {
      const value = Math.exp(-(x * x + y * y) / (2 * sigma * sigma))
      row.push(value)
      sum += value
    }
    kernel.push(row)
  }

  // Normalize the kernel.
  for (let y = 0; y < kernelSize; y++) {
    for (let x = 0; x < kernelSize; x++) {
      kernel[y][x] /= sum
    }
  }

  return kernel
}

/**
 * Convolves a 2D image with a 2D kernel.
 * @param {number[][]} img - Input image.
 * @param {number[][]} kernel - Convolution kernel.
 * @returns {number[][]} - Convolved image.
 */
function convolve2D (img, kernel) {
  const height = img.length,
    width = img[0].length

  const kernelSize = kernel.length,
    half = Math.floor(kernelSize / 2)

  const output = []
  for (let y = 0; y < height; y++) {
    output[y] = []
    for (let x = 0; x < width; x++) {
      let sum = 0
      for (let ky = 0; ky < kernelSize; ky++) {
        for (let kx = 0; kx < kernelSize; kx++) {
          const yy = y + ky - half
          const xx = x + kx - half
          let pixel = yy >= 0 && yy < height && xx >= 0 && xx < width ? img[yy][xx] : 0
          sum += pixel * kernel[ky][kx]
        }
      }
      output[y][x] = sum
    }
  }

  return output
}

/**
 * Computes the Difference of Gaussians on a 2D grayscale image.
 * @param {number[][]} gray - Input grayscale image.
 * @param {number} sigma1 - First standard deviation.
 * @param {number} sigma2 - Second standard deviation.
 * @param {number} kernelSize - Size of the kernel.
 * @returns {number[][]} - Difference of Gaussians.
 */
function differenceOfGaussians2D (gray, sigma1, sigma2, kernelSize) {
  const kernel1 = gaussianKernel2D(sigma1, kernelSize)
  const kernel2 = gaussianKernel2D(sigma2, kernelSize)
  const blurred1 = convolve2D(gray, kernel1)
  const blurred2 = convolve2D(gray, kernel2)
  const height = gray.length,
    width = gray[0].length

  const dog = []
  for (let y = 0; y < height; y++) {
    dog[y] = []
    for (let x = 0; x < width; x++) {
      dog[y][x] = blurred1[y][x] - blurred2[y][x]
    }
  }

  return dog
}

/**
 * Applies the Sobel operator to a 2D image.
 * @param {number[][]} img - Input image.
 * @param {number} width - Image width.
 * @param {number} height - Image height.
 * @returns {Object} - Gradient magnitude and angle arrays.
 */
function applySobel2D (img, width, height) {
  const mag = [],
    angle = []

  for (let y = 0; y < height; y++) {
    mag[y] = []
    angle[y] = []
    for (let x = 0; x < width; x++) {
      mag[y][x] = 0
      angle[y][x] = 0
    }
  }
  const kernelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ]

  const kernelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ]

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let Gx = 0,
        Gy = 0

      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const pixel = img[y + ky][x + kx]
          Gx += pixel * kernelX[ky + 1][kx + 1]
          Gy += pixel * kernelY[ky + 1][kx + 1]
        }
      }
      const g = Math.sqrt(Gx * Gx + Gy * Gy)
      mag[y][x] = g
      let theta = Math.atan2(Gy, Gx) * (180 / Math.PI)
      if (theta < 0) {
        theta += 180
      }
      angle[y][x] = theta
    }
  }

  return { mag, angle }
}

/**
 * Applies non-maximum suppression to thin edges.
 * @param {number[][]} mag - Gradient magnitude.
 * @param {number[][]} angle - Gradient angle.
 * @param {number} width - Image width.
 * @param {number} height - Image height.
 * @returns {number[][]} - Suppressed edges.
 */
function nonMaxSuppression (mag, angle, width, height) {
  const suppressed = []
  for (let y = 0; y < height; y++) {
    suppressed[y] = []
    for (let x = 0; x < width; x++) {
      suppressed[y][x] = 0
    }
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const currentMag = mag[y][x]
      let neighbor1 = 0,
        neighbor2 = 0

      const theta = angle[y][x]
      if ((theta >= 0 && theta < 22.5) || (theta >= 157.5 && theta <= 180)) {
        // 0° direction: compare left and right.
        neighbor1 = mag[y][x - 1]
        neighbor2 = mag[y][x + 1]
      } else if (theta >= 22.5 && theta < 67.5) {
        // 45° direction: compare top-right and bottom-left.
        neighbor1 = mag[y - 1][x + 1]
        neighbor2 = mag[y + 1][x - 1]
      } else if (theta >= 67.5 && theta < 112.5) {
        // 90° direction: compare top and bottom.
        neighbor1 = mag[y - 1][x]
        neighbor2 = mag[y + 1][x]
      } else if (theta >= 112.5 && theta < 157.5) {
        // 135° direction: compare top-left and bottom-right.
        neighbor1 = mag[y - 1][x - 1]
        neighbor2 = mag[y + 1][x + 1]
      }
      suppressed[y][x] = currentMag >= neighbor1 && currentMag >= neighbor2 ? currentMag : 0
    }
  }

  return suppressed
}

/**
 * Applies simple Sobel edge detection to a 1D grayscale array.
 * @param {number[]} gray - Grayscale array.
 * @param {number} width - Image width.
 * @param {number} height - Image height.
 * @param {number} threshold - Edge threshold.
 * @returns {number[]} - Edge detection result.
 */
function applyEdgeDetection (gray, width, height, threshold) {
  let edges = new Array(width * height).fill(255)
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let idx = y * width + x
      let a = gray[(y - 1) * width + (x - 1)]
      let b = gray[(y - 1) * width + x]
      let c = gray[(y - 1) * width + (x + 1)]
      let d = gray[y * width + (x - 1)]
      let e = gray[y * width + x]
      let f = gray[y * width + (x + 1)]
      let g = gray[(y + 1) * width + (x - 1)]
      let h = gray[(y + 1) * width + x]
      let i = gray[(y + 1) * width + (x + 1)]
      let Gx = -1 * a + 0 * b + 1 * c + -2 * d + 0 * e + 2 * f + -1 * g + 0 * h + 1 * i
      let Gy = -1 * a + -2 * b + -1 * c + 0 * d + 0 * e + 0 * f + 1 * g + 2 * h + 1 * i
      let magVal = Math.sqrt(Gx * Gx + Gy * Gy)
      let normalized = (magVal / 1442) * 255
      edges[idx] = normalized > threshold ? 0 : 255
    }
  }

  return edges
}

/**
 * Generates ASCII art for a given frame.
 * @param {Image} img - Input image.
 * @returns {string} - ASCII art representation.
 */
function generateASCIIForFrame (img) {
  const edgeMethod = document.getElementById('edgeMethod').value
  if (edgeMethod === 'dog') {
    return generateContourASCII(img)
  } else if (edgeMethod === 'canny') {
    return generateCannyASCIIForFrame(img)
  } else if (edgeMethod === 'clahe') {
    return generateCLAHEASCIIForFrame(img)
  } else if (edgeMethod === 'lbp') {
    return generateLBPASCIIForFrame(img)
  }
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const asciiWidth = parseInt(document.getElementById('asciiWidth').value, 10)
  const brightness = parseFloat(document.getElementById('brightness').value)
  const contrastValue = parseFloat(document.getElementById('contrast').value)
  const blurValue = parseFloat(document.getElementById('blur').value)
  const ditheringEnabled = document.getElementById('dithering').checked
  const ditherAlgorithm = document.getElementById('ditherAlgorithm').value
  const invertEnabled = document.getElementById('invert').checked
  const ignoreWhite = document.getElementById('ignoreWhite').checked
  const ignoreGreen = document.getElementById('ignoreGreen').checked
  const charset = document.getElementById('charset').value

  // Function to check if a pixel is predominantly green (for green screen)
  const isGreenPixel = (r, g, b) => {
    const threshold = 1.4

    return g > r * threshold && g > b * threshold && g > 100
  }

  // Select character set based on user choice
  let gradient
  switch (charset) {
    case 'standard':
      gradient = '@%#*+=-:.'
      break
    case 'blocks':
      gradient = '█▓▒░ '
      break
    case 'binary':
      gradient = '01'
      break
    case 'manual':
      const manualChar = document.getElementById('manualCharInput').value || '0'
      gradient = manualChar + ' '
      break
    case 'hex':
      gradient = '0123456789ABCDEF'
      break
    case 'detailed':
    default:
      gradient = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'.'
      break
  }
  const nLevels = gradient.length
  const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue))
  const fontAspectRatio = 0.55
  const asciiHeight = Math.round((img.height / img.width) * asciiWidth * fontAspectRatio)
  canvas.width = asciiWidth
  canvas.height = asciiHeight
  ctx.filter = blurValue > 0 ? `blur(${blurValue}px)` : 'none'
  ctx.drawImage(img, 0, 0, asciiWidth, asciiHeight)
  const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight)
  const data = imageData.data
  let gray = [],
    grayOriginal = []

  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    let lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
    if (invertEnabled) {
      lum = 255 - lum
    }
    let adjusted = clamp(contrastFactor * (lum - 128) + 128 + brightness, 0, 255)
    gray.push(adjusted)
    grayOriginal.push(adjusted)
  }
  let ascii = ''

  // Apply Sobel edge detection if selected
  if (edgeMethod === 'sobel') {
    const threshold = parseInt(document.getElementById('edgeThreshold').value, 10)
    gray = applyEdgeDetection(gray, asciiWidth, asciiHeight, threshold)
    for (let y = 0; y < asciiHeight; y++) {
      let line = ''
      for (let x = 0; x < asciiWidth; x++) {
        const idx = y * asciiWidth + x
        if (ignoreWhite && grayOriginal[idx] === 255) {
          line += ' '
          continue
        }
        const computedLevel = Math.round((gray[idx] / 255) * (nLevels - 1))
        line += gradient.charAt(computedLevel)
      }
      ascii += line + '\n'
    }
  }

  // Apply dithering if enabled
  else if (ditheringEnabled) {
    let grayClone = [...gray]

    // Floyd-Steinberg dithering
    if (ditherAlgorithm === 'floyd') {
      for (let y = 0; y < asciiHeight; y++) {
        let line = ''
        for (let x = 0; x < asciiWidth; x++) {
          const idx = y * asciiWidth + x
          const i = idx * 4
          if (
            (ignoreWhite && grayOriginal[idx] === 255) ||
            (ignoreGreen && isGreenPixel(data[i], data[i + 1], data[i + 2]))
          ) {
            line += ' '
            continue
          }
          let computedLevel = Math.round((grayClone[idx] / 255) * (nLevels - 1))
          line += gradient.charAt(computedLevel)
          const newPixel = (computedLevel / (nLevels - 1)) * 255
          const error = grayClone[idx] - newPixel

          // Distribute error to neighboring pixels
          if (x + 1 < asciiWidth) {
            grayClone[idx + 1] = clamp(grayClone[idx + 1] + error * (7 / 16), 0, 255)
          }

          if (x - 1 >= 0 && y + 1 < asciiHeight) {
            grayClone[idx - 1 + asciiWidth] = clamp(
              grayClone[idx - 1 + asciiWidth] + error * (3 / 16),
              0,
              255
            )
          }

          if (y + 1 < asciiHeight) {
            grayClone[idx + asciiWidth] = clamp(
              grayClone[idx + asciiWidth] + error * (5 / 16),
              0,
              255
            )
          }

          if (x + 1 < asciiWidth && y + 1 < asciiHeight) {
            grayClone[idx + asciiWidth + 1] = clamp(
              grayClone[idx + asciiWidth + 1] + error * (1 / 16),
              0,
              255
            )
          }
        }
        ascii += line + '\n'
      }
    }

    // Atkinson dithering
    else if (ditherAlgorithm === 'atkinson') {
      for (let y = 0; y < asciiHeight; y++) {
        let line = ''
        for (let x = 0; x < asciiWidth; x++) {
          const idx = y * asciiWidth + x
          const i = idx * 4
          if (
            (ignoreWhite && grayOriginal[idx] === 255) ||
            (ignoreGreen && isGreenPixel(data[i], data[i + 1], data[i + 2]))
          ) {
            line += ' '
            continue
          }
          let computedLevel = Math.round((grayClone[idx] / 255) * (nLevels - 1))
          line += gradient.charAt(computedLevel)
          const newPixel = (computedLevel / (nLevels - 1)) * 255
          const error = grayClone[idx] - newPixel
          const diffusion = error / 8

          // Distribute error to neighboring pixels (Atkinson pattern)
          if (x + 1 < asciiWidth) {
            grayClone[idx + 1] = clamp(grayClone[idx + 1] + diffusion, 0, 255)
          }

          if (x + 2 < asciiWidth) {
            grayClone[idx + 2] = clamp(grayClone[idx + 2] + diffusion, 0, 255)
          }

          if (y + 1 < asciiHeight) {
            if (x - 1 >= 0) {
              grayClone[idx - 1 + asciiWidth] = clamp(
                grayClone[idx - 1 + asciiWidth] + diffusion,
                0,
                255
              )
            }
            grayClone[idx + asciiWidth] = clamp(grayClone[idx + asciiWidth] + diffusion, 0, 255)
            if (x + 1 < asciiWidth) {
              grayClone[idx + asciiWidth + 1] = clamp(
                grayClone[idx + asciiWidth + 1] + diffusion,
                0,
                255
              )
            }
          }

          if (y + 2 < asciiHeight) {
            grayClone[idx + 2 * asciiWidth] = clamp(
              grayClone[idx + 2 * asciiWidth] + diffusion,
              0,
              255
            )
          }
        }
        ascii += line + '\n'
      }
    }

    // Noise dithering
    else if (ditherAlgorithm === 'noise') {
      for (let y = 0; y < asciiHeight; y++) {
        let line = ''
        for (let x = 0; x < asciiWidth; x++) {
          const idx = y * asciiWidth + x
          const i = idx * 4
          if (
            (ignoreWhite && grayOriginal[idx] === 255) ||
            (ignoreGreen && isGreenPixel(data[i], data[i + 1], data[i + 2]))
          ) {
            line += ' '
            continue
          }
          const noise = (Math.random() - 0.5) * (255 / nLevels)
          const noisyValue = clamp(grayClone[idx] + noise, 0, 255)
          let computedLevel = Math.round((noisyValue / 255) * (nLevels - 1))
          line += gradient.charAt(computedLevel)
        }
        ascii += line + '\n'
      }
    }

    // Ordered dithering
    else if (ditherAlgorithm === 'ordered') {
      const bayer = [
        [0, 8, 2, 10],
        [12, 4, 14, 6],
        [3, 11, 1, 9],
        [15, 7, 13, 5]
      ]

      const matrixSize = 4
      for (let y = 0; y < asciiHeight; y++) {
        let line = ''
        for (let x = 0; x < asciiWidth; x++) {
          const idx = y * asciiWidth + x
          const i = idx * 4
          if (
            (ignoreWhite && grayOriginal[idx] === 255) ||
            (ignoreGreen && isGreenPixel(data[i], data[i + 1], data[i + 2]))
          ) {
            line += ' '
            continue
          }
          const p = grayClone[idx] / 255
          const t = (bayer[y % matrixSize][x % matrixSize] + 0.5) / (matrixSize * matrixSize)
          let valueWithDither = p + t - 0.5
          valueWithDither = Math.min(Math.max(valueWithDither, 0), 1)
          let computedLevel = Math.floor(valueWithDither * nLevels)
          if (computedLevel >= nLevels) {
            computedLevel = nLevels - 1
          }
          line += gradient.charAt(computedLevel)
        }
        ascii += line + '\n'
      }
    }
  }

  // No special processing, just direct mapping
  else {
    for (let y = 0; y < asciiHeight; y++) {
      let line = ''
      for (let x = 0; x < asciiWidth; x++) {
        const idx = y * asciiWidth + x
        if (ignoreWhite && grayOriginal[idx] === 255) {
          line += ' '
          continue
        }
        const computedLevel = Math.round((gray[idx] / 255) * (nLevels - 1))
        line += gradient.charAt(computedLevel)
      }
      ascii += line + '\n'
    }
  }

  return ascii
}

/**
 * Generate ASCII art using Difference of Gaussians (DoG) for edge detection.
 * @param {Image} img - Input image
 * @returns {string} - ASCII art representation
 */
function generateContourASCII (img) {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const asciiWidth = parseInt(document.getElementById('asciiWidth').value, 10)
  const brightness = parseFloat(document.getElementById('brightness').value)
  const contrastValue = parseFloat(document.getElementById('contrast').value)
  const blurValue = parseFloat(document.getElementById('blur').value)
  const invertEnabled = document.getElementById('invert').checked
  const fontAspectRatio = 0.55
  const asciiHeight = Math.round((img.height / img.width) * asciiWidth * fontAspectRatio)
  canvas.width = asciiWidth
  canvas.height = asciiHeight
  ctx.filter = blurValue > 0 ? `blur(${blurValue}px)` : 'none'
  ctx.drawImage(img, 0, 0, asciiWidth, asciiHeight)
  const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight)
  const data = imageData.data
  let gray2d = []
  const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue))

  // Convert to 2D grayscale array
  for (let y = 0; y < asciiHeight; y++) {
    gray2d[y] = []
    for (let x = 0; x < asciiWidth; x++) {
      const idx = (y * asciiWidth + x) * 4
      let lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      if (invertEnabled) {
        lum = 255 - lum
      }
      lum = clamp(contrastFactor * (lum - 128) + 128 + brightness, 0, 255)
      gray2d[y][x] = lum
    }
  }

  // Get DoG parameters
  const sigma1 = parseFloat(document.getElementById('dogSigma1')?.value || '1.0')
  const sigma2 = parseFloat(document.getElementById('dogSigma2')?.value || '2.0')
  const dogThreshold = parseFloat(document.getElementById('dogThreshold')?.value || '10.0')
  const kernelSize = Math.max(3, Math.ceil(Math.max(sigma1, sigma2) * 6))

  // Apply Difference of Gaussians
  const dog = differenceOfGaussians2D(gray2d, sigma1, sigma2, kernelSize)

  // Calculate gradient directions for edge orientation
  const { mag, angle } = applySobel2D(dog, asciiWidth, asciiHeight)

  // Generate ASCII art from DoG edges
  let ascii = ''
  for (let y = 0; y < asciiHeight; y++) {
    let line = ''
    for (let x = 0; x < asciiWidth; x++) {
      if (Math.abs(dog[y][x]) > dogThreshold) {
        // For edges, use direction-based characters
        const theta = angle[y][x]
        let adjustedAngle = (theta + 90) % 180
        let edgeChar =
          adjustedAngle < 22.5 || adjustedAngle >= 157.5
            ? '-'
            : adjustedAngle < 67.5
              ? '/'
              : adjustedAngle < 112.5
                ? '|'
                : '\\'

        line += edgeChar
      } else {
        line += ' '
      }
    }
    ascii += line + '\n'
  }

  return ascii
}

/**
 * Generate ASCII art using Local Binary Pattern (LBP) for texture analysis.
 * @param {Image} img - Input image
 * @returns {string} - ASCII art representation
 */
function generateLBPASCIIForFrame (img) {
  const canvas = document.getElementById('canvas')
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const asciiWidth = parseInt(document.getElementById('asciiWidth').value, 10)
  const brightness = parseFloat(document.getElementById('brightness').value)
  const contrastValue = parseFloat(document.getElementById('contrast').value)
  const blurValue = parseFloat(document.getElementById('blur').value)
  const invertEnabled = document.getElementById('invert').checked
  const fontAspectRatio = 0.55
  const asciiHeight = Math.round((img.height / img.width) * asciiWidth * fontAspectRatio)
  canvas.width = asciiWidth
  canvas.height = asciiHeight
  ctx.filter = blurValue > 0 ? `blur(${blurValue}px)` : 'none'
  ctx.drawImage(img, 0, 0, asciiWidth, asciiHeight)
  const imageData = ctx.getImageData(0, 0, asciiWidth, asciiHeight)
  const data = imageData.data
  let gray2d = []
  const contrastFactor = (259 * (contrastValue + 255)) / (255 * (259 - contrastValue))

  // Convert to 2D grayscale array
  for (let y = 0; y < asciiHeight; y++) {
    gray2d[y] = []
    for (let x = 0; x < asciiWidth; x++) {
      const idx = (y * asciiWidth + x) * 4
      let lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      if (invertEnabled) {
        lum = 255 - lum
      }
      lum = clamp(contrastFactor * (lum - 128) + 128 + brightness, 0, 255)
      gray2d[y][x] = lum
    }
  }

  // Get LBP parameters
  const lbpThreshold = parseFloat(document.getElementById('lbpThreshold')?.value || '5.0')
  const lbpRadius = parseInt(document.getElementById('lbpRadius')?.value || '1', 10)
  const lbpNeighbors = parseInt(document.getElementById('lbpNeighbors')?.value || '8', 10)
  const useUniformPatterns = document.getElementById('lbpUniform')?.checked || false

  // Apply Local Binary Pattern
  const lbpImage = []
  for (let y = 0; y < asciiHeight; y++) {
    lbpImage[y] = []
    for (let x = 0; x < asciiWidth; x++) {
      lbpImage[y][x] = 0
    }
  }

  // Function to check if an LBP pattern is uniform (has at most 2 bitwise transitions)
  const isUniform = (pattern, neighbors) => {
    let transitions = 0
    const binaryStr = pattern.toString(2).padStart(neighbors, '0')
    const circularBinary = binaryStr + binaryStr[0]
    for (let i = 0; i < neighbors; i++) {
      if (circularBinary[i] !== circularBinary[i + 1]) {
        transitions++
      }
    }

    return transitions <= 2
  }

  // Calculate LBP values
  for (let y = lbpRadius; y < asciiHeight - lbpRadius; y++) {
    for (let x = lbpRadius; x < asciiWidth - lbpRadius; x++) {
      const centerValue = gray2d[y][x]
      let lbpValue = 0

      // Sample points in a circle around the center pixel
      const samplePoints = []
      for (let n = 0; n < lbpNeighbors; n++) {
        const angle = (2 * Math.PI * n) / lbpNeighbors

        // Use precise floating-point coordinates for better sampling
        const nx = x + lbpRadius * Math.cos(angle)
        const ny = y + lbpRadius * Math.sin(angle)

        // Bilinear interpolation for more accurate sampling
        const x0 = Math.floor(nx)
        const y0 = Math.floor(ny)
        const x1 = Math.ceil(nx)
        const y1 = Math.ceil(ny)
        const dx = nx - x0
        const dy = ny - y0
        let value = 0
        if (
          x0 >= 0 &&
          x0 < asciiWidth &&
          y0 >= 0 &&
          y0 < asciiHeight &&
          x1 >= 0 &&
          x1 < asciiWidth &&
          y1 >= 0 &&
          y1 < asciiHeight
        ) {
          const v00 = gray2d[y0][x0]
          const v01 = gray2d[y0][x1]
          const v10 = gray2d[y1][x0]
          const v11 = gray2d[y1][x1]
          value =
            (1 - dx) * (1 - dy) * v00 + dx * (1 - dy) * v01 + (1 - dx) * dy * v10 + dx * dy * v11
        } else if (x0 >= 0 && x0 < asciiWidth && y0 >= 0 && y0 < asciiHeight) {
          value = gray2d[y0][x0]
        }
        samplePoints.push(value)
      }

      for (let n = 0; n < lbpNeighbors; n++) {
        if (samplePoints[n] >= centerValue + lbpThreshold) {
          lbpValue |= 1 << n
        }
      }

      if (useUniformPatterns) {
        if (!isUniform(lbpValue, lbpNeighbors)) {
          lbpValue = lbpNeighbors * (lbpNeighbors - 1) + 2
        }
      }
      lbpImage[y][x] = lbpValue
    }
  }

  const charset = document.getElementById('charset').value
  let gradient
  switch (charset) {
    case 'standard':
      gradient = '@%#*+=-:.'
      break
    case 'blocks':
      gradient = '█▓▒░ '
      break
    case 'binary':
      gradient = '01'
      break
    case 'manual':
      const manualChar = document.getElementById('manualCharInput').value || '0'
      gradient = manualChar + ' '
      break
    case 'hex':
      gradient = '0123456789ABCDEF'
      break
    case 'detailed':
    default:
      gradient = '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,"^`\'.'
      break
  }
  const nLevels = gradient.length
  const maxLBPValue = Math.pow(2, lbpNeighbors) - 1
  let ascii = ''
  for (let y = 0; y < asciiHeight; y++) {
    let line = ''
    for (let x = 0; x < asciiWidth; x++) {
      if (
        y < lbpRadius ||
        y >= asciiHeight - lbpRadius ||
        x < lbpRadius ||
        x >= asciiWidth - lbpRadius
      ) {
        line += ' '
      } else {
        const lbpVal = lbpImage[y][x]

        const computedLevel = Math.round((lbpVal / maxLBPValue) * (nLevels - 1))
        line += gradient.charAt(computedLevel)
      }
    }
    ascii += line + '\n'
  }

  return ascii
}
