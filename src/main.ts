import { app, BrowserWindow, protocol, screen, Menu } from 'electron';
import path from 'node:path';
import fs from 'fs';
import started from 'electron-squirrel-startup';
import settings from 'electron-settings';
import { registerSettingsHandlers, registerLibraryHandlers, registerYouTubeHandlers } from './ipc';

// Global type declaration for file path mapping
declare global {
  var getFilePathFromId: ((id: string) => string | undefined) | undefined;
}

// Check if we're in development mode
const isDevelopment = !!MAIN_WINDOW_VITE_DEV_SERVER_URL;

// Handle creating/removing shortcuts on Windows when installing/uninstalling
if (started) {
  app.quit();
}

// Single instance lock - prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  console.log('Another instance is already running, quitting...');
  app.quit();
} else {
  // Handle second instance launch
  app.on('second-instance', () => {
    console.log('Second instance attempted to launch');
    
    // Focus the existing window
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      
      // Restore window if minimized
      if (mainWindow.isMinimized()) {
        mainWindow.restore();
      }
      
      // Focus the window
      mainWindow.focus();
      
      // Bring to front
      mainWindow.setAlwaysOnTop(true);
      mainWindow.setAlwaysOnTop(false);
    }
  });
}

// Register the protocol as privileged (must be done before app ready)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'spectra-video',
    privileges: {
      secure: true,
      standard: true,
      supportFetchAPI: true,
      corsEnabled: false
    }
  }
]);

// Register custom protocol for secure video file access
app.whenReady().then(() => {
  protocol.handle('spectra-video', async (request) => {
    console.log('🎬 Custom protocol handler called with URL:', request.url);
    try {
      // Extract file ID from spectra-video://fileId
      let fileId = request.url.substring(15); // Remove 'spectra-video://'
      
      // Remove leading slash if present (Electron adds this)
      if (fileId.startsWith('/')) {
        fileId = fileId.substring(1);
      }
      
      // Remove trailing slash if present
      if (fileId.endsWith('/')) {
        fileId = fileId.substring(0, fileId.length - 1);
      }
      
      console.log('File ID:', fileId);
      
      // Get the actual file path from the global mapping
      const filePath = global.getFilePathFromId && global.getFilePathFromId(fileId);
      
      if (!filePath) {
        console.error('File ID not found in mapping:', fileId);
        return new Response('Not Found', { 
          status: 404, 
          statusText: 'File ID not found' 
        });
      }
      
      console.log('Resolved file path:', filePath);
      
      // Security check: only allow access to files in our downloads directory (including source subdirectories)
      const downloadsDir = path.join(app.getPath('userData'), 'downloads');
      const resolvedPath = path.resolve(filePath);
      const normalizedDownloadsDir = path.resolve(downloadsDir);
      
      console.log('Downloads directory:', normalizedDownloadsDir);
      console.log('Resolved file path:', resolvedPath);
      
      // Normalize paths for Windows compatibility
      const normalizedFilePath = path.normalize(resolvedPath);
      const normalizedDownloadsPath = path.normalize(normalizedDownloadsDir);
      
      console.log('Normalized file path:', normalizedFilePath);
      console.log('Normalized downloads path:', normalizedDownloadsPath);
      console.log('Path starts with check:', normalizedFilePath.startsWith(normalizedDownloadsPath));
      
      if (!normalizedFilePath.startsWith(normalizedDownloadsPath)) {
        console.error('Blocked access to file outside downloads directory');
        console.error('File path:', normalizedFilePath);
        console.error('Downloads dir:', normalizedDownloadsPath);
        return new Response('Forbidden', { 
          status: 403, 
          statusText: 'Access denied to file outside downloads directory' 
        });
      }
      
      if (!fs.existsSync(normalizedFilePath)) {
        console.error('Video file not found:', normalizedFilePath);
        return new Response('Not Found', { 
          status: 404, 
          statusText: 'Video file not found' 
        });
      }

      // Get file stats for proper headers
      const stats = fs.statSync(normalizedFilePath);
      
      // Determine MIME type based on file extension
      const ext = path.extname(normalizedFilePath).toLowerCase();
      let mimeType = 'video/mp4'; // Default
      switch (ext) {
        case '.mp4': mimeType = 'video/mp4'; break;
        case '.webm': mimeType = 'video/webm'; break;
        case '.avi': mimeType = 'video/x-msvideo'; break;
        case '.mov': mimeType = 'video/quicktime'; break;
        case '.mkv': mimeType = 'video/x-matroska'; break;
      }

      // Handle range requests for video seeking
      const range = request.headers.get('range');
      console.log(`Serving video file: ${path.basename(normalizedFilePath)} (${Math.round(stats.size / 1024 / 1024)}MB)${range ? ` - Range: ${range}` : ''}`);

      if (range) {
        // Parse range header (e.g., "bytes=0-1023" or "bytes=1024-")
        const matches = range.match(/bytes=(\d+)-(\d*)/);
        if (matches) {
          const start = parseInt(matches[1], 10);
          const end = matches[2] ? parseInt(matches[2], 10) : stats.size - 1;
          const chunkSize = (end - start) + 1;

          // Validate range
          if (start >= stats.size || end >= stats.size || start > end) {
            return new Response('Range Not Satisfiable', {
              status: 416,
              headers: {
                'Content-Range': `bytes */${stats.size}`
              }
            });
          }

          // Create stream for the requested range
          const fileStream = fs.createReadStream(normalizedFilePath, { start, end });

          return new Response(fileStream as any, {
            status: 206, // Partial Content
            headers: {
              'Content-Type': mimeType,
              'Content-Length': chunkSize.toString(),
              'Content-Range': `bytes ${start}-${end}/${stats.size}`,
              'Accept-Ranges': 'bytes',
              'Cache-Control': 'no-cache'
            }
          });
        }
      }

      // Handle normal (non-range) requests
      const fileStream = fs.createReadStream(normalizedFilePath);

      return new Response(fileStream as any, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Length': stats.size.toString(),
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-cache'
        }
      });
      
    } catch (error) {
      console.error('Error in custom protocol handler:', error);
      return new Response('Internal Server Error', { 
        status: 500, 
        statusText: 'Failed to serve video file' 
      });
    }
  });
});

