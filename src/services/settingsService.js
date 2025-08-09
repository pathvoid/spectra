import settings from 'electron-settings';

/**
 * Settings Service for Spectra Media Center
 * Handles app settings and user library management using electron-settings
 */
class SettingsService {
  constructor() {
    this.initializeDefaults();
  }

  /**
   * Initialize default settings
   */
  async initializeDefaults() {
    try {
      // App settings defaults
      const appSettings = {
        theme: 'dark',
        autoPlay: false,
        volume: 0.8,
        quality: 'auto',
        downloadPath: null, // Will be set to user's downloads folder by default
        notifications: true,
        autoDownload: false
      };

      // Library settings defaults
      const librarySettings = {
        sortBy: 'dateAdded', // dateAdded, title, duration, fileSize
        sortOrder: 'desc', // desc, asc
        viewMode: 'grid', // grid, list
        showThumbnails: true,
        autoGenerateThumbnails: true
      };

      // Initialize if not exists
      if (!(await settings.has('app'))) {
        await settings.set('app', appSettings);
      }

      if (!(await settings.has('library'))) {
        await settings.set('library', librarySettings);
      }

      if (!(await settings.has('userLibrary'))) {
        await settings.set('userLibrary', []);
      }
    } catch (error) {
      console.error('Error initializing default settings:', error);
    }
  }

  // ===== APP SETTINGS =====

