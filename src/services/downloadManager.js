/**
 * Download Manager Service
 * Manages ongoing downloads to prevent concurrent downloads of the same video
 */

class DownloadManager {
  constructor() {
    this.activeDownloads = new Map(); // videoId -> Promise
    this.downloadStates = new Map(); // videoId -> state info
  }

  /**
   * Check if a video is currently being downloaded
   * @param {string} videoId - Video ID to check
   * @returns {boolean} True if download is in progress
   */
  isDownloading(videoId) {
    return this.activeDownloads.has(videoId);
  }

  /**
   * Get download state for a video
   * @param {string} videoId - Video ID
   * @returns {object|null} Download state or null if not downloading
   */
  getDownloadState(videoId) {
    return this.downloadStates.get(videoId) || null;
  }

  /**
   * Start a download or return existing download promise
   * @param {string} videoId - Video ID to download
   * @param {Function} downloadFunction - Function that performs the actual download
   * @returns {Promise} Download promise
   */
  async startDownload(videoId, downloadFunction) {
    // If already downloading, return the existing promise
    if (this.activeDownloads.has(videoId)) {
      console.log(`Download already in progress for video ${videoId}, returning existing promise`);
      return this.activeDownloads.get(videoId);
    }

    // Set download state
    this.downloadStates.set(videoId, {
      videoId,
      startTime: Date.now(),
      status: 'downloading'
    });

    // Create and store the download promise
    const downloadPromise = downloadFunction()
      .then(result => {
        // Update state on success
        this.downloadStates.set(videoId, {
          videoId,
          startTime: this.downloadStates.get(videoId)?.startTime,
          endTime: Date.now(),
          status: 'completed',
          result
        });
        return result;
      })
      .catch(error => {
        // Update state on error
        this.downloadStates.set(videoId, {
          videoId,
          startTime: this.downloadStates.get(videoId)?.startTime,
          endTime: Date.now(),
          status: 'error',
          error
        });
        throw error;
      })
      .finally(() => {
        // Clean up active download
        this.activeDownloads.delete(videoId);
        
        // Keep state for a short time for debugging, then clean up
        setTimeout(() => {
          this.downloadStates.delete(videoId);
        }, 30000); // Keep for 30 seconds
      });

    // Store the promise
    this.activeDownloads.set(videoId, downloadPromise);

    console.log(`Started download for video ${videoId}`);
    return downloadPromise;
  }

  /**
   * Cancel a download (if possible)
   * @param {string} videoId - Video ID to cancel
   */
  cancelDownload(videoId) {
    if (this.activeDownloads.has(videoId)) {
      this.activeDownloads.delete(videoId);
      this.downloadStates.set(videoId, {
        ...this.downloadStates.get(videoId),
        status: 'cancelled',
        endTime: Date.now()
      });
      console.log(`Cancelled download for video ${videoId}`);
    }
  }

  /**
   * Get all active downloads
   * @returns {Array} Array of active download video IDs
   */
  getActiveDownloads() {
    return Array.from(this.activeDownloads.keys());
  }

  /**
   * Clear all download state (for cleanup)
   */
  clearAll() {
    this.activeDownloads.clear();
    this.downloadStates.clear();
  }
}

// Export singleton instance
const downloadManager = new DownloadManager();
export default downloadManager;