import { ipcMain } from 'electron';
import settings from 'electron-settings';
import fs from 'fs';

/**
 * Library IPC Handlers
 * Manages user library operations and storage
 */

interface LibraryItem {
  [key: string]: unknown; // Index signature for electron-settings compatibility
  id: string;
  videoId: string;
  title: string;
  channel?: string;
  thumbnail?: string;
  url?: string;
  filePath?: string;
  fileName?: string;
  lengthSeconds?: number;
  views?: string;
  dateAdded: string;
  type: string;
  tags: string[];
  isFavorite: boolean;
  playCount: number;
  lastPlayed: string | null;
  source?: string;
  downloadStatus?: 'pending' | 'downloading' | 'completed' | 'failed';
  downloadStarted?: string;
  downloadCompleted?: string;
  fileSize?: number;
  videoDetails?: {
    title: string;
    description?: string;
    author?: string;
    lengthSeconds?: number;
    viewCount?: number;
    published?: string;
    videoThumbnails?: unknown[];
    formatStreams?: unknown[];
    adaptiveFormats?: unknown[];
  };
  cachedAt?: string;
}
  
/**
 * Validate if a downloaded file is complete and not corrupted
 */
function validateVideoFile(filePath: string, expectedSize?: number): boolean {
  try {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const stats = fs.statSync(filePath);
    
    // Check if file size is reasonable (> 1MB for videos)
    if (stats.size < 1024 * 1024) {
      console.log(`File too small, likely incomplete: ${filePath} (${stats.size} bytes)`);
      return false;
    }

    // If we have expected size, check if it matches (allow 5% variance for encoding differences)
    if (expectedSize && expectedSize > 0) {
      const sizeDifference = Math.abs(stats.size - expectedSize) / expectedSize;
      if (sizeDifference > 0.05) {
        console.log(`File size mismatch: expected ~${expectedSize}, got ${stats.size}`);
        return false;
      }
    }

    // TODO: Could add more validation like checking file headers
    return true;
  } catch (error) {
    console.error('Error validating file:', error);
    return false;
  }
}

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

      const libraryItem: LibraryItem = {
        ...item,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        dateAdded: new Date().toISOString(),
        type: item.type || 'video',
        tags: item.tags || [],
        isFavorite: false,
        playCount: 0,
        lastPlayed: null,
        videoId: item.videoId || '',
        title: item.title || 'Unknown Title',
        // Set download status based on whether file exists and is valid
        downloadStatus: item.filePath && validateVideoFile(item.filePath as string, item.fileSize as number) 
          ? 'completed' 
          : item.filePath 
            ? 'failed'  // File exists but invalid
            : 'pending', // No file yet
        downloadStarted: item.downloadStarted as string,
        downloadCompleted: item.filePath && validateVideoFile(item.filePath as string, item.fileSize as number) 
          ? (item.downloadCompleted as string || new Date().toISOString())
          : undefined,
        fileSize: item.fileSize as number
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