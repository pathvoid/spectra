import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import play from 'play-dl';

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools
mainWindow.webContents.openDevTools();

// IPC handlers for YouTube search
ipcMain.handle('youtube-search', async (event, query) => {
  try {
    const searchResults = await play.search(query, {
      limit: 12
    });

    // Transform the results to match our UI format
    const transformedResults = searchResults.map((result, index) => ({
      id: `yt${index + 1}`,
      title: result.title,
      channel: result.channel?.name || 'Unknown Channel',
      duration: formatDuration(result.durationInSec),
      views: formatViews(result.views),
      thumbnail: result.thumbnails?.[0]?.url || 'https://placehold.co/100x100',
      url: result.url
    }));

    return transformedResults;
  } catch (error) {
    console.error('YouTube search error:', error);
    throw error;
  }
});

// Helper functions
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (!views) return '0 views';
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows
// Some APIs can only be used after this event occurs
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});