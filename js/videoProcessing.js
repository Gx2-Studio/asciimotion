/**
 * Loads video metadata and updates the UI.
 * @param {File} videoFile - The video file.
 * @returns {Promise<{totalVideoFrames: number, videoDuration: number}>} - Video metadata.
 */
async function loadVideoMetadata (videoFile) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    const videoURL = URL.createObjectURL(videoFile)
    video.src = videoURL
    video.onloadedmetadata = function () {
      const videoDuration = video.duration
      const totalVideoFrames = Math.floor(videoDuration * 30)
      document.getElementById('frameCount').max = totalVideoFrames
      const recommendedFrames = Math.min(
        Math.max(Math.round(videoDuration * 24), 60),
        totalVideoFrames
      )

      document.getElementById('frameCount').value = recommendedFrames
      document.getElementById('frameCountVal').textContent = recommendedFrames
      URL.revokeObjectURL(videoURL)
      resolve({ totalVideoFrames, videoDuration })
    }
    video.onerror = reject
  })
}

/**
 * Extracts frames from a video.
 * @param {File} videoFile - The video file to extract frames from.
 * @param {number} frameCount - Number of frames to extract.
 * @returns {Promise<Image[]>} - Array of extracted frames.
 */
async function extractFramesFromVideo (videoFile, frameCount) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'auto'
    video.muted = true
    const videoURL = URL.createObjectURL(videoFile)
    video.src = videoURL
    video.onloadedmetadata = function () {
      const videoDuration = video.duration
      const totalVideoFrames = Math.floor(videoDuration * 30)
      const frameStep = totalVideoFrames / frameCount
      videoFrames = []
      asciiFrames = []
      totalFrames = frameCount
      const canvas = document.getElementById('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const extractFrame = time => {
        return new Promise(resolveFrame => {
          video.currentTime = time
          video.onseeked = () => {
            ctx.drawImage(video, 0, 0)
            const img = new Image()
            img.src = canvas.toDataURL('image/png')
            img.onload = () => {
              videoFrames.push(img)
              resolveFrame()
            }
          }
        })
      }

      const extractFrames = async () => {
        await extractFrame(0)
        for (let i = 1; i < frameCount; i++) {
          const framePosition = Math.min(i * frameStep, totalVideoFrames - 1)
          const time = (framePosition / totalVideoFrames) * videoDuration
          await extractFrame(time)
          document.getElementById('currentFrameDisplay').textContent = `Extracting: ${
            i + 1
          }/${frameCount}`
          const progressPercent = Math.round(((i + 1) / frameCount) * 100)
          const progressBar = document.getElementById('processProgress')
          if (progressBar) {
            progressBar.style.width = `${progressPercent}%`
          }
        }
        URL.revokeObjectURL(videoURL)
        if (videoFrames.length > 0) {
          const isInitialLoad = currentFrameIndex === undefined || asciiFrames.length === 0
          if (isInitialLoad) {
            currentFrameIndex = 0
          }
          await processAllFrames()
          currentImage = videoFrames[currentFrameIndex]
          displayFrame(currentFrameIndex)
        }
        resolve(videoFrames)
      }

      extractFrames().catch(reject)
    }
    video.onerror = reject
    currentVideo = video
  })
}

/**
 * Processes all frames and generates ASCII art for each.
 * @returns {Promise<void>}
 */
async function processAllFrames () {
  if (!isVideoLoaded || videoFrames.length === 0) {
    return
  }
  asciiFrames = []
  for (let i = 0; i < videoFrames.length; i++) {
    currentFrameIndex = i
    currentImage = videoFrames[i]
    document.getElementById('currentFrameDisplay').textContent = `Processing: ${i + 1}/${
      videoFrames.length
    }`
    document.getElementById('playAnimation').textContent = 'Processing...'
    const progressPercent = Math.round(((i + 1) / videoFrames.length) * 100)
    const progressBar = document.getElementById('processProgress')
    if (progressBar) {
      progressBar.style.width = `${progressPercent}%`
    }
    const asciiArt = generateASCIIForFrame(currentImage)
    asciiFrames.push(asciiArt)
    document.getElementById('ascii-art').textContent =
      `Converting frames to ASCII: ${progressPercent}%`
  }
  document.getElementById('playAnimation').textContent = 'Play'
  const progressContainer = document.getElementById('processProgressContainer')
  if (progressContainer) {
    progressContainer.style.display = 'none'
  }
  const playbackControls = document.querySelector('.playback-controls')
  if (playbackControls) {
    playbackControls.style.display = 'block'
  }
  const fpsControl = document.querySelector('.fps-control')
  if (fpsControl) {
    fpsControl.style.display = 'block'
  }
  displayFrame(currentFrameIndex)
}