  /**
   * Get app setting value
   * @param {string} key - Setting key
   * @returns {Promise<any>} Setting value
   */
  async getAppSetting(key) {
    try {
      return await settings.get(`app.${key}`);
    } catch (error) {
      console.error(`Error getting app setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Set app setting value
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   */
  async setAppSetting(key, value) {
    try {
      await settings.set(`app.${key}`, value);
    } catch (error) {
      console.error(`Error setting app setting ${key}:`, error);
    }
  }

  /**
   * Get all app settings
   * @returns {Promise<object>} All app settings
   */
  async getAllAppSettings() {
    try {
      return await settings.get('app');
    } catch (error) {
      console.error('Error getting all app settings:', error);
      return {};
    }
  }

  // ===== LIBRARY SETTINGS =====

  /**
   * Get library setting value
   * @param {string} key - Setting key
   * @returns {Promise<any>} Setting value
   */
  async getLibrarySetting(key) {
    try {
      return await settings.get(`library.${key}`);
    } catch (error) {
      console.error(`Error getting library setting ${key}:`, error);
      return null;
    }
  }

  /**
   * Set library setting value
   * @param {string} key - Setting key
   * @param {any} value - Setting value
   */
  async setLibrarySetting(key, value) {
    try {
      await settings.set(`library.${key}`, value);
    } catch (error) {
      console.error(`Error setting library setting ${key}:`, error);
    }
  }

  // ===== USER LIBRARY MANAGEMENT =====

  /**
   * Get user library items
   * @returns {Promise<Array>} Array of library items
   */
  async getLibraryItems() {
    try {
      return await settings.get('userLibrary') || [];
    } catch (error) {
      console.error('Error getting library items:', error);
      return [];
    }
  }

  /**
   * Add item to user library
   * @param {object} item - Library item to add
   * @returns {Promise<boolean>} Success status
   */
  async addLibraryItem(item) {
    try {
      const library = await this.getLibraryItems();
      
      // Check if item already exists (by videoId or filePath)
      const exists = library.find(existingItem => 
        existingItem.videoId === item.videoId || 
        existingItem.filePath === item.filePath
      );

      if (exists) {
        console.log('Item already exists in library');
        return false;
      }

      // Add metadata
      const libraryItem = {
        ...item,
        id: Date.now().toString(), // Simple ID generation
        dateAdded: new Date().toISOString(),
        type: item.type || 'video', // video, audio, podcast, etc.
        tags: item.tags || [],
        isFavorite: false,
        playCount: 0,
        lastPlayed: null
      };

      library.push(libraryItem);
      await settings.set('userLibrary', library);
      return true;
    } catch (error) {
      console.error('Error adding library item:', error);
      return false;
    }
  }

  /**
   * Remove item from user library
   * @param {string} itemId - Item ID to remove
   * @returns {Promise<boolean>} Success status
   */
  async removeLibraryItem(itemId) {
    try {
      const library = await this.getLibraryItems();
      const filteredLibrary = library.filter(item => item.id !== itemId);
      
      if (filteredLibrary.length === library.length) {
        console.log('Item not found in library');
        return false;
      }

      await settings.set('userLibrary', filteredLibrary);
      return true;
    } catch (error) {
      console.error('Error removing library item:', error);
      return false;
    }
  }

  /**
   * Update library item
   * @param {string} itemId - Item ID to update
   * @param {object} updates - Updates to apply
   * @returns {Promise<boolean>} Success status
   */
  async updateLibraryItem(itemId, updates) {
    try {
      const library = await this.getLibraryItems();
      const itemIndex = library.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        console.log('Item not found in library');
        return false;
      }

      library[itemIndex] = { ...library[itemIndex], ...updates };
      await settings.set('userLibrary', library);
      return true;
    } catch (error) {
      console.error('Error updating library item:', error);
      return false;
    }
  }

  /**
   * Get library items with filtering and sorting
   * @param {object} options - Filter and sort options
   * @returns {Promise<Array>} Filtered and sorted library items
   */
  async getFilteredLibraryItems(options = {}) {
    try {
      let library = await this.getLibraryItems();
      
      // Apply filters
      if (options.type) {
        library = library.filter(item => item.type === options.type);
      }
      
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        library = library.filter(item => 
          item.title.toLowerCase().includes(searchTerm) ||
          (item.channel && item.channel.toLowerCase().includes(searchTerm)) ||
          (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
      }

      if (options.isFavorite) {
        library = library.filter(item => item.isFavorite);
      }

      // Apply sorting
      const sortBy = options.sortBy || await this.getLibrarySetting('sortBy') || 'dateAdded';
      const sortOrder = options.sortOrder || await this.getLibrarySetting('sortOrder') || 'desc';

      library.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case 'title':
            aValue = a.title.toLowerCase();
            bValue = b.title.toLowerCase();
            break;
          case 'duration':
            aValue = a.lengthSeconds || 0;
            bValue = b.lengthSeconds || 0;
            break;
          case 'dateAdded':
            aValue = new Date(a.dateAdded);
            bValue = new Date(b.dateAdded);
            break;
          case 'playCount':
            aValue = a.playCount || 0;
            bValue = b.playCount || 0;
            break;
          default:
            aValue = a.dateAdded;
            bValue = b.dateAdded;
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      return library;
    } catch (error) {
      console.error('Error getting filtered library items:', error);
      return [];
    }
  }

  /**
   * Update play statistics for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<boolean>} Success status
   */
  async updatePlayStats(itemId) {
    try {
      const library = await this.getLibraryItems();
      const itemIndex = library.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return false;
      }

      library[itemIndex].playCount = (library[itemIndex].playCount || 0) + 1;
      library[itemIndex].lastPlayed = new Date().toISOString();
      
      await settings.set('userLibrary', library);
      return true;
    } catch (error) {
      console.error('Error updating play stats:', error);
      return false;
    }
  }

  /**
   * Toggle favorite status for an item
   * @param {string} itemId - Item ID
   * @returns {Promise<boolean>} Success status
   */
  async toggleFavorite(itemId) {
    try {
      const library = await this.getLibraryItems();
      const itemIndex = library.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return false;
      }

      library[itemIndex].isFavorite = !library[itemIndex].isFavorite;
      await settings.set('userLibrary', library);
      return true;
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return false;
    }
  }

  /**
   * Clear all library items
   * @returns {Promise<boolean>} Success status
   */
  async clearLibrary() {
    try {
      await settings.set('userLibrary', []);
      return true;
    } catch (error) {
      console.error('Error clearing library:', error);
      return false;
    }
  }

  /**
   * Export library to JSON
   * @returns {Promise<string>} JSON string of library
   */
  async exportLibrary() {
    try {
      const library = await this.getLibraryItems();
      return JSON.stringify(library, null, 2);
    } catch (error) {
      console.error('Error exporting library:', error);
      return null;
    }
  }

  /**
   * Import library from JSON
   * @param {string} jsonData - JSON string of library data
   * @param {boolean} merge - Whether to merge with existing library
   * @returns {Promise<boolean>} Success status
   */
  async importLibrary(jsonData, merge = false) {
    try {
      const importedLibrary = JSON.parse(jsonData);
      
      if (!Array.isArray(importedLibrary)) {
        throw new Error('Invalid library format');
      }

      if (merge) {
        const existingLibrary = await this.getLibraryItems();
        const mergedLibrary = [...existingLibrary];
        
        importedLibrary.forEach(importedItem => {
          const exists = existingLibrary.find(item => 
            item.videoId === importedItem.videoId || 
            item.filePath === importedItem.filePath
          );
          
          if (!exists) {
            mergedLibrary.push({
              ...importedItem,
              id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
            });
          }
        });
        
        await settings.set('userLibrary', mergedLibrary);
      } else {
        await settings.set('userLibrary', importedLibrary);
      }
      
      return true;
    } catch (error) {
      console.error('Error importing library:', error);
      return false;
    }
  }
}

// Export singleton instance
const settingsService = new SettingsService();
export default settingsService;