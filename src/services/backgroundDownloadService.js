/**
 * Background Download Service
 * Automatically downloads missing videos from the library on app startup
 * Processes downloads one by one to prevent overwhelming the system
 */

class BackgroundDownloadService {
  constructor() {
    this.downloadQueue = [];
    this.isProcessing = false;
    this.currentDownload = null;
    this.completedDownloads = 0;
    this.failedDownloads = 0;
    this.totalDownloads = 0;
    this.onProgressCallback = null;
    this.onCompleteCallback = null;
  }

  /**
   * Set progress callback for UI updates
   * @param {Function} callback - Called with progress info
   */
  setProgressCallback(callback) {
    this.onProgressCallback = callback;
  }

  /**
   * Set completion callback
   * @param {Function} callback - Called when all downloads complete
   */
  setCompleteCallback(callback) {
    this.onCompleteCallback = callback;
  }

  /**
   * Set item completion callback
   * @param {Function} callback - Called when individual item download completes
   */
  setItemCompleteCallback(callback) {
    this.onItemCompleteCallback = callback;
  }

  /**
   * Check library for missing videos and start background downloads
   */
  async startBackgroundDownloads() {
    try {
      console.log('BackgroundDownloadService: Checking for missing videos...');
      
      // Get all library items
      const libraryResult = await window.electronAPI.libraryGetItems();
      if (!libraryResult.success) {
        console.error('Failed to get library items:', libraryResult.error);
        return;
      }

      const libraryItems = libraryResult.items || [];
      const missingVideos = [];

      // Check each library item for missing or incomplete files
      for (const item of libraryItems) {
        if (item.videoId) {
          let needsDownload = false;
          let reason = '';

          // Check if download status indicates incomplete download
          if (item.downloadStatus === 'failed' || item.downloadStatus === 'downloading' || item.downloadStatus === 'pending') {
            needsDownload = true;
            reason = `Download status: ${item.downloadStatus}`;
          }
          // Check if no file path (never downloaded)
          else if (!item.filePath) {
            needsDownload = true;
            reason = 'Never downloaded';
          }
          // Check if file exists and is complete
          else {
            try {
              const blobResult = await window.electronAPI.getVideoBlob(item.filePath);
              if (!blobResult.success) {
                needsDownload = true;
                reason = 'File missing or inaccessible';
              }
            } catch (error) {
              needsDownload = true;
              reason = `File check error: ${error.message}`;
            }
          }

          if (needsDownload) {
            console.log(`${reason}: ${item.title}`);
            missingVideos.push(item);
          }
        }
      }

      if (missingVideos.length === 0) {
        console.log('BackgroundDownloadService: All videos are already downloaded');
        if (this.onCompleteCallback) {
          this.onCompleteCallback({ completed: 0, failed: 0, total: 0 });
        }
        return;
      }

      console.log(`BackgroundDownloadService: Found ${missingVideos.length} missing videos, starting downloads...`);
      
      // Add missing videos to queue
      this.downloadQueue = [...missingVideos];
      this.totalDownloads = missingVideos.length;
      this.completedDownloads = 0;
      this.failedDownloads = 0;

      // Notify progress
      this.updateProgress();

      // Start processing queue
      this.processQueue();

    } catch (error) {
      console.error('BackgroundDownloadService: Error starting background downloads:', error);
    }
  }

  /**
   * Process the download queue one by one
   */
  async processQueue() {
    if (this.isProcessing || this.downloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.downloadQueue.length > 0) {
      const item = this.downloadQueue.shift();
      this.currentDownload = item;

      console.log(`BackgroundDownloadService: Downloading ${item.title}...`);
      this.updateProgress();

      try {
        // Mark download as started
        await window.electronAPI.libraryUpdateItem(item.id, {
          downloadStatus: 'downloading',
          downloadStarted: new Date().toISOString()
        });

        // Download the video
        const downloadResult = await window.electronAPI.downloadVideo(item.videoId);
        
        if (downloadResult.success) {
          // Update library item with complete download information
          const updateResult = await window.electronAPI.libraryUpdateItem(item.id, {
            filePath: downloadResult.filePath,
            fileName: downloadResult.fileName,
            fileSize: downloadResult.fileSize,
            downloadStatus: 'completed',
            downloadCompleted: downloadResult.downloadCompleted || new Date().toISOString()
          });

          if (updateResult.success) {
            this.completedDownloads++;
            console.log(`BackgroundDownloadService: Successfully downloaded ${item.title}`);
            
            // Notify UI of individual item completion
            if (this.onItemCompleteCallback) {
              this.onItemCompleteCallback(item, 'completed');
            }
          } else {
            this.failedDownloads++;
            console.error(`BackgroundDownloadService: Failed to update library for ${item.title}`);
            // Mark as failed in library
            await window.electronAPI.libraryUpdateItem(item.id, {
              downloadStatus: 'failed'
            });
            
            // Notify UI of individual item failure
            if (this.onItemCompleteCallback) {
              this.onItemCompleteCallback(item, 'failed');
            }
          }
        } else {
          this.failedDownloads++;
          console.error(`BackgroundDownloadService: Failed to download ${item.title}:`, downloadResult.error);
          // Mark as failed in library
          await window.electronAPI.libraryUpdateItem(item.id, {
            downloadStatus: 'failed'
          });
          
          // Notify UI of individual item failure
          if (this.onItemCompleteCallback) {
            this.onItemCompleteCallback(item, 'failed');
          }
        }

      } catch (error) {
        this.failedDownloads++;
        console.error(`BackgroundDownloadService: Error downloading ${item.title}:`, error);
        // Mark as failed in library
        await window.electronAPI.libraryUpdateItem(item.id, {
          downloadStatus: 'failed'
        });
        
        // Notify UI of individual item failure
        if (this.onItemCompleteCallback) {
          this.onItemCompleteCallback(item, 'failed');
        }
      }

      this.currentDownload = null;
      this.updateProgress();

      // Small delay between downloads to be nice to the system
      await this.delay(1000);
    }

    this.isProcessing = false;
    console.log(`BackgroundDownloadService: Completed! ${this.completedDownloads} successful, ${this.failedDownloads} failed`);

    // Notify completion
    if (this.onCompleteCallback) {
      this.onCompleteCallback({
        completed: this.completedDownloads,
        failed: this.failedDownloads,
        total: this.totalDownloads
      });
    }
  }

  /**
   * Update progress and notify callback
   */
  updateProgress() {
    const progress = {
      current: this.currentDownload,
      completed: this.completedDownloads,
      failed: this.failedDownloads,
      remaining: this.downloadQueue.length,
      total: this.totalDownloads,
      isProcessing: this.isProcessing
    };

    if (this.onProgressCallback) {
      this.onProgressCallback(progress);
    }
  }

  /**
   * Get current download status
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      currentDownload: this.currentDownload,
      completed: this.completedDownloads,
      failed: this.failedDownloads,
      remaining: this.downloadQueue.length,
      total: this.totalDownloads
    };
  }

  /**
   * Stop the background download process
   */
  stop() {
    console.log('BackgroundDownloadService: Stopping downloads...');
    this.downloadQueue = [];
    this.isProcessing = false;
    this.currentDownload = null;
  }

  /**
   * Simple delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
const backgroundDownloadService = new BackgroundDownloadService();

export default backgroundDownloadService;