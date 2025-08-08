function VideoPlayerUI({
  video,
  videoDetails,
  isLoading,
  error,
  isDownloading,
  downloadedVideo,
  videoDataUrl,
  videoRef,
  setVideoRef,
  searchQuery,
  searchResults,
  navigate,
  fetchVideoDetails
}) {
  return (
    <div className="w-full h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 left-0 z-50 p-4">
        <button 
          className="btn btn-ghost text-white hover:bg-white/10" 
          onClick={() => navigate('/', { state: { searchQuery, searchResults } })}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
           Back
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center relative h-full">
        {isLoading ? (
          <div className="text-center text-white">
            <div className="loading loading-spinner loading-lg mb-4"></div>
            <p className="text-lg">Loading video details...</p>
          </div>
        ) : error ? (
          <div className="text-center text-white">
            <div className="mb-4">
              <svg className="w-24 h-24 mx-auto text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold mb-2">Error Loading Video</h2>
            <p className="text-white/70 mb-4">{error}</p>
            <button className="btn btn-primary" onClick={fetchVideoDetails}>Retry</button>
          </div>
        ) : videoDetails ? (
          <div className="w-full h-full flex flex-col">
            {/* Video Player - Full Screen */}
            {downloadedVideo && videoDataUrl ? (
              <div className="w-full h-full flex items-center justify-center overflow-hidden">
                <video
                  ref={setVideoRef}
                  controls
                  className="max-w-full max-h-full object-contain"
                  src={videoDataUrl}
                  autoPlay
                >
                   Your browser does not support the video tag.
                </video>
              </div>
            ) : (
            /* Download Status - Centered */
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center text-white">
                  {isDownloading ? (
                    <div>
                      <div className="loading loading-spinner loading-lg mb-4"></div>
                      <h2 className="text-2xl font-bold mb-2">Downloading Video</h2>
                      <p className="text-white/70">Please wait while we download the video...</p>
                    </div>
                  ) : (
                    <div>
                      <div className="mb-4">
                        <svg className="w-24 h-24 mx-auto text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h2 className="text-2xl font-bold mb-2">{videoDetails.title}</h2>
                      <p className="text-white/70 mb-4">by {videoDetails.author}</p>
                      <div className="flex gap-4 text-sm text-white/60 mb-6 justify-center">
                        <span>{Math.floor(videoDetails.lengthSeconds / 60)}:{(videoDetails.lengthSeconds % 60).toString().padStart(2, '0')}</span>
                        <span>{videoDetails.viewCount?.toLocaleString()} views</span>
                        <span>{new Date(videoDetails.published * 1000).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-white/50">Preparing video for playback...</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-white">
            <div className="mb-4">
              <svg className="w-24 h-24 mx-auto text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">{video.title}</h2>
            <p className="text-white/70 mb-4">{video.channel}</p>
            <p className="text-sm text-white/50 mb-6">Loading video details...</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoPlayerUI; 