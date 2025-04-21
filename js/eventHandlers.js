/** Video metadata state */
let videoMetadata = { videoDuration: 0, totalVideoFrames: 0 }

/**
 * Handles file upload (image or video).
 */
document.getElementById('upload').addEventListener('change', async event => {
  const file = event.target.files[0]
  if (!file) {
    return
  }
  const animationSettings = document.querySelector('.animation-settings')

  document.getElementById('frameCount').value = 100
  document.getElementById('frameCountVal').textContent = 100
  document.getElementById('frameRecommended').style.display = 'none'
  document.getElementById('frameFeedback').style.display = 'none'
  document.getElementById('processVideo').style.display = 'none'

  if (isPlaying) {
    clearInterval(animationInterval)
    isPlaying = false
    document.getElementById('playAnimation').textContent = 'Play'
  }
  videoFrames = []
  asciiFrames = []
  currentFrameIndex = 0

  const isVideo = file.type.startsWith('video/')
  isVideoLoaded = isVideo
  if (isVideo) {
    animationSettings.style.display = 'block'
    document.querySelector('.frame-count-control').style.display = 'block'
  } else {
    document.querySelector('.image-processing').style.display = 'block'
    document.querySelector('.effects-settings').style.display = 'block'
    document.querySelector('.charset-settings').style.display = 'block'
    document.querySelector('.edge-detection-settings').style.display = 'block'
    document.querySelector('.display-settings').style.display = 'block'
  }

  if (isVideo) {
    const processBtn = document.getElementById('processVideo')
    processBtn.disabled = true
    videoMetadata = await loadVideoMetadata(file)
    updateFrameRecommendation()
    processBtn.disabled = false
    processBtn.style.display = 'block'

    // Reset the frame counter display
    document.getElementById('currentFrameDisplay').textContent = '0/0'
    ;('Adjust frame count if desired, then click Process')
    currentVideoFile = file
  } else {
    const img = new Image()
    img.onload = () => {
      currentImage = img
      generateASCII(img)
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  }
})

/**
 * Sets up modal event listeners on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  const frameHelp = document.getElementById('frameHelp')
  const frameTooltip = document.getElementById('frameTooltip')
  if (!frameHelp || !frameTooltip) {
    console.error('Frame help elements not found:', { frameHelp, frameTooltip })

    return
  }
  frameTooltip.setAttribute('tabindex', '-1')
  let tooltipVisible = false
  function showTooltip () {
    frameTooltip.style.top = ''
    frameTooltip.style.left = ''
    frameTooltip.style.right = ''
    frameTooltip.style.bottom = ''
    frameTooltip.style.display = 'block'
    frameTooltip.style.visibility = 'visible'
    const helpRect = frameHelp.getBoundingClientRect()
    const tooltipRect = frameTooltip.getBoundingClientRect()
    const sidebarRect = document.querySelector('.sidebar').getBoundingClientRect()
    const viewportWidth = window.innerWidth
    let top = helpRect.bottom + 5
    let left = helpRect.left
    if (left + tooltipRect.width > viewportWidth) {
      left = Math.max(10, viewportWidth - tooltipRect.width - 10)
    }

    if (left < sidebarRect.left) {
      left = sidebarRect.left + 10
    }
    frameTooltip.style.position = 'fixed'
    frameTooltip.style.top = `${top}px`
    frameTooltip.style.left = `${left}px`
    frameHelp.setAttribute('aria-expanded', 'true')
    frameTooltip.setAttribute('aria-hidden', 'false')
    frameTooltip.classList.add('visible')
    tooltipVisible = true
  }

  function hideTooltip () {
    frameTooltip.classList.remove('visible')
    frameTooltip.style.display = 'none'
    tooltipVisible = false
    frameHelp.setAttribute('aria-expanded', 'false')
    frameTooltip.setAttribute('aria-hidden', 'true')
  }
  frameHelp.addEventListener('click', event => {
    event.preventDefault()
    event.stopPropagation()
    if (!tooltipVisible) {
      showTooltip()
    } else {
      hideTooltip()
    }
  })
  document.addEventListener('click', event => {
    if (
      tooltipVisible &&
      !frameHelp.contains(event.target) &&
      !frameTooltip.contains(event.target)
    ) {
      hideTooltip()
    }
  })
  frameTooltip.addEventListener('click', event => {
    event.stopPropagation()
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      hideTooltip()
      frameHelp.focus()
    }
  })
})

/**
 * Updates the frame recommendation in the UI.
 */
function updateFrameRecommendation () {
  if (!isVideoLoaded || videoMetadata.videoDuration <= 0) {
    return
  }
  const frameCount = parseInt(document.getElementById('frameCount').value, 10)
  const fps = parseInt(document.getElementById('playbackSpeed').value, 10)
  const animationLength = frameCount / fps
  let quality = 'Low'
  const framesPerSecond = frameCount / videoMetadata.videoDuration
  if (framesPerSecond >= 24) {
    quality = 'Excellent'
  } else if (framesPerSecond >= 18) {
    quality = 'Very Good'
  } else if (framesPerSecond >= 12) {
    quality = 'Good'
  } else if (framesPerSecond >= 6) {
    quality = 'Fair'
  }
  const recommendedFrames = Math.min(
    Math.max(Math.round(videoMetadata.videoDuration * 24), 60),
    videoMetadata.totalVideoFrames
  )

  const frameFeedback = document.getElementById('frameFeedback')
  const frameRecommended = document.getElementById('frameRecommended')
  frameFeedback.innerHTML = `
    Animation length: <strong>${animationLength.toFixed(1)}s</strong> at ${fps} fps |
    Quality: <strong>${quality}</strong> (${framesPerSecond.toFixed(1)} frames/sec of video)
  `
  document.getElementById('frameRecommendedVal').textContent = recommendedFrames
  frameFeedback.style.display = 'block'
  frameRecommended.style.display = 'inline-block'
}
document.getElementById('frameCount').addEventListener('input', event => {
  document.getElementById('frameCountVal').textContent = event.target.value
  updateFrameRecommendation()
})
document.getElementById('playbackSpeed').addEventListener('input', event => {
  document.getElementById('playbackSpeedVal').textContent = `${event.target.value} fps`
  updateFrameRecommendation()
  if (isPlaying) {
    clearInterval(animationInterval)
    startPlayback(1000 / parseInt(event.target.value, 10))
  }
})
document.getElementById('prevFrame').addEventListener('click', goToPreviousFrame)
document.getElementById('nextFrame').addEventListener('click', goToNextFrame)
document.getElementById('playAnimation').addEventListener('click', togglePlayback)

/**
 * Handles settings changes during playback or while paused.
 */
function handleSettingsChange () {
  if (isVideoLoaded) {
    if (isPlaying) {
      settingsChangedWhilePlaying = true
      lastSettingsChangeTime = Date.now()
    } else {
      settingsChangedWhilePaused = true
    }
  }

  if (currentImage) {
    generateASCII(currentImage)
  }
}
document.getElementById('asciiWidth').addEventListener('input', event => {
  document.getElementById('asciiWidthVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('brightness').addEventListener('input', event => {
  document.getElementById('brightnessVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('contrast').addEventListener('input', event => {
  document.getElementById('contrastVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('blur').addEventListener('input', event => {
  document.getElementById('blurVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('invert').addEventListener('change', handleSettingsChange)
document.getElementById('ignoreWhite').addEventListener('change', handleSettingsChange)
document.getElementById('ignoreGreen').addEventListener('change', handleSettingsChange)
document.getElementById('dithering').addEventListener('change', handleSettingsChange)
document.getElementById('ditherAlgorithm').addEventListener('change', handleSettingsChange)
document.getElementById('charset').addEventListener('change', event => {
  const manualControl = document.getElementById('manualCharControl')
  manualControl.style.display = event.target.value === 'manual' ? 'block' : 'none'
  handleSettingsChange()
})
document.getElementById('manualCharInput').addEventListener('input', handleSettingsChange)
document.getElementById('edgeMethod').addEventListener('change', event => {
  const sobelControl = document.getElementById('sobelThresholdControl')
  const dogControl = document.getElementById('dogThresholdControl')
  const cannyControl = document.getElementById('cannyThresholdControl')
  const claheControl = document.getElementById('claheControl')
  const lbpControl = document.getElementById('lbpControl')
  sobelControl.style.display = event.target.value === 'sobel' ? 'block' : 'none'
  dogControl.style.display = event.target.value === 'dog' ? 'block' : 'none'
  cannyControl.style.display = event.target.value === 'canny' ? 'block' : 'none'
  claheControl.style.display = event.target.value === 'clahe' ? 'block' : 'none'
  lbpControl.style.display = event.target.value === 'lbp' ? 'block' : 'none'
  handleSettingsChange()
})
document.getElementById('edgeThreshold').addEventListener('input', event => {
  document.getElementById('edgeThresholdVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('dogEdgeThreshold').addEventListener('input', event => {
  document.getElementById('dogEdgeThresholdVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('cannyLowThreshold').addEventListener('input', event => {
  document.getElementById('cannyLowThresholdVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('cannyHighThreshold').addEventListener('input', event => {
  document.getElementById('cannyHighThresholdVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('cannySigma').addEventListener('input', event => {
  document.getElementById('cannySigmaVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('claheTileSize').addEventListener('input', event => {
  document.getElementById('claheTileSizeVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('claheClipLimit').addEventListener('input', event => {
  document.getElementById('claheClipLimitVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('lbpRadius').addEventListener('input', event => {
  document.getElementById('lbpRadiusVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('lbpNumPoints').addEventListener('input', event => {
  document.getElementById('lbpNumPointsVal').textContent = event.target.value
  handleSettingsChange()
})
document.getElementById('lbpUniform').addEventListener('change', handleSettingsChange)
document.getElementById('zoom').addEventListener('input', event => {
  const value = event.target.value
  document.getElementById('zoomVal').textContent = `${value}%`

  const scaledValue = 20 + value * 1.8
  document.getElementById('ascii-art').style.fontSize = `${scaledValue}%`
})
document.getElementById('theme').addEventListener('change', event => {
  document.body.classList.toggle('light-theme', event.target.value === 'light')
})
document.getElementById('copyBtn').addEventListener('click', () => {
  const ascii = document.getElementById('ascii-art').textContent
  if (!ascii.trim()) {
    showNotification('No ASCII art to copy')

    return
  }
  navigator.clipboard
    .writeText(ascii)
    .then(() => {
      showNotification('ASCII copied to clipboard')
    })
    .catch(err => {
      console.error('Failed to copy:', err)
      showNotification('Failed to copy ASCII art')
    })
})
document.getElementById('downloadBtn').addEventListener('click', downloadPNG)
document.getElementById('exportBtn').addEventListener('click', () => {
  if (!isVideoLoaded || asciiFrames.length === 0) {
    showNotification('Nothing to export, please load a video first')

    return
  }
  exportAnimation()
  showNotification('Animation exported successfully')
})
document.getElementById('exportVideoBtn').addEventListener('click', async () => {
  if (!isVideoLoaded || asciiFrames.length === 0) {
    showNotification('Nothing to export, please load a video first')

    return
  }
  const btn = document.getElementById('exportVideoBtn')
  const originalText = btn.textContent
  btn.disabled = true
  btn.textContent = 'Exporting MP4...'
  try {
    await exportVideo()

    // Notification will be shown by the exportVideo function when complete
  } catch (error) {
    console.error('Error exporting video:', error)
    showNotification('Failed to export video')
  } finally {
    btn.disabled = false
    btn.textContent = originalText
  }
})
document.getElementById('exportGIFBtn').addEventListener('click', async () => {
  if (!isVideoLoaded || asciiFrames.length === 0) {
    showNotification('Nothing to export, please load a video first');
    return;
  }
  
  const btn = document.getElementById('exportGIFBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Exporting GIF...';
  
  try {
    await exportGIF();
    // Notification will be shown by the exportGIF function when complete
  } catch (error) {
    console.error('Error exporting GIF:', error);
    showNotification('Failed to export GIF');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
})
document.getElementById('reset').addEventListener('click', () => {
  document.getElementById('asciiWidth').value = 150
  document.getElementById('asciiWidthVal').textContent = 150
  document.getElementById('brightness').value = 0
  document.getElementById('brightnessVal').textContent = 0
  document.getElementById('contrast').value = 0
  document.getElementById('contrastVal').textContent = 0
  document.getElementById('blur').value = 0
  document.getElementById('blurVal').textContent = 0
  document.getElementById('invert').checked = false
  document.getElementById('ignoreWhite').checked = true
  document.getElementById('ignoreGreen').checked = false
  document.getElementById('dithering').checked = true
  document.getElementById('ditherAlgorithm').value = 'floyd'
  document.getElementById('charset').value = 'detailed'
  document.getElementById('manualCharInput').value = '0'
  document.getElementById('manualCharControl').style.display = 'none'
  document.getElementById('edgeMethod').value = 'none'
  document.getElementById('edgeThreshold').value = 100
  document.getElementById('edgeThresholdVal').textContent = 100
  document.getElementById('dogEdgeThreshold').value = 100
  document.getElementById('dogEdgeThresholdVal').textContent = 100
  document.getElementById('cannyLowThreshold').value = 50
  document.getElementById('cannyLowThresholdVal').textContent = 50
  document.getElementById('cannyHighThreshold').value = 150
  document.getElementById('cannyHighThresholdVal').textContent = 150
  document.getElementById('cannySigma').value = 1.4
  document.getElementById('cannySigmaVal').textContent = 1.4
  document.getElementById('claheTileSize').value = 8
  document.getElementById('claheTileSizeVal').textContent = 8
  document.getElementById('claheClipLimit').value = 4
  document.getElementById('claheClipLimitVal').textContent = 4.0
  document.getElementById('lbpRadius').value = 1
  document.getElementById('lbpRadiusVal').textContent = 1
  document.getElementById('lbpNumPoints').value = 8
  document.getElementById('lbpNumPointsVal').textContent = 8
  document.getElementById('lbpUniform').checked = false
  document.getElementById('sobelThresholdControl').style.display = 'none'
  document.getElementById('dogThresholdControl').style.display = 'none'
  document.getElementById('cannyThresholdControl').style.display = 'none'
  document.getElementById('claheControl').style.display = 'none'
  document.getElementById('lbpControl').style.display = 'none'
  document.getElementById('zoom').value = 50
  document.getElementById('zoomVal').textContent = '50%'
  document.getElementById('ascii-art').style.fontSize = '110%' // 20 + (50 * 1.8) = 110
  document.getElementById('theme').value = 'dark'
  document.body.classList.remove('light-theme')
  handleSettingsChange()
})
const processVideoBtn = document.getElementById('processVideo')
processVideoBtn.addEventListener('click', async () => {
  if (!currentVideoFile) {
    return
  }
  processVideoBtn.disabled = true
  processVideoBtn.textContent = 'Processing...'

  const progressContainer = document.getElementById('processProgressContainer')
  const progressBar = document.getElementById('processProgress')
  if (progressContainer) {
    progressContainer.style.display = 'block'
    progressBar.style.width = '0%'
  }

  try {
    const frameCount = parseInt(document.getElementById('frameCount').value, 10)
    await extractFramesFromVideo(currentVideoFile, frameCount)

    processVideoBtn.style.display = 'none'
    document.querySelector('.frame-count-control').style.display = 'none'
    document.querySelector('.frame-recommendation-control').style.display = 'none'

    document.querySelector('.upload-group').style.display = 'none'

    document.querySelector('.image-processing').style.display = 'block'
    document.querySelector('.effects-settings').style.display = 'block'
    document.querySelector('.charset-settings').style.display = 'block'
    document.querySelector('.edge-detection-settings').style.display = 'block'
    document.querySelector('.display-settings').style.display = 'block'

    const playbackControls = document.querySelector('.playback-controls')
    if (playbackControls) {
      playbackControls.style.display = 'block'
    } else {
      console.error('Playback controls not found')
    }
    const fpsControl = document.querySelector('.fps-control')
    if (fpsControl) {
      fpsControl.style.display = 'block'
    } else {
      console.error('FPS control not found')
    }
  } catch (error) {
    console.error('Error processing video:', error)
    document.getElementById('currentFrameDisplay').textContent = 'Error processing video'
  } finally {
    processVideoBtn.disabled = false
    processVideoBtn.textContent = 'Process Video'
  }
})
document.body.classList.toggle('light-theme', document.getElementById('theme').value === 'light')

/**
 * Displays a notification message.
 */
function showNotification (message) {
  const notification = document.getElementById('notification')
  const notificationMessage = document.getElementById('notificationMessage')
  if (message) {
    notificationMessage.textContent = message
  }
  notification.classList.add('visible')
  setTimeout(() => {
    notification.classList.remove('visible')
  }, 3500)
}

/**
 * Sets up modal event listeners on DOMContentLoaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  const usageGuideModal = document.getElementById('usageGuideModal')
  const aboutModal = document.getElementById('aboutModal')
  const usageGuideLink = document.getElementById('usageGuideLink')
  const aboutLink = document.getElementById('aboutLink')
  const closeButtons = document.querySelectorAll('.modal-close')
  function openModal (modal) {
    modal.style.display = 'block'
    document.body.style.overflow = 'hidden'
  }

  function closeModal (modal) {
    modal.style.display = 'none'
    document.body.style.overflow = ''
  }
  usageGuideLink.addEventListener('click', event => {
    event.preventDefault()
    openModal(usageGuideModal)
  })
  aboutLink.addEventListener('click', event => {
    event.preventDefault()
    openModal(aboutModal)
  })
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      const modal = button.closest('.modal')
      closeModal(modal)
    })
  })
  window.addEventListener('click', event => {
    if (event.target === usageGuideModal) {
      closeModal(usageGuideModal)
    }

    if (event.target === aboutModal) {
      closeModal(aboutModal)
    }
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeModal(usageGuideModal)
      closeModal(aboutModal)
    }
  })
})
