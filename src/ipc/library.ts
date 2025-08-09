import { ipcMain } from 'electron';
import settings from 'electron-settings';

/**
 * Library IPC Handlers
 * Manages user library operations and storage
 */

export function registerLibraryHandlers() {
  // Add item to library with additional metadata
  ipcMain.handle('library-add-item', async (event, item) => {
    try {
      const libraryData = await settings.get('userLibrary') || [];
      const library = Array.isArray(libraryData) ? libraryData as Record<string, unknown>[] : [];
      
      // Check if item already exists
      const exists = library.find((existingItem) => 
        existingItem.videoId === item.videoId || 
        existingItem.filePath === item.filePath
      );

      if (exists) {
        return { success: false, message: 'Item already exists in library' };
      }

      const libraryItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        dateAdded: new Date().toISOString(),
        type: item.type || 'video',
        tags: item.tags || [],
        isFavorite: false,
        playCount: 0,
        lastPlayed: null
      };

      library.push(libraryItem);
      await settings.set('userLibrary', library as any);
      return { success: true, item: libraryItem };
    } catch (error) {
      console.error('Error adding library item:', error);
      return { success: false, error: error.message };
    }
  });

  // Remove item from library
  ipcMain.handle('library-remove-item', async (event, itemId) => {
    try {
      const libraryData = await settings.get('userLibrary') || [];
      const library = Array.isArray(libraryData) ? libraryData as Record<string, unknown>[] : [];
      
      const filteredLibrary = library.filter(item => item.id !== itemId);
      
      if (filteredLibrary.length === library.length) {
        return { success: false, message: 'Item not found in library' };
      }

      await settings.set('userLibrary', filteredLibrary as any);
      return { success: true };
    } catch (error) {
      console.error('Error removing library item:', error);
      return { success: false, error: error.message };
    }
  });

  // Update library item
  ipcMain.handle('library-update-item', async (event, itemId, updates) => {
    try {
      const libraryData = await settings.get('userLibrary') || [];
      const library = Array.isArray(libraryData) ? libraryData as Record<string, unknown>[] : [];
      
      const itemIndex = library.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return { success: false, message: 'Item not found in library' };
      }

      library[itemIndex] = { ...library[itemIndex], ...updates };
      await settings.set('userLibrary', library as any);
      return { success: true, item: library[itemIndex] };
    } catch (error) {
      console.error('Error updating library item:', error);
      return { success: false, error: error.message };
    }
  });

  // Get library items with filtering and sorting
  ipcMain.handle('library-get-items', async (event, options = {}) => {
    try {
      const libraryData = await settings.get('userLibrary') || [];
      let library = Array.isArray(libraryData) ? libraryData as Record<string, unknown>[] : [];
      
      // Apply filters
      if (options.type) {
        library = library.filter(item => item.type === options.type);
      }
      
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        library = library.filter(item => 
          (item.title as string)?.toLowerCase().includes(searchTerm) ||
          (item.channel as string)?.toLowerCase().includes(searchTerm) ||
          (item.tags as string[])?.some(tag => tag.toLowerCase().includes(searchTerm))
        );
      }

      if (options.isFavorite) {
        library = library.filter(item => item.isFavorite);
      }

      // Apply sorting
      const sortBy = options.sortBy || 'dateAdded';
      const sortOrder = options.sortOrder || 'desc';

      library.sort((a, b) => {
        let aValue, bValue;

        switch (sortBy) {
          case 'title':
            aValue = (a.title as string)?.toLowerCase() || '';
            bValue = (b.title as string)?.toLowerCase() || '';
            break;
          case 'duration':
            aValue = (a.lengthSeconds as number) || 0;
            bValue = (b.lengthSeconds as number) || 0;
            break;
          case 'dateAdded':
            aValue = new Date(a.dateAdded as string);
            bValue = new Date(b.dateAdded as string);
            break;
          case 'playCount':
            aValue = (a.playCount as number) || 0;
            bValue = (b.playCount as number) || 0;
            break;
          default:
            aValue = new Date(a.dateAdded as string);
            bValue = new Date(b.dateAdded as string);
        }

        if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      return { success: true, items: library };
    } catch (error) {
      console.error('Error getting library items:', error);
      return { success: false, error: error.message, items: [] };
    }
  });

  // Toggle favorite status
  ipcMain.handle('library-toggle-favorite', async (event, itemId) => {
    try {
      const libraryData = await settings.get('userLibrary') || [];
      const library = Array.isArray(libraryData) ? libraryData as Record<string, unknown>[] : [];
      
      const itemIndex = library.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return { success: false, message: 'Item not found in library' };
      }

      library[itemIndex].isFavorite = !library[itemIndex].isFavorite;
      await settings.set('userLibrary', library as any);
      return { success: true, item: library[itemIndex] };
    } catch (error) {
      console.error('Error toggling favorite:', error);
      return { success: false, error: error.message };
    }
  });

  // Update play statistics
  ipcMain.handle('library-update-play-stats', async (event, itemId) => {
    try {
      const libraryData = await settings.get('userLibrary') || [];
      const library = Array.isArray(libraryData) ? libraryData as Record<string, unknown>[] : [];
      
      const itemIndex = library.findIndex(item => item.id === itemId);
      
      if (itemIndex === -1) {
        return { success: false, message: 'Item not found in library' };
      }

      library[itemIndex].playCount = ((library[itemIndex].playCount as number) || 0) + 1;
      library[itemIndex].lastPlayed = new Date().toISOString();
      
      await settings.set('userLibrary', library as any);
      return { success: true, item: library[itemIndex] };
    } catch (error) {
      console.error('Error updating play stats:', error);
      return { success: false, error: error.message };
    }
  });

  // Clear entire library
  ipcMain.handle('library-clear', async () => {
    try {
      await settings.set('userLibrary', []);
      return { success: true };
    } catch (error) {
      console.error('Error clearing library:', error);
      return { success: false, error: error.message };
    }
  });

  // Export library
  ipcMain.handle('library-export', async () => {
    try {
      const libraryData = await settings.get('userLibrary') || [];
      return { success: true, data: JSON.stringify(libraryData, null, 2) };
    } catch (error) {
      console.error('Error exporting library:', error);
      return { success: false, error: error.message };
    }
  });

  // Import library
  ipcMain.handle('library-import', async (event, jsonData, merge = false) => {
    try {
      const importedLibrary = JSON.parse(jsonData);
      
      if (!Array.isArray(importedLibrary)) {
        throw new Error('Invalid library format');
      }

      if (merge) {
        const existingLibraryData = await settings.get('userLibrary') || [];
        const existingLibrary = Array.isArray(existingLibraryData) ? existingLibraryData as Record<string, unknown>[] : [];
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
        
        await settings.set('userLibrary', mergedLibrary as any);
      } else {
        await settings.set('userLibrary', importedLibrary as any);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error importing library:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('Library IPC handlers registered successfully');
}