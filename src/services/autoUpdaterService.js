import { autoUpdater } from 'electron-updater';
import { app } from 'electron';

class AutoUpdaterService {
  constructor() {
    this.isProduction = !app.isPackaged ? false : true;
    this.updateCheckInterval = null;
    this.updateCheckIntervalMs = 10 * 60 * 1000; // 10 minutes
    
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Don't auto-download, let user choose
    autoUpdater.autoInstallOnAppQuit = true; // Install on app quit
    
    // Set up event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Check for update errors
    autoUpdater.on('error', (err) => {
      console.log('Auto-updater error:', err);
    });

    // Check for updates
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
    });

    // No updates available
    autoUpdater.on('update-not-available', () => {
      console.log('No updates available');
    });

    // Update available
    autoUpdater.on('update-available', (info) => {
      console.log('Update available:', info);
      // You can emit an event here to notify the renderer process
      if (global.mainWindow) {
        global.mainWindow.webContents.send('update-available', info);
      }
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      console.log('Update downloaded:', info);
      // You can emit an event here to notify the renderer process
      if (global.mainWindow) {
        global.mainWindow.webContents.send('update-downloaded', info);
      }
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      console.log('Download progress:', progressObj);
      // You can emit an event here to notify the renderer process
      if (global.mainWindow) {
        global.mainWindow.webContents.send('update-download-progress', progressObj);
      }
    });
  }

  start() {
    if (!this.isProduction) {
      console.log('Auto-updater disabled in development mode');
      return;
    }

    console.log('Starting auto-updater service...');
    
    // Check for updates on startup
    this.checkForUpdates();
    
    // Set up periodic update checks
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.updateCheckIntervalMs);
  }

  stop() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  async checkForUpdates() {
    if (!this.isProduction) {
      return;
    }

    try {
      console.log('Checking for updates...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      console.log('Error checking for updates:', error);
    }
  }

  async downloadUpdate() {
    if (!this.isProduction) {
      return;
    }

    try {
      console.log('Downloading update...');
      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.log('Error downloading update:', error);
    }
  }

  async installUpdate() {
    if (!this.isProduction) {
      return;
    }

    try {
      console.log('Installing update...');
      autoUpdater.quitAndInstall();
    } catch (error) {
      console.log('Error installing update:', error);
    }
  }

  getCurrentVersion() {
    return app.getVersion();
  }
}

export default new AutoUpdaterService();
