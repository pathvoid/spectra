import { useState, useEffect } from 'react';
import useLibrary from '../hooks/useLibrary';
import downloadManager from '../services/downloadManager';
import { getSourceConfig } from '../utils/sourceManager';

function SearchResults({ results, searchQuery, searchResults, navigate }) {
  const [downloadingItems, setDownloadingItems] = useState(new Set());
  const [libraryStatus, setLibraryStatus] = useState(new Map()); // videoId -> boolean
  const { addLibraryItem, itemExists, forceReload } = useLibrary();
  
  // Helper function to check library status directly from storage (bypasses hook cache)
  const checkLibraryDirect = async (videoId) => {
    try {
      const libraryItems = await window.electronAPI.settingsGet('userLibrary') || [];
      return libraryItems.some(item => item.videoId === videoId);
    } catch (error) {
      console.error('Error checking library direct:', error);
      return false;
    }
  };
  
  // Update library status map when library data changes
  useEffect(() => {
    const updateLibraryStatus = async () => {
      const newStatus = new Map();
      for (const result of results) {
        const inLibraryHook = itemExists(result.videoId, null);
        const inLibraryDirect = await checkLibraryDirect(result.videoId);
        const actualInLibrary = inLibraryHook || inLibraryDirect;
        newStatus.set(result.videoId, actualInLibrary);
      }
      setLibraryStatus(newStatus);
    };
    
    updateLibraryStatus();
  }, [results, itemExists]);

  // Listen for library updates to refresh state and clear downloading items
  useEffect(() => {
    const handleLibraryUpdate = () => {
      console.log('Library updated event received in SearchResults');
      forceReload();
      
      // Clear local downloading state when library updates, as downloads may have completed
      setDownloadingItems(new Set());
      
      // Update library status for all videos
      const updateStatus = async () => {
        const newStatus = new Map();
        for (const result of results) {
          const inLibraryDirect = await checkLibraryDirect(result.videoId);
          newStatus.set(result.videoId, inLibraryDirect);
        }
        setLibraryStatus(newStatus);
      };
      updateStatus();
    };
    
    const handleVideoDownloadCompleted = (event) => {
      const { videoId } = event.detail;
      console.log(`Video download completed event received for videoId: ${videoId}`);
      
      // Clear download manager state for this video since it completed
      downloadManager.clearDownload(videoId);
      
      // Clear local downloading state
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        // Remove by videoId from results
        results.forEach(result => {
          if (result.videoId === videoId) {
            newSet.delete(result.id);
          }
        });
        return newSet;
      });
    };
    
    window.addEventListener('library-updated', handleLibraryUpdate);
    window.addEventListener('video-download-completed', handleVideoDownloadCompleted);
    
    return () => {
      window.removeEventListener('library-updated', handleLibraryUpdate);
      window.removeEventListener('video-download-completed', handleVideoDownloadCompleted);
    };
  }, [forceReload, results]);

  // Clean up downloading state when component unmounts or results change
  useEffect(() => {
    // Clear downloading state when search results change (new search)
    setDownloadingItems(new Set());
    
    // Also check if any videos that are supposedly downloading are actually already in library
    // This handles cases where downloads completed while component was unmounted
    results.forEach(async (result) => {
      if (downloadManager.isDownloading(result.videoId)) {
        // Check both hook state and direct storage to be sure
        const inLibraryHook = itemExists(result.videoId, null);
        const inLibraryDirect = await checkLibraryDirect(result.videoId);
        
        if (inLibraryHook || inLibraryDirect) {
          console.log(`Clearing stale download state for ${result.title} - in library (hook: ${inLibraryHook}, direct: ${inLibraryDirect})`);
          downloadManager.clearDownload(result.videoId);
        }
      }
    });
  }, [results, itemExists]);

  const handleAddToLibrary = async (result, e) => {
    e.stopPropagation();
    
    // Check if item already exists in library using both sources
    const inLibraryHook = itemExists(result.videoId, null);
    const inLibraryDirect = await checkLibraryDirect(result.videoId);
    const alreadyInLibrary = inLibraryHook || inLibraryDirect;
    
    if (alreadyInLibrary) {
      alert('This video is already in your library!');
      return;
    }

    // Check if download is already in progress
    if (downloadManager.isDownloading(result.videoId)) {
      alert('This video is currently being downloaded. Please wait...');
      return;
    }

    setDownloadingItems(prev => new Set(prev).add(result.id));

    try {
      // Fetch complete video details first
      const videoDetails = await window.electronAPI.fetchVideoDetails(result.videoId);
      
      // Create library item immediately with pending download status
      const libraryItem = {
        title: result.title,
        channel: result.channel,
        thumbnail: result.thumbnail,
        videoId: result.videoId,
        url: result.url,
        lengthSeconds: videoDetails.lengthSeconds,
        views: result.views,
        type: 'video',
        source: 'youtube',
        // Download tracking - start as pending
        downloadStatus: 'pending',
        downloadStarted: new Date().toISOString(),
        // Store complete video details for instant playback
        videoDetails: {
          title: videoDetails.title,
          description: videoDetails.description,
          author: videoDetails.author,
          lengthSeconds: videoDetails.lengthSeconds,
          viewCount: videoDetails.viewCount,
          published: videoDetails.published,
          videoThumbnails: videoDetails.videoThumbnails,
          formatStreams: videoDetails.formatStreams,
          adaptiveFormats: videoDetails.adaptiveFormats
        },
        cachedAt: new Date().toISOString()
      };

      // Add to library immediately
      const addResult = await addLibraryItem(libraryItem);
      
      if (!addResult) {
        console.error('Failed to add video to library:', result.title);
        alert('Failed to add video to library. Please try again.');
        return;
      }

      // Get the library item ID for updates
      const libraryItems = await window.electronAPI.libraryGetItems();
      const addedItem = libraryItems.items.find(item => item.videoId === result.videoId);
      
      if (!addedItem) {
        console.error('Video added to library but could not find item for download start:', result.title);
        return;
      }

      // Log to console instead of showing alert
      console.log(`Added to library: ${result.title} - Starting download...`);

      // Check if file already exists first by doing a quick download check
      console.log(`Checking download status for: ${result.title}`);
      
      // Update status to downloading initially
      await window.electronAPI.libraryUpdateItem(addedItem.id, {
        downloadStatus: 'downloading'
      });

      // Start download in background
      downloadManager.startDownload(
        result.videoId,
        () => window.electronAPI.downloadVideo(result.videoId, result.source || 'youtube')
      ).then(async (downloadResult) => {
        console.log(`Download result for ${result.title}:`, downloadResult);
        
        if (downloadResult.success) {
          // Update library item with completed download information
          // Handle both new downloads and existing files
          const updateResult = await window.electronAPI.libraryUpdateItem(addedItem.id, {
            filePath: downloadResult.filePath,
            fileName: downloadResult.fileName,
            fileSize: downloadResult.fileSize,
            downloadStatus: 'completed',
            downloadCompleted: downloadResult.downloadCompleted || new Date().toISOString()
          });
          
          console.log(`Library update result for ${result.title}:`, updateResult);
          
          if (downloadResult.alreadyExists) {
            console.log(`✅ Added to library (file already existed): ${result.title}`);
            console.log(`📁 Using existing file: ${downloadResult.fileName}`);
          } else {
            console.log(`✅ Added to library (new download): ${result.title}`);
          }
          
          // Clear this item from downloading state since it's completed
          setDownloadingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(result.id);
            return newSet;
          });
          
          // Update library status map immediately
          setLibraryStatus(prev => {
            const newMap = new Map(prev);
            newMap.set(result.videoId, true);
            return newMap;
          });
          
          // Trigger library refresh to update UI across all components
          window.dispatchEvent(new CustomEvent('library-updated'));
        } else {
          // Mark as failed
          await window.electronAPI.libraryUpdateItem(addedItem.id, {
            downloadStatus: 'failed'
          });
          console.error(`Download failed: ${result.title}`);
          
          // Clear this item from downloading state since it failed
          setDownloadingItems(prev => {
            const newSet = new Set(prev);
            newSet.delete(result.id);
            return newSet;
          });
          
          // Trigger library refresh to update UI
          window.dispatchEvent(new CustomEvent('library-updated'));
        }
      }).catch(async (error) => {
        // Mark as failed
        await window.electronAPI.libraryUpdateItem(addedItem.id, {
          downloadStatus: 'failed'
        });
        console.error(`Download error: ${result.title}`, error);
        
        // Clear this item from downloading state since it errored
        setDownloadingItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(result.id);
          return newSet;
        });
        
        // Trigger library refresh to update UI
        window.dispatchEvent(new CustomEvent('library-updated'));
      });

      // Force a storage sync to ensure other components can see the update
      await window.electronAPI.settingsGet('userLibrary');
    } catch (error) {
      console.error('Error adding video to library:', error);
      alert('An error occurred while adding the video to your library.');
    } finally {
      setDownloadingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(result.id);
        return newSet;
      });
    }
  };

  const handlePlayVideo = (result, e) => {
    if (e) e.stopPropagation();
    // Use videoId for consistent routing, fallback to result.id
    const playId = result.videoId || result.id;
    navigate(`/play/${playId}`, { 
      state: { 
        video: result, 
        searchQuery, 
        searchResults 
      } 
    });
  };

  const getSourceInfo = (source) => {
    const config = getSourceConfig(source);
    
    // Get appropriate icon based on source
    let icon;
    switch (source) {
      case 'youtube':
        icon = (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
          </svg>
        );
        break;
      case 'vimeo':
        icon = (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197a315.065 315.065 0 0 0 2.618-2.618C3.895 3.289 5.003 2.727 5.915 2.727c2.252-.012 3.66 1.322 4.17 4.045.54 2.911.913 4.711 1.111 5.381.587 2.677 1.259 4.015 2.016 4.015.587 0 1.484-.926 2.692-2.757 1.207-1.831 1.854-3.228 1.942-4.202.179-1.611-.464-2.417-1.942-2.417-.694 0-1.417.157-2.153.471 1.430-4.681 4.157-6.962 8.185-6.851 2.983.089 4.392 2.025 4.241 5.825z"/>
          </svg>
        );
        break;
      case 'local':
        icon = (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        );
        break;
      default:
        icon = (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
    }
    
    return {
      name: config.name,
      color: config.color,
      icon: icon
    };
  };

  return (
    <div className="mb-8">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-base-content">
          Search Results for "{searchQuery}" ({results.length} videos)
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {results.map((result) => {
          const isDownloading = downloadingItems.has(result.id);
          const isDownloadingGlobally = downloadManager.isDownloading(result.videoId);
          const inLibraryHook = itemExists(result.videoId, null);
          const inLibraryMap = libraryStatus.get(result.videoId) || false;
          const inLibrary = inLibraryHook || inLibraryMap; // Use either source as truth
          const sourceInfo = getSourceInfo(result.source);
          
          // Debug logging to understand state - now logging for all items to see the issue
          console.log(`${result.title} - Local: ${isDownloading}, Global: ${isDownloadingGlobally}, Library (hook): ${inLibraryHook}, Library (map): ${inLibraryMap}, Final: ${inLibrary}`);
          
          // Determine if we should show downloading state
          // If video is in library, never show downloading regardless of download manager state
          const showDownloading = !inLibrary && (isDownloading || isDownloadingGlobally);
          
          return (
            <div 
              key={result.id} 
              className="card bg-base-200 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" 
              onClick={() => handlePlayVideo(result)}
            >
              <figure className="px-4 pt-4 relative">
                <img
                  src={result.thumbnail}
                  alt={result.title}
                  className="w-full h-48 object-cover rounded-lg"
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/320x180/374151/9ca3af?text=No+Thumbnail';
                  }}
                />
                
                {/* Download status indicator */}
                {showDownloading && (
                  <div className="absolute inset-0 bg-base-content/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <div className="bg-base-100 rounded-lg p-3 flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span className="text-sm font-medium">
                        {isDownloadingGlobally ? 'Downloading...' : 'Downloading...'}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* Source indicator */}
                <div className={`absolute top-6 left-6 ${sourceInfo.color} text-white rounded-full p-2 flex items-center gap-1`}>
                  {sourceInfo.icon}
                  <span className="text-xs font-medium">{sourceInfo.name}</span>
                </div>
                
                {/* In library indicator */}
                {inLibrary && (
                  <div className="absolute top-6 right-6 bg-success/90 text-success-content rounded-full p-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                
                {/* Duration overlay */}
                <div className="absolute bottom-6 right-6 bg-base-content/90 text-base-100 px-2 py-1 rounded text-xs font-medium">
                  {result.duration}
                </div>
              </figure>
              
              <div className="card-body p-4">
                <h3 className="card-title text-sm line-clamp-2" title={result.title}>
                  {result.title}
                </h3>
                <p className="text-xs text-base-content/70 line-clamp-1" title={result.channel}>
                  {result.channel}
                </p>
                <div className="flex justify-between items-center text-xs text-base-content/60">
                  <span>{result.duration}</span>
                  <span>{result.views}</span>
                </div>
                
                <div className="card-actions justify-between mt-3">
                  <button 
                    className={`btn btn-xs ${inLibrary ? 'btn-success' : 'btn-primary'} ${showDownloading ? 'btn-disabled' : ''}`}
                    onClick={(e) => handleAddToLibrary(result, e)}
                    disabled={showDownloading || inLibrary}
                  >
                    {showDownloading ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        {isDownloadingGlobally ? 'Downloading...' : 'Adding...'}
                      </>
                    ) : inLibrary ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        In Library
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add to Library
                      </>
                    )}
                  </button>
                  
                  <button 
                    className="btn btn-ghost btn-xs" 
                    onClick={(e) => handlePlayVideo(result, e)}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                    Play
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default SearchResults; 