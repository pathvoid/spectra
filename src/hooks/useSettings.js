import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing app settings
 * Provides access to all app and library settings with real-time updates
 */
function useSettings() {
  const [appSettings, setAppSettings] = useState({});
  const [librarySettings, setLibrarySettings] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize settings on mount
  useEffect(() => {
    initializeSettings();
  }, []);

  /**
   * Initialize the settings system
   */
  const initializeSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize default settings
      await window.electronAPI.settingsInitialize();
      
      // Load existing settings
      await loadSettings();
      
      setIsInitialized(true);
    } catch (err) {
      console.error('Error initializing settings:', err);
      setError('Failed to initialize settings');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load all settings from storage
   */
  const loadSettings = async () => {
    try {
      const appData = await window.electronAPI.settingsGet('app');
      const libraryData = await window.electronAPI.settingsGet('library');
      
      setAppSettings(appData || {});
      setLibrarySettings(libraryData || {});
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    }
  };

  /**
   * Get a specific app setting
   * @param {string} key - Setting key
   * @returns {any} Setting value
   */
  const getAppSetting = useCallback((key) => {
    return appSettings[key];
  }, [appSettings]);

  /**
   * Set a specific app setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<boolean>} Success status
   */
  const setAppSetting = useCallback(async (key, value) => {
    try {
      setError(null);
      
      const result = await window.electronAPI.settingsSet(`app.${key}`, value);
      
      if (result.success) {
        setAppSettings(prev => ({ ...prev, [key]: value }));
        return true;
      } else {
        setError(`Failed to set app setting: ${key}`);
        return false;
      }
    } catch (err) {
      console.error(`Error setting app setting ${key}:`, err);
      setError(`Failed to set app setting: ${key}`);
      return false;
    }
  }, []);

  /**
   * Get a specific library setting
   * @param {string} key - Setting key
   * @returns {any} Setting value
   */
  const getLibrarySetting = useCallback((key) => {
    return librarySettings[key];
  }, [librarySettings]);

  /**
   * Set a specific library setting
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   * @returns {Promise<boolean>} Success status
   */
  const setLibrarySetting = useCallback(async (key, value) => {
    try {
      setError(null);
      
      const result = await window.electronAPI.settingsSet(`library.${key}`, value);
      
      if (result.success) {
        setLibrarySettings(prev => ({ ...prev, [key]: value }));
        return true;
      } else {
        setError(`Failed to set library setting: ${key}`);
        return false;
      }
    } catch (err) {
      console.error(`Error setting library setting ${key}:`, err);
      setError(`Failed to set library setting: ${key}`);
      return false;
    }
  }, []);

  /**
   * Reset all settings to defaults
   * @returns {Promise<boolean>} Success status
   */
  const resetSettings = useCallback(async () => {
    try {
      setError(null);
      
      const clearResult = await window.electronAPI.settingsClear();
      
      if (clearResult.success) {
        await initializeSettings();
        return true;
      } else {
        setError('Failed to reset settings');
        return false;
      }
    } catch (err) {
      console.error('Error resetting settings:', err);
      setError('Failed to reset settings');
      return false;
    }
  }, []);

  /**
   * Get all settings
   * @returns {object} All settings
   */
  const getAllSettings = useCallback(async () => {
    try {
      return await window.electronAPI.settingsGetAll();
    } catch (err) {
      console.error('Error getting all settings:', err);
      return {};
    }
  }, []);

  /**
   * Update multiple app settings at once
   * @param {object} updates - Settings to update
   * @returns {Promise<boolean>} Success status
   */
  const updateAppSettings = useCallback(async (updates) => {
    try {
      setError(null);
      
      for (const [key, value] of Object.entries(updates)) {
        const result = await window.electronAPI.settingsSet(`app.${key}`, value);
        if (!result.success) {
          throw new Error(`Failed to update ${key}`);
        }
      }
      
      setAppSettings(prev => ({ ...prev, ...updates }));
      return true;
    } catch (err) {
      console.error('Error updating app settings:', err);
      setError('Failed to update app settings');
      // Reload settings to ensure consistency
      await loadSettings();
      return false;
    }
  }, []);

  /**
   * Update multiple library settings at once
   * @param {object} updates - Settings to update
   * @returns {Promise<boolean>} Success status
   */
  const updateLibrarySettings = useCallback(async (updates) => {
    try {
      setError(null);
      
      for (const [key, value] of Object.entries(updates)) {
        const result = await window.electronAPI.settingsSet(`library.${key}`, value);
        if (!result.success) {
          throw new Error(`Failed to update ${key}`);
        }
      }
      
      setLibrarySettings(prev => ({ ...prev, ...updates }));
      return true;
    } catch (err) {
      console.error('Error updating library settings:', err);
      setError('Failed to update library settings');
      // Reload settings to ensure consistency
      await loadSettings();
      return false;
    }
  }, []);

  return {
    // State
    appSettings,
    librarySettings,
    isLoading,
    error,
    isInitialized,
    
    // App Settings
    getAppSetting,
    setAppSetting,
    updateAppSettings,
    
    // Library Settings
    getLibrarySetting,
    setLibrarySetting,
    updateLibrarySettings,
    
    // General Actions
    loadSettings,
    resetSettings,
    getAllSettings,
    
    // Common settings shortcuts
    theme: appSettings.theme || 'dark',
    volume: appSettings.volume || 0.8,
    autoPlay: appSettings.autoPlay || false,
    sortBy: librarySettings.sortBy || 'dateAdded',
    sortOrder: librarySettings.sortOrder || 'desc',
    viewMode: librarySettings.viewMode || 'grid'
  };
}

export default useSettings;