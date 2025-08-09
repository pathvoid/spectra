import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing the user library
 * Provides CRUD operations and state management for library items
 */
function useLibrary() {
  const [libraryItems, setLibraryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize settings and load library on mount
  useEffect(() => {
    initializeLibrary();
  }, []);

  // Force reload library items (useful for synchronization)
  const forceReload = useCallback(async () => {
    await loadLibraryItems();
  }, []);

  /**
   * Initialize the library system
   */
  const initializeLibrary = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Initialize default settings
      await window.electronAPI.settingsInitialize();
      
      // Load existing library items
      await loadLibraryItems();
      
      setIsInitialized(true);
    } catch (err) {
      console.error('Error initializing library:', err);
      setError('Failed to initialize library');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load library items from storage
   */
  const loadLibraryItems = async () => {
    try {
      const items = await window.electronAPI.settingsGet('userLibrary');
      setLibraryItems(items || []);
    } catch (err) {
      console.error('Error loading library items:', err);
      setError('Failed to load library items');
    }
  };

  /**
   * Add a new item to the library
   * @param {object} item - Item to add
   * @returns {Promise<boolean>} Success status
   */
  const addLibraryItem = useCallback(async (item) => {
    try {
      setError(null);
      
      const result = await window.electronAPI.libraryAddItem(item);
      
      if (result.success) {
        // Immediately update local state with the new item
        setLibraryItems(prev => [...prev, result.item]);
        return true;
      } else {
        setError(result.message || 'Failed to add item to library');
        return false;
      }
    } catch (err) {
      console.error('Error adding library item:', err);
      setError('Failed to add item to library');
      return false;
    }
  }, []);

  /**
   * Remove an item from the library
   * @param {string} itemId - ID of item to remove
   * @returns {Promise<boolean>} Success status
   */
  const removeLibraryItem = useCallback(async (itemId) => {
    try {
      setError(null);
      
      const currentLibrary = await window.electronAPI.settingsGet('userLibrary');
      const filteredLibrary = currentLibrary.filter(item => item.id !== itemId);
      
      const result = await window.electronAPI.settingsSet('userLibrary', filteredLibrary);
      
      if (result.success) {
        // Immediately update local state
        setLibraryItems(prev => prev.filter(item => item.id !== itemId));
        return true;
      } else {
        setError('Failed to remove item from library');
        return false;
      }
    } catch (err) {
      console.error('Error removing library item:', err);
      setError('Failed to remove item from library');
      return false;
    }
  }, []);

  /**
   * Update an existing library item
   * @param {string} itemId - ID of item to update
   * @param {object} updates - Updates to apply
   * @returns {Promise<boolean>} Success status
   */
  const updateLibraryItem = useCallback(async (itemId, updates) => {
    try {
      setError(null);
      
      const currentLibrary = await window.electronAPI.settingsGet('userLibrary');
      const itemIndex = currentLibrary.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        setError('Item not found in library');
        return false;
      }

      currentLibrary[itemIndex] = { ...currentLibrary[itemIndex], ...updates };
      
      const result = await window.electronAPI.settingsSet('userLibrary', currentLibrary);
      
      if (result.success) {
        // Immediately update local state
        setLibraryItems(prev => 
          prev.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
        );
        return true;
      } else {
        setError('Failed to update library item');
        return false;
      }
    } catch (err) {
      console.error('Error updating library item:', err);
      setError('Failed to update library item');
      return false;
    }
  }, []);

  /**
   * Toggle favorite status for an item
   * @param {string} itemId - ID of item
   * @returns {Promise<boolean>} Success status
   */
  const toggleFavorite = useCallback(async (itemId) => {
    try {
      const currentLibrary = await window.electronAPI.settingsGet('userLibrary');
      const item = currentLibrary.find(item => item.id === itemId);
      
      if (!item) {
        setError('Item not found in library');
        return false;
      }

      return await updateLibraryItem(itemId, { isFavorite: !item.isFavorite });
    } catch (err) {
      console.error('Error toggling favorite:', err);
      setError('Failed to toggle favorite status');
      return false;
    }
  }, [updateLibraryItem]);

  /**
   * Update play statistics for an item
   * @param {string} itemId - ID of item
   * @returns {Promise<boolean>} Success status
   */
  const updatePlayStats = useCallback(async (itemId) => {
    try {
      const currentLibrary = await window.electronAPI.settingsGet('userLibrary');
      const item = currentLibrary.find(item => item.id === itemId);
      
      if (!item) {
        return false;
      }

      const updates = {
        playCount: (item.playCount || 0) + 1,
        lastPlayed: new Date().toISOString()
      };

      return await updateLibraryItem(itemId, updates);
    } catch (err) {
      console.error('Error updating play stats:', err);
      return false;
    }
  }, [updateLibraryItem]);

  /**
   * Get filtered and sorted library items
   * @param {object} filters - Filter options
   * @returns {Array} Filtered library items
   */
  const getFilteredItems = useCallback((filters = {}) => {
    let filtered = [...libraryItems];

    // Apply type filter
    if (filters.type) {
      filtered = filtered.filter(item => item.type === filters.type);
    }

    // Apply search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(searchTerm) ||
        (item.channel && item.channel.toLowerCase().includes(searchTerm)) ||
        (item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      );
    }

    // Apply favorite filter
    if (filters.favorites) {
      filtered = filtered.filter(item => item.isFavorite);
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'dateAdded';
    const sortOrder = filters.sortOrder || 'desc';

    filtered.sort((a, b) => {
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
          aValue = new Date(a.dateAdded);
          bValue = new Date(b.dateAdded);
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [libraryItems]);

  /**
   * Clear the entire library
   * @returns {Promise<boolean>} Success status
   */
  const clearLibrary = useCallback(async () => {
    try {
      setError(null);
      
      const result = await window.electronAPI.settingsSet('userLibrary', []);
      
      if (result.success) {
        await loadLibraryItems();
        return true;
      } else {
        setError('Failed to clear library');
        return false;
      }
    } catch (err) {
      console.error('Error clearing library:', err);
      setError('Failed to clear library');
      return false;
    }
  }, []);

  /**
   * Check if an item exists in the library
   * @param {string} videoId - Video ID to check
   * @param {string} filePath - File path to check
   * @returns {boolean} True if item exists
   */
  const itemExists = useCallback((videoId, filePath) => {
    return libraryItems.some(item => 
      item.videoId === videoId || item.filePath === filePath
    );
  }, [libraryItems]);

  return {
    // State
    libraryItems,
    isLoading,
    error,
    isInitialized,
    
    // Actions
    addLibraryItem,
    removeLibraryItem,
    updateLibraryItem,
    toggleFavorite,
    updatePlayStats,
    clearLibrary,
    loadLibraryItems,
    forceReload,
    
    // Utilities
    getFilteredItems,
    itemExists,
    
    // Stats
    totalItems: libraryItems.length,
    favoriteItems: libraryItems.filter(item => item.isFavorite).length
  };
}

export default useLibrary;