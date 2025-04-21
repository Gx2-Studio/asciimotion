/**
 * GIFExporter - Module for exporting ASCII animations as GIF files
 * Integrates with the existing export functionality in the asciimotion project
 */

/**
 * Shows a notification message to the user.
 * This is a fallback implementation in case the global function is not available.
 * @param {string} message - The message to display
 */
function showNotification(message) {
  console.log('Local showNotification called with message:', message);
  // Check if the global function exists
  if (window.showNotification && typeof window.showNotification === 'function') {
    console.log('Using global showNotification function');
    window.showNotification(message);
    return;
  }
  
  // Fallback implementation
  console.log('Using fallback notification implementation');
  const notification = document.getElementById('notification');
  if (!notification) {
    console.error('Notification element not found');
    return;
  }
  
  const notificationMessage = document.getElementById('notificationMessage');
  if (notificationMessage) {
    notificationMessage.textContent = message;
  }
  
  notification.classList.add('visible');
  setTimeout(() => {
    notification.classList.remove('visible');
  }, 3500);
}

/**
 * Exports an ASCII animation as a GIF file
 * @param {string[]} asciiFrames - The ASCII frames to export
 * @param {Object} options - Export options
 * @returns {Promise<Blob>} - A promise that resolves with the GIF blob
 */