/**
 * Navigates to the previous frame.
 */
function goToPreviousFrame () {
  if (!isVideoLoaded || videoFrames.length === 0) {
    return
  }

  if (settingsChangedWhilePaused) {
    processAllFrames().then(() => {
      settingsChangedWhilePaused = false
      currentFrameIndex = (currentFrameIndex - 1 + videoFrames.length) % videoFrames.length
      displayFrame(currentFrameIndex)
    })
  } else {
    currentFrameIndex = (currentFrameIndex - 1 + videoFrames.length) % videoFrames.length
    displayFrame(currentFrameIndex)
  }
}

/**
 * Navigates to the next frame.
 */
function goToNextFrame () {
  if (!isVideoLoaded || videoFrames.length === 0) {
    return
  }

  if (settingsChangedWhilePaused) {
    processAllFrames().then(() => {
      settingsChangedWhilePaused = false
      currentFrameIndex = (currentFrameIndex + 1) % videoFrames.length
      displayFrame(currentFrameIndex)
    })
  } else {
    currentFrameIndex = (currentFrameIndex + 1) % videoFrames.length
    displayFrame(currentFrameIndex)
  }
}

/**
 * Displays a specific frame.
 * @param {number} frameIndex - Index of the frame to display.
 */
function displayFrame (frameIndex) {
  if (!isVideoLoaded || videoFrames.length === 0) {
    return
  }
  document.getElementById('currentFrameDisplay').textContent = `${frameIndex + 1}/${
    videoFrames.length
  }`
  if (asciiFrames.length > frameIndex) {
    document.getElementById('ascii-art').textContent = asciiFrames[frameIndex]
  } else {
    currentImage = videoFrames[frameIndex]
    generateASCII(currentImage)
  }
}

/**
 * Toggles animation playback.
 */
function togglePlayback () {
  if (!isVideoLoaded || videoFrames.length === 0) {
    return
  }

  if (isPlaying) {
    clearInterval(animationInterval)
    isPlaying = false
    document.getElementById('playAnimation').textContent = 'Play'
  } else {
    const fps = parseInt(document.getElementById('playbackSpeed').value, 10)
    const frameDelay = 1000 / fps
    if (settingsChangedWhilePaused || asciiFrames.length < videoFrames.length) {
      const currentIndex = currentFrameIndex
      document.getElementById('currentFrameDisplay').textContent = 'Regenerating frames...'
      processAllFrames().then(() => {
        settingsChangedWhilePaused = false
        currentFrameIndex = currentIndex
        displayFrame(currentFrameIndex)
        startPlayback(frameDelay)
      })
    } else {
      startPlayback(frameDelay)
    }
  }
}

/**
 * Starts animation playback.
 * @param {number} frameDelay - Delay between frames in milliseconds.
 */
function startPlayback (frameDelay) {
  isPlaying = true
  document.getElementById('playAnimation').textContent = 'Pause'
  settingsChangedWhilePlaying = false
  animationInterval = setInterval(() => {
    if (
      settingsChangedWhilePlaying &&
      Date.now() - lastSettingsChangeTime > frameRegenerationDebounceTime
    ) {
      clearInterval(animationInterval)
      const currentIndex = currentFrameIndex
      document.getElementById('currentFrameDisplay').textContent = 'Regenerating frames...'
      setTimeout(() => {
        processAllFrames().then(() => {
          settingsChangedWhilePlaying = false
          currentFrameIndex = currentIndex
          displayFrame(currentFrameIndex)
          startPlayback(frameDelay)
        })
      }, 100)

      return
    }
    currentFrameIndex = (currentFrameIndex + 1) % videoFrames.length
    displayFrame(currentFrameIndex)
  }, frameDelay)
}
