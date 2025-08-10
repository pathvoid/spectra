/**
 * IPC Handlers Index
 * Exports all IPC handler registration functions for easy import
 */

import { ipcMain } from 'electron';
import autoUpdaterService from '../services/autoUpdaterService';

export function registerAutoUpdaterHandlers() {
  // Check for updates manually
  ipcMain.handle('auto-updater:check-for-updates', async () => {
    try {
      await autoUpdaterService.checkForUpdates();
      return { success: true };
    } catch (error) {
      console.error('Error checking for updates:', error);
      return { success: false, error: error.message };
    }
  });

  // Download update
  ipcMain.handle('auto-updater:download-update', async () => {
    try {
      await autoUpdaterService.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error downloading update:', error);
      return { success: false, error: error.message };
    }
  });

  // Install update
  ipcMain.handle('auto-updater:install-update', async () => {
    try {
      await autoUpdaterService.installUpdate();
      return { success: true };
    } catch (error) {
      console.error('Error installing update:', error);
      return { success: false, error: error.message };
    }
  });

  // Get current version
  ipcMain.handle('auto-updater:get-version', () => {
    return autoUpdaterService.getCurrentVersion();
  });
}

export { registerSettingsHandlers } from './settings';
export { registerLibraryHandlers } from './library';
export { registerYouTubeHandlers } from './youtube';