/**
 * Generates the animation viewer HTML.
 * @param {string} title - The title.
 * @returns {string} - The HTML content.
 */
function generateViewerHTML (title) {
  const isDarkTheme = document.getElementById('theme').value === 'dark'
  const fontSize = document.getElementById('zoom').value
  const fps = parseInt(document.getElementById('playbackSpeed').value, 10)
  const previewElement = document.getElementById('ascii-art')
  const computedStyle = window.getComputedStyle(previewElement)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
     html, body {
       margin: 0;
       padding: 0;
       height: 100%;
     }
     body {
       background: ${isDarkTheme ? '#000' : '#fff'};
       color: ${isDarkTheme ? '#fff' : '#000'};
       font-family: monospace;
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       padding: 20px;
       box-sizing: border-box;
     }
     #ascii-container {
       display: flex;
       flex-direction: column;
       align-items: center;
       justify-content: center;
       gap: 20px;
       width: 100%;
       max-width: 1200px;
     }
     
     @media (max-width: 768px) {
       #ascii-art {
         font-size: ${Math.max(parseInt(fontSize) * 0.8, 50)}%;
         padding: 10px;
       }
       .controls {
         gap: 10px;
       }
       button {
         padding: 6px 12px;
         font-size: 12px;
       }
     }
     
     @media (min-width: 1200px) {
       #ascii-art {
         font-size: ${Math.min(parseInt(fontSize) * 1.2, 200)}%;
       }
     }
     #ascii-art {
       font-family: "Courier New", monospace;
       font-size: ${fontSize}%;
       white-space: pre;
       line-height: 1;
       background-color: ${isDarkTheme ? '#000' : '#fff'};
       color: ${isDarkTheme ? '#fff' : '#000'};
       padding: 20px;
       border: 1px solid ${isDarkTheme ? '#333' : '#ccc'};
       margin: 0 auto;
       text-align: center;
       max-width: 100%;
       overflow-x: auto;
     }
    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: center;
      margin-top: 10px;
    }
    .controls {
      display: flex;
      gap: 20px;
      align-items: center;
      justify-content: center;
      margin: 20px 0;
      width: 100%;
    }
    button {
      background-color: ${isDarkTheme ? '#333' : '#eee'};
      color: ${isDarkTheme ? '#fff' : '#000'};
      border: 1px solid ${isDarkTheme ? '#555' : '#ccc'};
      padding: 8px 16px;
      cursor: pointer;
      font-size: 14px;
      font-family: monospace;
      text-transform: uppercase;
      border-radius: 4px;
    }
    button:hover {
      background-color: ${isDarkTheme ? '#444' : '#ddd'};
    }
    #playBtn {
      min-width: 80px;
    }
  </style>
</head>
<body>
  <div id="ascii-container">
    <pre id="ascii-art"></pre>
    <div class="controls">
      <button id="playBtn">Play</button>
    </div>
    <div class="footer" style="margin-top: 20px; font-size: 12px;">
      <a href="https://gx2-studio.com" target="_blank" style="color: ${isDarkTheme ? '#aaa' : '#666'}; text-decoration: none;">Made with ASCIImotion by Gx2 Studio</a>
    </div>
  </div>
  <script src="animation.js"></script>
  <script>
    let isPlaying = false;
    let currentFrame = 0;
    let animationInterval;
    let fps = ${fps};

    const asciiArt = document.getElementById('ascii-art');
    const playBtn = document.getElementById('playBtn');

    function displayFrame(index) {
      asciiArt.textContent = frames[index];
    }

    function togglePlayback() {
      if (isPlaying) {
        clearInterval(animationInterval);
        playBtn.textContent = 'Play';
      } else {
        animationInterval = setInterval(() => {
          currentFrame = (currentFrame + 1) % frames.length;
          displayFrame(currentFrame);
        }, 1000 / fps);
        playBtn.textContent = 'Pause';
      }
      isPlaying = !isPlaying;
    }

    playBtn.addEventListener('click', togglePlayback);

    if (frames.length > 0) {
      displayFrame(0);
    }
  </script>
