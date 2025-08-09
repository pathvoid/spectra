import { useState } from 'react';
import useLibrary from '../hooks/useLibrary';
import downloadManager from '../services/downloadManager';

function SearchResults({ results, searchQuery, searchResults, navigate }) {
  const [downloadingItems, setDownloadingItems] = useState(new Set());
  const { addLibraryItem, itemExists } = useLibrary();

  const handleAddToLibrary = async (result, e) => {
    e.stopPropagation();
    
    // Check if item already exists in library
    if (itemExists(result.videoId, null)) {
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
      
      // Use download manager to prevent concurrent downloads
      const downloadResult = await downloadManager.startDownload(
        result.videoId,
        () => window.electronAPI.downloadVideo(result.videoId)
      );

      if (downloadResult.success) {
        // Create library item with complete video details and download information
        const libraryItem = {
          title: result.title,
          channel: result.channel,
          thumbnail: result.thumbnail,
          videoId: result.videoId,
          url: result.url,
          filePath: downloadResult.filePath,
          fileName: downloadResult.fileName,
          lengthSeconds: videoDetails.lengthSeconds,
          views: result.views,
          type: 'video',
          source: 'youtube',
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

        // Add to library
        const addResult = await addLibraryItem(libraryItem);
        
        if (addResult) {
          // Show appropriate message
          if (downloadResult.alreadyExists) {
            alert(`"${result.title}" was already downloaded and has been added to your library.`);
          } else {
            alert(`"${result.title}" has been added to your library and downloaded!`);
          }
          
          // Force a storage sync to ensure other components can see the update
          await window.electronAPI.settingsGet('userLibrary');
        } else {
          alert('Failed to add video to library. Please try again.');
        }
      } else {
        alert('Failed to process video. Please try again.');
      }
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
          const inLibrary = itemExists(result.videoId, null);
          
          return (
            <div 
              key={result.id} 
              className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" 
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
                {(isDownloading || isDownloadingGlobally) && (
                  <div className="absolute inset-0 bg-base-content/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <div className="bg-base-100 rounded-lg p-3 flex items-center gap-2">
                      <span className="loading loading-spinner loading-sm"></span>
                      <span className="text-sm font-medium">
                        {isDownloadingGlobally ? 'Downloading...' : 'Downloading...'}
                      </span>
                    </div>
                  </div>
                )}
                
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
                    className={`btn btn-xs ${inLibrary ? 'btn-success' : 'btn-primary'} ${(isDownloading || isDownloadingGlobally) ? 'btn-disabled' : ''}`}
                    onClick={(e) => handleAddToLibrary(result, e)}
                    disabled={isDownloading || isDownloadingGlobally || inLibrary}
                  >
                    {(isDownloading || isDownloadingGlobally) ? (
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