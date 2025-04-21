/**
 * GIFEncoderWrapper - A wrapper for the GIF encoder library
 * Provides a clean interface to the GIF encoder functionality
 */

/**
 * Creates a new GIF encoder wrapper
 * @param {number} width - The width of the GIF
 * @param {number} height - The height of the GIF
 * @param {number} quality - The quality of the GIF (1-30, lower is better quality but slower)
 * @param {number} repeat - The number of times to repeat the animation (0 = loop forever)
 * @param {number} fps - Frames per second
 */
class GIFEncoderWrapper {
  constructor(width, height, quality = 10, repeat = 0, fps = 24) {
    this.width = width;
    this.height = height;
    this.quality = quality;
    this.repeat = repeat;
    this.fps = fps;
    this.encoder = null;
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d', { alpha: false });
    this.initialized = false;
  }

  /**
   * Initializes the GIF encoder
   */
  initialize() {
    console.log('GIFEncoderWrapper.initialize() called');
    if (this.initialized) {
      console.log('Already initialized, returning');
      return;
    }

    console.log('Creating GIFEncoder with dimensions:', this.width, 'x', this.height);
    this.encoder = new GIFEncoder(this.width, this.height);
    console.log('Setting repeat to:', this.repeat);
    this.encoder.setRepeat(this.repeat);
    console.log('Setting frame rate to:', this.fps);
    this.encoder.setFrameRate(this.fps);
    console.log('Setting quality to:', this.quality);
    this.encoder.setQuality(this.quality);
    console.log('Starting encoder');
    this.encoder.start();
    this.initialized = true;
    console.log('Encoder initialized successfully');
  }

  /**
   * Adds a frame to the GIF
   * @param {string} asciiFrame - The ASCII frame to add
   * @param {Object} options - Options for rendering the frame
   * @param {string} options.backgroundColor - The background color
   * @param {string} options.textColor - The text color
   * @param {string} options.fontFamily - The font family
   * @param {number} options.fontSize - The font size
   */
  addFrame(asciiFrame, options = {}) {
    if (!this.initialized) {
      this.initialize();
    }

    const {
      backgroundColor = '#000000',
      textColor = '#ffffff',
      fontFamily = '"Courier New", monospace',
      fontSize = 12
    } = options;

    // Clear the canvas
    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, this.width, this.height);

    // Draw the ASCII frame
    this.ctx.fillStyle = textColor;
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textBaseline = 'top';
    
    const lines = asciiFrame.split('\n');
    const lineHeight = fontSize * 1.2;
    
    lines.forEach((line, i) => {
      this.ctx.fillText(line, 0, i * lineHeight);
    });

    // Add the frame to the GIF
    console.log('Adding frame to encoder');
    this.encoder.addFrame(this.ctx);
    console.log('Frame added successfully');
  }

  /**
   * Adds multiple frames to the GIF
   * @param {string[]} asciiFrames - The ASCII frames to add
   * @param {Object} options - Options for rendering the frames
   */
  addFrames(asciiFrames, options = {}) {
    for (const frame of asciiFrames) {
      this.addFrame(frame, options);
    }
  }

  /**
   * Finishes the GIF encoding process
   * @returns {Uint8Array} - The encoded GIF data
   */
  finish() {
    console.log('GIFEncoderWrapper.finish() called');
    if (!this.initialized) {
      console.error('GIF encoder not initialized');
      throw new Error('GIF encoder not initialized');
    }

    console.log('Finishing encoder');
    this.encoder.finish();
    console.log('Getting stream from encoder');
    const stream = this.encoder.stream();
    console.log('Stream received:', stream);
    console.log('Creating Uint8Array from stream.bin');
    const data = new Uint8Array(stream.bin);
    console.log('Data created with length:', data.length);
    return data;
  }

  /**
   * Creates a data URL for the GIF
   * @returns {string} - The data URL
   */
  getDataURL() {
    const data = this.finish();
    return `data:image/gif;base64,${this.arrayToBase64(data)}`;
  }

  /**
   * Creates a Blob for the GIF
   * @returns {Blob} - The Blob
   */
  getBlob() {
    console.log('GIFEncoderWrapper.getBlob() called');
    const data = this.finish();
    console.log('Creating Blob from data');
    const blob = new Blob([data], { type: 'image/gif' });
    console.log('Blob created with size:', blob.size, 'bytes');
    return blob;
  }

  /**
   * Downloads the GIF
   * @param {string} filename - The filename to use
   */
  download(filename = 'ascii-animation.gif') {
    const blob = this.getBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Converts a Uint8Array to a base64 string
   * @param {Uint8Array} array - The array to convert
   * @returns {string} - The base64 string
   * @private
   */
  arrayToBase64(array) {
    return btoa(Array.from(array).map(byte => String.fromCharCode(byte)).join(''));
  }
}

// Export the GIFEncoderWrapper
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
  module.exports = GIFEncoderWrapper;
} else {
  window.GIFEncoderWrapper = GIFEncoderWrapper;
}