</body>
</html>`
}

/**
 * Generates the animation frames JavaScript file.
 * @param {string[]} frames - The animation frames.
 * @returns {string} - The JavaScript content.
 */
function generateFramesJS (frames) {
  return `const frames = ${JSON.stringify(frames, null, 2)};`
}

/**
 * Exports the animation as a video.
 * @returns {Promise<void>}
 */
async function exportVideo () {
  const currentFrameIdx = currentFrameIndex
  const capturedFrames = []
  const previewElement = document.getElementById('ascii-art')
  const wasPlaying = isPlaying
  if (isPlaying) {
    clearInterval(animationInterval)
    isPlaying = false
  }

  if (settingsChangedWhilePaused) {
    await processAllFrames()
    settingsChangedWhilePaused = false
  }

  for (let i = 0; i < asciiFrames.length; i++) {
    displayFrame(i)
    const frameContent = previewElement.textContent
    capturedFrames.push(frameContent)
    await new Promise(resolve => setTimeout(resolve, 10))
  }
  displayFrame(currentFrameIdx)
  if (wasPlaying) {
    togglePlayback()
  }

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d', { alpha: false })

  canvas.width = 3840
  canvas.height = 2160
  const isDarkTheme = document.getElementById('theme').value === 'dark'
  const sampleFrame = capturedFrames[0]
  const lines = sampleFrame.split('\n')
  const lineCount = lines.length
  const maxLineLength = Math.max(...lines.map(line => line.length))
  const fontSize = Math.min(canvas.height / lineCount, canvas.width / (maxLineLength * 0.6))

  ctx.font = `bold ${fontSize}px "Courier New", monospace`
  ctx.textBaseline = 'top'
  ctx.textRendering = 'geometricPrecision'
  ctx.imageSmoothingEnabled = false
  const textWidth = maxLineLength * fontSize * 0.6
  const textHeight = lineCount * fontSize
  const x = (canvas.width - textWidth) / 2
  const y = (canvas.height - textHeight) / 2
  const progressBar = document.querySelector('.progress-fill')
  const progressText = document.querySelector('.progress-text')
  document.getElementById('exportProgress').style.display = 'block'

  // Use MP4 format if supported, otherwise WebM
  const stream = canvas.captureStream()

  let mimeType = 'video/mp4'
  let fileExtension = 'mp4'

  if (!MediaRecorder.isTypeSupported('video/mp4')) {
    mimeType = 'video/webm'
    fileExtension = 'webm'
    console.log('MP4 recording not supported by this shit browser, falling back to WebM')
  }
  const recorder = new MediaRecorder(stream, {
    mimeType: mimeType,
    videoBitsPerSecond: 24000000
  })

  const chunks = []
  recorder.ondataavailable = e => chunks.push(e.data)
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ascii-animation-4k.${fileExtension}`
    link.click()
    URL.revokeObjectURL(url)
    document.getElementById('exportProgress').style.display = 'none'
    progressBar.style.width = '0%'

    const formatName = fileExtension.toUpperCase()
    showNotification(`${formatName} video exported successfully`)
  }
  recorder.start(1000)
  const fps = parseInt(document.getElementById('playbackSpeed').value, 10)
  const frameTime = 1000 / fps
  const totalFrames = capturedFrames.length
  let currentFrame = 0
  let lastFrameTime = 0
  const renderFrame = async timestamp => {
    if (!lastFrameTime) {
      lastFrameTime = timestamp
    }
    const elapsed = timestamp - lastFrameTime
    if (elapsed >= frameTime) {
      const progress = Math.round((currentFrame / totalFrames) * 100)
      progressBar.style.width = `${progress}%`
      progressText.textContent = `Rendering: ${progress}%`
      const asciiArt = capturedFrames[currentFrame]
      const lines = asciiArt.split('\n')
      ctx.fillStyle = isDarkTheme ? '#000000' : '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = isDarkTheme ? '#ffffff' : '#000000'
      lines.forEach((line, i) => {
        ctx.fillText(line, x, y + i * fontSize)
      })
      currentFrame++
      lastFrameTime = timestamp
    }

    if (currentFrame < totalFrames) {
      requestAnimationFrame(renderFrame)
    } else {
      progressBar.style.width = '100%'
      progressText.textContent = 'Rendering: 100%'
      await new Promise(resolve => setTimeout(resolve, 100))
      recorder.stop()
    }
  }

  requestAnimationFrame(renderFrame)
}

/**
 * Exports the animation as HTML and JS files.
 */
function exportAnimation () {
  if (settingsChangedWhilePaused) {
    showNotification('Regenerating frames before export...')

    processAllFrames().then(() => {
      exportAnimationFiles()
    })
  } else {
    exportAnimationFiles()
  }
}

/**
 * Loads the JSZip library dynamically.
 * @returns {Promise<any>} - Promise that resolves with the JSZip instance.
 */
function loadJSZip () {
  return new Promise((resolve, reject) => {
    if (window.JSZip) {
      resolve(window.JSZip)

      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
    script.integrity =
      'sha512-XMVd28F1oH/O71fzwBnV7HucLxVwtxf26XV8P4wPk26EDxuGZ91N8bsOttmnomcCD3CS5ZMRL50H0GgOHvegtg=='
    script.crossOrigin = 'anonymous'
    script.referrerPolicy = 'no-referrer'
    script.onload = () => resolve(window.JSZip)
    script.onerror = () => reject(new Error('Failed to load JSZip'))
    document.head.appendChild(script)
  })
}

/**
 * Exports the animation files as a ZIP archive.
 */
function exportAnimationFiles () {
  const progressBar = document.querySelector('.progress-fill')
  const progressText = document.querySelector('.progress-text')
  document.getElementById('exportProgress').style.display = 'block'
  progressBar.style.width = '25%'
  progressText.textContent = 'Preparing export...'

  loadJSZip()
    .then(JSZip => {
      const zip = new JSZip()

      progressBar.style.width = '50%'
      progressText.textContent = 'Creating files...'

      const htmlContent = generateViewerHTML('ASCII Animation')
      zip.file('ascii-animation.html', htmlContent)

      const jsContent = generateFramesJS(asciiFrames)
      zip.file('animation.js', jsContent)

      progressBar.style.width = '75%'
      progressText.textContent = 'Generating ZIP file...'

      return zip.generateAsync({ type: 'blob' })
    })
    .then(zipBlob => {
      progressBar.style.width = '100%'
      progressText.textContent = 'Download ready'

      const url = URL.createObjectURL(zipBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'ASCIImotion-animation.zip'

      setTimeout(() => {
        link.click()

        // Clean up
        URL.revokeObjectURL(url)
        document.getElementById('exportProgress').style.display = 'none'
        progressBar.style.width = '0%'
        showNotification('Animation exported as ZIP successfully')
      }, 500)
    })
    .catch(error => {
      console.error('Error creating ZIP file:', error)
      document.getElementById('exportProgress').style.display = 'none'
      showNotification('Failed to create ZIP file. Check console for details.')
    })
}
