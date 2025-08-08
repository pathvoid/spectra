import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  youtubeSearch: (query: string) => ipcRenderer.invoke('youtube-search', query),
  fetchVideoDetails: (videoId: string) => ipcRenderer.invoke('fetch-video-details', videoId),
  downloadVideo: (videoId: string) => ipcRenderer.invoke('download-video', videoId),
  getVideoBlob: (filePath: string) => ipcRenderer.invoke('get-video-blob', filePath)
});