async function exportGIF(asciiFrames, options = {}) {
  console.log('exportGIF called with', asciiFrames.length, 'frames and options:', options);
  // Show progress indicator
  const progressBar = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  document.getElementById('exportProgress').style.display = 'block';
  progressBar.style.width = '10%';
  progressText.textContent = 'Preparing GIF export...';

  try {
    // Default options
    const {
      width = 800,
      height = 600,
      quality = 10,
      repeat = 0,
      fps = parseInt(document.getElementById('playbackSpeed').value, 10) || 24,
      backgroundColor = document.getElementById('theme').value === 'dark' ? '#000000' : '#ffffff',
      textColor = document.getElementById('theme').value === 'dark' ? '#ffffff' : '#000000',
      fontFamily = '"Courier New", monospace',
      fontSize = 12,
      filename = 'ascii-animation.gif'
    } = options;

    // Calculate optimal dimensions based on the ASCII content
    const { calculatedWidth, calculatedHeight, calculatedFontSize } = calculateDimensions(asciiFrames[0], width, height);

    // Create the GIF encoder wrapper
    const encoder = new GIFEncoderWrapper(
      calculatedWidth,
      calculatedHeight,
      quality,
      repeat,
      fps
    );

    // Initialize the encoder
    encoder.initialize();

    // Add frames to the GIF
    const totalFrames = asciiFrames.length;
    for (let i = 0; i < totalFrames; i++) {
      // Update progress
      const progress = Math.round((i / totalFrames) * 80) + 10; // 10% to 90%
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `Rendering GIF: ${Math.round((i / totalFrames) * 100)}%`;

      // Add the frame
      encoder.addFrame(asciiFrames[i], {
        backgroundColor,
        textColor,
        fontFamily,
        fontSize: calculatedFontSize
      });

      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    // Finish the GIF
    progressBar.style.width = '90%';
    progressText.textContent = 'Finalizing GIF...';
    await new Promise(resolve => setTimeout(resolve, 0));

    // Get the GIF blob
    const blob = encoder.getBlob();
    console.log('GIF blob created:', blob);

    // Complete
    progressBar.style.width = '100%';
    progressText.textContent = 'GIF export complete';
    
    return blob;
  } catch (error) {
    console.error('Error exporting GIF:', error);
    throw error;
  }
}

/**
 * Downloads an ASCII animation as a GIF file
 * @param {string[]} asciiFrames - The ASCII frames to export
 * @param {Object} options - Export options
 * @returns {Promise<void>}
 */
async function downloadGIF(asciiFrames, options = {}) {
  console.log('downloadGIF called with', asciiFrames.length, 'frames and options:', options);
  try {
    // Create a wrapper for the GIF encoder
    console.log('Creating GIFEncoderWrapper');
    const {
      width = 1200,  // Increased from 800 for higher resolution
      height = 900,  // Increased from 600 for higher resolution
      quality = 5,   // Reduced from 10 for better quality (lower is better in GIFEncoder)
      repeat = 0,
      fps = 24,
      backgroundColor = '#000000',
      textColor = '#ffffff',
      fontFamily = '"Courier New", monospace',
      fontSize = 12,
      filename = 'ascii-animation.gif'
    } = options;
    
    // Show progress indicator
    const progressBar = document.querySelector('.progress-fill');
    const progressText = document.querySelector('.progress-text');
    document.getElementById('exportProgress').style.display = 'block';
    progressBar.style.width = '10%';
    progressText.textContent = 'Preparing GIF export...';
    
    // Calculate optimal dimensions based on the ASCII content
    console.log('Calculating dimensions');
    const { calculatedWidth, calculatedHeight, calculatedFontSize } = calculateDimensions(asciiFrames[0], width, height);
    
    // Create the GIF encoder directly
    console.log('Creating GIFEncoder with dimensions:', calculatedWidth, 'x', calculatedHeight);
    const encoder = new GIFEncoder(calculatedWidth, calculatedHeight);
    encoder.setRepeat(repeat);
    encoder.setFrameRate(fps);
    encoder.setQuality(quality); // Lower values (1-20) produce better quality
    
    // Set transparent background if using dark theme
    if (backgroundColor === '#000000') {
      encoder.setTransparent(0x000000);
    } else if (backgroundColor === '#ffffff') {
      encoder.setTransparent(0xffffff);
    }
    
    encoder.start();
    
    // Create a canvas for rendering frames
    const canvas = document.createElement('canvas');
    canvas.width = calculatedWidth;
    canvas.height = calculatedHeight;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    // Add frames to the GIF
    console.log('Adding frames to GIF');
    const totalFrames = asciiFrames.length;
    for (let i = 0; i < totalFrames; i++) {
      // Update progress
      const progress = Math.round((i / totalFrames) * 80) + 10; // 10% to 90%
      progressBar.style.width = `${progress}%`;
      progressText.textContent = `Rendering GIF: ${Math.round((i / totalFrames) * 100)}%`;
      
      // Clear the canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, calculatedWidth, calculatedHeight);
      
      // Draw the ASCII frame with improved rendering
      ctx.fillStyle = textColor;
      ctx.font = `${calculatedFontSize}px ${fontFamily}`;
      ctx.textBaseline = 'top';
      ctx.textRendering = 'geometricPrecision';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      const lines = asciiFrames[i].split('\n');
      const lineHeight = calculatedFontSize * 1.2;
      
      lines.forEach((line, j) => {
        ctx.fillText(line, 0, j * lineHeight);
      });
      
      // Add the frame to the GIF
      console.log(`Adding frame ${i+1}/${totalFrames}`);
      encoder.addFrame(ctx);
      
      // Allow UI to update
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // Finish the GIF
    progressBar.style.width = '90%';
    progressText.textContent = 'Finalizing GIF...';
    console.log('Finishing GIF');
    encoder.finish();
    
    // Download the GIF
    console.log('Creating download link');
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').substring(0, 14);
    const downloadFilename = `ascii-animation-hq-${timestamp}.gif`;
    
    // Use the download method from the reference implementation
    console.log('Creating Blob from encoder data');
    const stream = encoder.stream();
    const data = new Uint8Array(stream.bin);
    const blob = new Blob([data], { type: 'image/gif' });
    console.log('Blob created with size:', blob.size, 'bytes');
    
    const url = URL.createObjectURL(blob);
    console.log('Created object URL:', url);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || downloadFilename;
    console.log('Download link created with filename:', link.download);
    
    // Trigger the download
    console.log('Clicking download link...');
    document.body.appendChild(link); // Add to DOM for Firefox compatibility
    link.click();
    console.log('Download link clicked');
    document.body.removeChild(link); // Remove from DOM
    
    // Clean up
    URL.revokeObjectURL(url);
    document.getElementById('exportProgress').style.display = 'none';
    
    // Complete
    progressBar.style.width = '100%';
    progressText.textContent = 'GIF export complete';
    
    // Show notification
    console.log('Showing success notification');
    showNotification('GIF exported successfully');
  } catch (error) {
    console.error('Error downloading GIF:', error);
    document.getElementById('exportProgress').style.display = 'none';
    console.log('Showing error notification');
    showNotification('Failed to export GIF. Check console for details.');
  }
}

/**
 * Calculates optimal dimensions for the GIF based on the ASCII content
 * @param {string} asciiFrame - A sample ASCII frame
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Object} - The calculated dimensions and font size
 * @private
 */
function calculateDimensions(asciiFrame, maxWidth, maxHeight) {
  console.log('Calculating optimal dimensions for GIF');
  const lines = asciiFrame.split('\n');
  const lineCount = lines.length;
  const maxLineLength = Math.max(...lines.map(line => line.length));
  
  console.log('ASCII dimensions:', 'lines:', lineCount, 'max line length:', maxLineLength);
  
  // Calculate font size that will fit the content within the max dimensions
  // Assuming monospace font where width is roughly 0.6 times the height
  const fontSizeByWidth = maxWidth / (maxLineLength * 0.6);
  const fontSizeByHeight = maxHeight / (lineCount * 1.2);
  
  // Use a slightly larger font size for better readability, but ensure it fits
  let calculatedFontSize = Math.min(fontSizeByWidth, fontSizeByHeight);
  
  // Ensure font size is at least 10px for readability
  calculatedFontSize = Math.max(calculatedFontSize, 10);
  
  // Calculate the actual dimensions based on the font size
  // Add a small padding (5%) to ensure text isn't cut off
  const calculatedWidth = Math.ceil(maxLineLength * calculatedFontSize * 0.6 * 1.05);
  const calculatedHeight = Math.ceil(lineCount * calculatedFontSize * 1.2 * 1.05);
  
  console.log('Calculated dimensions:',
    'width:', calculatedWidth,
    'height:', calculatedHeight,
    'fontSize:', calculatedFontSize);
  
  return {
    calculatedWidth,
    calculatedHeight,
    calculatedFontSize
  };
}

// Export the functions
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = {
    exportGIF,
    downloadGIF
  };
} else {
  window.exportGIF = exportGIF;
  window.downloadGIF = downloadGIF;
}