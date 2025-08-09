import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // YouTube and video functionality
  youtubeSearch: (query: string) => ipcRenderer.invoke('youtube-search', query),
  fetchVideoDetails: (videoId: string) => ipcRenderer.invoke('fetch-video-details', videoId),
  downloadVideo: (videoId: string) => ipcRenderer.invoke('download-video', videoId),
  getVideoBlob: (filePath: string) => ipcRenderer.invoke('get-video-blob', filePath),
  deleteVideoFile: (filePath: string) => ipcRenderer.invoke('delete-video-file', filePath),
  
  // Settings functionality
  settingsInitialize: () => ipcRenderer.invoke('settings-initialize'),
  settingsGet: (key: string) => ipcRenderer.invoke('settings-get', key),
  settingsSet: (key: string, value: unknown) => ipcRenderer.invoke('settings-set', key, value),
  settingsHas: (key: string) => ipcRenderer.invoke('settings-has', key),
  settingsGetAll: () => ipcRenderer.invoke('settings-get-all'),
  settingsClear: () => ipcRenderer.invoke('settings-clear'),
  
  // Library functionality
  libraryAddItem: (item: Record<string, unknown>) => ipcRenderer.invoke('library-add-item', item),
  libraryRemoveItem: (itemId: string) => ipcRenderer.invoke('library-remove-item', itemId),
  libraryUpdateItem: (itemId: string, updates: Record<string, unknown>) => ipcRenderer.invoke('library-update-item', itemId, updates),
  libraryGetItems: (options?: Record<string, unknown>) => ipcRenderer.invoke('library-get-items', options),
  libraryToggleFavorite: (itemId: string) => ipcRenderer.invoke('library-toggle-favorite', itemId),
  libraryUpdatePlayStats: (itemId: string) => ipcRenderer.invoke('library-update-play-stats', itemId),
  libraryClear: () => ipcRenderer.invoke('library-clear'),
  libraryExport: () => ipcRenderer.invoke('library-export'),
  libraryImport: (jsonData: string, merge?: boolean) => ipcRenderer.invoke('library-import', jsonData, merge),

  // Background download events
  onStartBackgroundDownloads: (callback: () => void) => {
    ipcRenderer.on('start-background-downloads', callback);
    return () => ipcRenderer.removeListener('start-background-downloads', callback);
  }
});
