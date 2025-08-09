import { ipcMain, app } from 'electron';
import settings from 'electron-settings';

/**
 * Settings IPC Handlers
 * Manages app settings and configuration using electron-settings
 */

export function registerSettingsHandlers() {
  // Initialize default settings
  ipcMain.handle('settings-initialize', async () => {
    try {
      const appSettings = {
        theme: 'dark',
        autoPlay: false,
        volume: 0.8,
        quality: 'auto',
        downloadPath: app.getPath('downloads'),
        notifications: true,
        autoDownload: false
      };

      const librarySettings = {
        sortBy: 'dateAdded',
        sortOrder: 'desc',
        viewMode: 'grid',
        showThumbnails: true,
        autoGenerateThumbnails: true
      };

      if (!(await settings.has('app'))) {
        await settings.set('app', appSettings);
      }

      if (!(await settings.has('library'))) {
        await settings.set('library', librarySettings);
      }

      if (!(await settings.has('userLibrary'))) {
        await settings.set('userLibrary', []);
      }

      return { success: true };
    } catch (error) {
      console.error('Error initializing settings:', error);
      return { success: false, error: error.message };
    }
  });

  // Get setting value
  ipcMain.handle('settings-get', async (event, key) => {
    try {
      return await settings.get(key);
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return null;
    }
  });

  // Set setting value
  ipcMain.handle('settings-set', async (event, key, value) => {
    try {
      await settings.set(key, value);
      return { success: true };
    } catch (error) {
      console.error(`Error setting ${key}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Check if setting exists
  ipcMain.handle('settings-has', async (event, key) => {
    try {
      return await settings.has(key);
    } catch (error) {
      console.error(`Error checking setting ${key}:`, error);
      return false;
    }
  });

  // Get all settings
  ipcMain.handle('settings-get-all', async () => {
    try {
      return await settings.get();
    } catch (error) {
      console.error('Error getting all settings:', error);
      return {};
    }
  });

  // Clear all settings
  ipcMain.handle('settings-clear', async () => {
    try {
      await settings.unset();
      return { success: true };
    } catch (error) {
      console.error('Error clearing settings:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Settings IPC handlers registered successfully');
}