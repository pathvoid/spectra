import { useState, useEffect } from 'react';

function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateInfo, setUpdateInfo] = useState(null);

  useEffect(() => {
    // Listen for update available event
    const removeUpdateAvailable = window.electronAPI.onUpdateAvailable((info) => {
      console.log('Update available:', info);
      setUpdateAvailable(true);
      setUpdateInfo(info);
    });

    // Listen for update downloaded event
    const removeUpdateDownloaded = window.electronAPI.onUpdateDownloaded((info) => {
      console.log('Update downloaded:', info);
      setUpdateDownloaded(true);
      setDownloading(false);
      setDownloadProgress(100);
    });

    // Listen for download progress
    const removeDownloadProgress = window.electronAPI.onUpdateDownloadProgress((progress) => {
      console.log('Download progress:', progress);
      setDownloadProgress(progress.percent || 0);
    });

    // Cleanup listeners on unmount
    return () => {
      removeUpdateAvailable();
      removeUpdateDownloaded();
      removeDownloadProgress();
    };
  }, []);

  const handleDownloadUpdate = async () => {
    setDownloading(true);
    setDownloadProgress(0);
    
    try {
      await window.electronAPI.autoUpdaterDownloadUpdate();
    } catch (error) {
      console.error('Failed to download update:', error);
      setDownloading(false);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await window.electronAPI.autoUpdaterInstallUpdate();
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  };

  if (!updateAvailable && !updateDownloaded) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      <div className="bg-base-100 border border-base-300 rounded-lg shadow-lg p-4">
        {updateAvailable && !updateDownloaded && (
          <div>
            <h3 className="font-semibold text-lg mb-2">Update Available</h3>
            <p className="text-sm text-base-content/70 mb-3">
              A new version of Spectra is available.
            </p>
            {downloading ? (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Downloading...</span>
                  <span>{Math.round(downloadProgress)}%</span>
                </div>
                <progress 
                  className="progress progress-primary w-full" 
                  value={downloadProgress} 
                  max="100"
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <button 
                  className="btn btn-primary btn-sm"
                  onClick={handleDownloadUpdate}
                >
                  Download Update
                </button>
                <button 
                  className="btn btn-ghost btn-sm"
                  onClick={() => setUpdateAvailable(false)}
                >
                  Later
                </button>
              </div>
            )}
          </div>
        )}

        {updateDownloaded && (
          <div>
            <h3 className="font-semibold text-lg mb-2">Update Ready</h3>
            <p className="text-sm text-base-content/70 mb-3">
              The update has been downloaded and is ready to install.
            </p>
            <div className="flex gap-2">
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleInstallUpdate}
              >
                Install & Restart
              </button>
              <button 
                className="btn btn-ghost btn-sm"
                onClick={() => setUpdateDownloaded(false)}
              >
                Later
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpdateNotification;
