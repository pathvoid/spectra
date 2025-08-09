import { useState, useEffect } from 'react';
import backgroundDownloadService from '../services/backgroundDownloadService';

function BackgroundDownloadStatus() {
  const [status, setStatus] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Set up progress tracking
    backgroundDownloadService.setProgressCallback((progress) => {
      setStatus(progress);
      setIsVisible(progress.isProcessing || progress.total > 0);
    });

    backgroundDownloadService.setCompleteCallback((result) => {
      if (result.total > 0) {
        // Show completion message for a few seconds
        setTimeout(() => {
          setIsVisible(false);
        }, 5000);
        
        // Trigger library refresh across the app
        window.dispatchEvent(new CustomEvent('library-updated'));
      }
    });

    // Set up individual item completion callback to refresh library immediately
    backgroundDownloadService.setItemCompleteCallback(() => {
      // Trigger library refresh when any individual download completes
      window.dispatchEvent(new CustomEvent('library-updated'));
    });

    // Listen for background download start signal
    const removeListener = window.electronAPI.onStartBackgroundDownloads(() => {
      console.log('Starting background downloads...');
      backgroundDownloadService.startBackgroundDownloads();
    });

    return () => {
      removeListener();
    };
  }, []);

  if (!isVisible || !status) {
    return null;
  }

  const { current, completed, failed, remaining, total, isProcessing } = status;

  return (
    <div className="fixed bottom-4 right-4 bg-base-200 shadow-xl rounded-lg p-4 max-w-sm z-50">
      <div className="flex items-center gap-2 mb-2">
        {isProcessing && (
          <span className="loading loading-spinner loading-xs"></span>
        )}
        <h3 className="font-semibold text-sm">
          {isProcessing ? 'Downloading Missing Videos' : 'Downloads Complete'}
        </h3>
      </div>
      
      {current && (
        <div className="text-xs text-base-content/70 mb-2">
          Current: {current.title}
        </div>
      )}
      
      <div className="flex justify-between text-xs text-base-content/70 mb-2">
        <span>Progress: {completed + failed}/{total}</span>
        <span>Remaining: {remaining}</span>
      </div>
      
      {total > 0 && (
        <div className="w-full bg-base-300 rounded-full h-2 mb-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${((completed + failed) / total) * 100}%` }}
          ></div>
        </div>
      )}
      
      <div className="flex justify-between text-xs">
        <span className="text-success">✓ {completed} completed</span>
        {failed > 0 && (
          <span className="text-error">✗ {failed} failed</span>
        )}
      </div>
      
      {!isProcessing && total > 0 && (
        <div className="text-xs text-base-content/70 mt-2">
          {failed === 0 
            ? 'All videos downloaded successfully!' 
            : `${completed} downloaded, ${failed} failed`
          }
        </div>
      )}
    </div>
  );
}

export default BackgroundDownloadStatus;