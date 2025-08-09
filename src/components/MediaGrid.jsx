import { useNavigate } from 'react-router-dom';
import useLibrary from '../hooks/useLibrary';

function MediaGrid({ mediaItems, showAddButton = true, onItemRemoved }) {
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

  const getMediaTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
          </svg>
        );
      case 'music':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
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
      {mediaItems.map((item) => (
        <div 
          key={item.id} 
          className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer flex flex-col h-full"
          onClick={() => handlePlayMedia(item)}
        >
          <figure className="px-6 pt-6 relative">
            <img
              src={item.thumbnail || item.videoThumbnails?.[0]?.url || 'https://placehold.co/320x180/374151/9ca3af?text=No+Thumbnail'}
              alt={item.title}
              className="w-full h-48 object-cover rounded-lg"
              onError={(e) => {
                e.target.src = 'https://placehold.co/320x180/374151/9ca3af?text=No+Thumbnail';
              }}
            />
            
            {/* Media type indicator */}
            <div className="absolute top-8 left-8 bg-base-100/90 backdrop-blur-sm rounded-full p-2">
              {getMediaTypeIcon(item.type)}
            </div>
            
            {/* Duration overlay */}
            {item.lengthSeconds && (
              <div className="absolute bottom-8 right-8 bg-base-content/90 text-base-100 px-2 py-1 rounded text-xs font-medium">
                {formatDuration(item.lengthSeconds)}
              </div>
            )}
          </figure>
          
          <div className="card-body flex flex-col flex-grow">
            <h3 className="card-title text-base line-clamp-2" title={item.title}>
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
              
              {item.dateAdded && (
                <p className="text-xs text-base-content/50">
                  Added {new Date(item.dateAdded).toLocaleDateString()}
                </p>
              )}
            </div>
            
            {/* Buttons at the very bottom */}
            <div className="card-actions justify-between mt-4">
              <button 
                className="btn btn-primary btn-sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePlayMedia(item);
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                </svg>
                Play
              </button>
              
              <button 
                className="btn btn-error btn-sm"
                onClick={(e) => handleRemoveItem(item, e)}
                title="Remove from library and delete file"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1-1H7a1 1 0 00-1 1v3" />
                </svg>
                Remove
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MediaGrid; 