const createWindow = async () => {
  // Get saved window state or use defaults
  const defaultWindowState: {
    width: number;
    height: number;
    x: number | undefined;
    y: number | undefined;
    isMaximized: boolean;
  } = {
    width: 1200,
    height: 800,
    x: undefined,
    y: undefined,
    isMaximized: false
  };

  const savedWindowState = await settings.get('windowState') as typeof defaultWindowState || defaultWindowState;
  
  // Validate saved state (ensure window is visible on available displays)
  const displays = screen.getAllDisplays();
  const windowState = { ...defaultWindowState, ...savedWindowState };
  
  // Check if saved position is still valid (display might have been disconnected)
  if (windowState.x !== undefined && windowState.y !== undefined) {
    const isVisibleOnAnyDisplay = displays.some((display: Electron.Display) => {
      const { x, y, width, height } = display.bounds;
      return typeof windowState.x === 'number' && typeof windowState.y === 'number' &&
             windowState.x >= x && windowState.x < x + width &&
             windowState.y >= y && windowState.y < y + height;
    });
    
    if (!isVisibleOnAnyDisplay) {
      // Reset position if window would be off-screen
      windowState.x = undefined;
      windowState.y = undefined;
    }
  }

  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    show: false, // Don't show until ready
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow local file access for video playback
      allowRunningInsecureContent: true,
      experimentalFeatures: true
    },
  });

  // and load the index.html of the app
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    // Try multiple possible paths for the packaged app
    const possiblePaths = [
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      path.join(__dirname, '../renderer/index.html'),
      path.join(__dirname, './index.html'),
      path.join(process.resourcesPath, 'app/renderer/index.html')
    ];
    
    let indexPath = possiblePaths[0]; // Default
    
    // Find the first path that exists
    for (const testPath of possiblePaths) {
      if (fs.existsSync(testPath)) {
        indexPath = testPath;
        console.log('Found index.html at:', indexPath);
        break;
      }
    }
    
    mainWindow.loadFile(indexPath);
  }

  // Restore maximized state
  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  // Show window once it's ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Save window state when it changes (throttled to prevent excessive saves)
  let saveTimeout: NodeJS.Timeout | null = null;
  let originalBounds: { width: number; height: number; x: number; y: number } | null = null;
  
  const saveWindowState = async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    saveTimeout = setTimeout(async () => {
      try {
        const bounds = mainWindow.getBounds();
        const isMaximized = mainWindow.isMaximized();
        
        // Store original bounds when window is not maximized
        if (!isMaximized) {
          originalBounds = { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y };
        }
        
        // Use original bounds for saving, but keep maximized state
        const saveBounds = originalBounds || bounds;
        
        await settings.set('windowState', {
          width: saveBounds.width,
          height: saveBounds.height,
          x: saveBounds.x,
          y: saveBounds.y,
          isMaximized: isMaximized
        });
      } catch (error) {
        console.error('Failed to save window state:', error);
      }
    }, 500); // Save after 500ms of no changes
  };

  // Listen for window state changes
  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  // Save state immediately when app is closing (bypass throttling)
  mainWindow.on('close', async () => {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    try {
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();
      
      // Use original bounds for saving, but keep maximized state
      const saveBounds = originalBounds || bounds;
      
      await settings.set('windowState', {
        width: saveBounds.width,
        height: saveBounds.height,
        x: saveBounds.x,
        y: saveBounds.y,
        isMaximized: isMaximized
      });
      
      console.log('Final window state saved on close');
    } catch (error) {
      console.error('Failed to save window state on close:', error);
    }
  });

  // Register all IPC handlers
  registerYouTubeHandlers();
  registerSettingsHandlers();
  registerLibraryHandlers();
  
  // Initialize background download service after window is ready
  mainWindow.webContents.once('did-finish-load', () => {
    // Give the renderer process a moment to initialize
    setTimeout(() => {
      mainWindow.webContents.send('start-background-downloads');
    }, 2000);
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows
// Some APIs can only be used after this event occurs
app.on('ready', () => {
  // Configure menu based on environment
  configureMenu();
  createWindow();
});

// Function to configure the application menu
const configureMenu = () => {
  if (!isDevelopment) {
    // In production, create a minimal menu with only File - Exit
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'Exit',
            accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
            click: () => {
              app.quit();
            }
          }
        ]
      }
    ];
    
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
};

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