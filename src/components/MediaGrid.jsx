import { useNavigate } from 'react-router-dom';
import useLibrary from '../hooks/useLibrary';
import { getSourceConfig } from '../utils/sourceManager';

function MediaGrid({ mediaItems, showAddButton = true, onItemRemoved, showInLibraryIndicator = false }) {
  const navigate = useNavigate();
  const { removeLibraryItem, updatePlayStats } = useLibrary();

  const handlePlayMedia = async (item) => {
    // Update play statistics
    if (item.id) {
      await updatePlayStats(item.id);
    }

    // Navigate to video player - use the same route as search results for consistency
    if (item.videoId) {
      // Create a mock search result format for compatibility with existing player
      const videoForPlayer = {
        id: item.videoId, // Use videoId as the id for the player route
        title: item.title,
        channel: item.channel,
        thumbnail: item.thumbnail,
        videoId: item.videoId,
        url: item.url,
        views: item.views,
        duration: item.lengthSeconds ? formatDurationForPlayer(item.lengthSeconds) : 'Unknown'
      };

      navigate(`/play/${item.videoId}`, { 
        state: { 
          video: videoForPlayer,
          fromLibrary: true,
          libraryItem: item,
          // Pass cached video details if available
          cachedVideoDetails: item.videoDetails,
          cachedFilePath: item.filePath
        } 
      });
    } else if (item.filePath) {
      // Handle local file playback - this might need a different route
      navigate('/player', { 
        state: { 
          localFile: item.filePath,
          videoDetails: item,
          fromLibrary: true 
        } 
      });
    }
  };

  const handleRemoveItem = async (item, e) => {
    e.stopPropagation();
    if (!item.id) return;
    
    const confirmed = confirm(
      `Remove "${item.title}" from your library?\n\nThis will also delete the video file from your computer.`
    );
    
    if (confirmed) {
      try {
        // First delete the video file if it exists
        if (item.filePath) {
          const deleteResult = await window.electronAPI.deleteVideoFile(item.filePath);
          if (deleteResult.success) {
            console.log('Video file deleted successfully');
          } else {
            console.warn('Could not delete video file:', deleteResult.error);
          }
        }
        
        // Then remove from library
        const removeResult = await removeLibraryItem(item.id);
        
        if (removeResult) {
          console.log('Item removed from library successfully');
          // Trigger parent component to reload library to ensure sync
          if (onItemRemoved) {
            onItemRemoved();
          }
        } else {
          alert('Failed to remove item from library. Please try again.');
        }
      } catch (error) {
        console.error('Error removing item:', error);
        alert('An error occurred while removing the item.');
      }
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatDurationForPlayer = (seconds) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSourceInfo = (source) => {
    const config = getSourceConfig(source);
    
    return {
      name: config.name,
      color: config.color
    };
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {/* Add New Media Button - Only show if enabled */}
      {showAddButton && (
        <div className="bg-base-200 hover:bg-base-300 transition-colors cursor-pointer rounded-lg border border-base-300 flex items-center justify-center h-full min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Add New Media</h3>
            <p className="text-sm text-base-content/70">Search and download videos</p>
          </div>
        </div>
      )}

      {/* Media Items */}
      {mediaItems.map((item) => {
        const sourceInfo = getSourceInfo(item.source);
        
        return (
          <div 
            key={item.id} 
            className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer flex flex-col h-full"
            onClick={() => handlePlayMedia(item)}
          >
            <figure className="px-4 sm:px-6 pt-4 sm:pt-6 relative">
              <img
                src={item.thumbnail || item.videoThumbnails?.[0]?.url || 'https://placehold.co/320x180/374151/9ca3af?text=No+Thumbnail'}
                alt={item.title}
                className="w-full h-32 sm:h-40 lg:h-48 object-cover rounded-lg"
                onError={(e) => {
                  e.target.src = 'https://placehold.co/320x180/374151/9ca3af?text=No+Thumbnail';
                }}
              />
            
              {/* In Library indicator */}
              {showInLibraryIndicator && (
                <div className="absolute top-6 right-6 bg-success/90 text-success-content rounded-full p-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            
              {/* Duration overlay */}
              {item.lengthSeconds && (
                <div className="absolute bottom-2 right-8 bg-base-content/90 text-base-100 px-2 py-1 rounded text-xs font-medium">
                  {formatDuration(item.lengthSeconds)}
                </div>
              )}

              {/* Download status overlay */}
              {item.downloadStatus && item.downloadStatus !== 'completed' && (
                <div className="absolute inset-0 bg-base-content/50 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <div className="bg-base-100 rounded-lg p-3 flex items-center gap-2">
                    {item.downloadStatus === 'downloading' && (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="text-sm font-medium">Downloading...</span>
                      </>
                    )}
                    {item.downloadStatus === 'pending' && (
                      <>
                        <span className="loading loading-spinner loading-sm"></span>
                        <span className="text-sm font-medium">Waiting to download...</span>
                      </>
                    )}
                    {item.downloadStatus === 'failed' && (
                      <>
                        <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium text-error">Download failed</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </figure>
          
            <div className="card-body flex flex-col flex-grow">
              <h3 className="card-title text-sm sm:text-base line-clamp-2" title={item.title}>
                {item.title}
              </h3>
            
              <div className="text-sm text-base-content/70 space-y-1 flex-grow">
                {item.channel && (
                  <p className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {item.channel}
                  </p>
                )}
              
                {item.views && (
                  <p className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {item.views}
                  </p>
                )}
              
                {item.source && (
                  <p className="flex items-center gap-2 text-xs">
                    <span>Source: {sourceInfo.name}</span>
                  </p>
                )}
              

              </div>
            
              {/* Buttons at the very bottom */}
              <div className="card-actions justify-between mt-4">
                {showInLibraryIndicator ? (
                  <button 
                    className="btn btn-success btn-xs"
                    disabled
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    In Library
                  </button>
                ) : (
                  <button 
                    className="btn btn-error btn-xs"
                    onClick={(e) => handleRemoveItem(item, e)}
                    title={
                      item.downloadStatus === 'completed' 
                        ? 'Remove from library and delete file'
                        : 'Remove from library'
                    }
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H7a1 1 0 00-1 1v3" />
                    </svg>
                    Remove
                  </button>
                )}
              
                <button 
                  className="btn btn-ghost btn-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.downloadStatus === 'completed') {
                      handlePlayMedia(item);
                    }
                  }}
                  disabled={item.downloadStatus !== 'completed'}
                  title={
                    item.downloadStatus === 'completed' 
                      ? 'Play video' 
                      : item.downloadStatus === 'downloading'
                        ? 'Video is downloading...'
                        : item.downloadStatus === 'pending'
                          ? 'Video is queued for download...'
                          : item.downloadStatus === 'failed'
                            ? 'Download failed - remove and try adding again'
                            : 'Video not ready'
                  }
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
  );
}

export default MediaGrid; 