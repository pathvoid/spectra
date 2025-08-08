import { Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';

function Home() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  const [searchResults, setSearchResults] = useState(location.state?.searchResults || []);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const mediaItems = [
    { id: 1, title: 'The Great Adventure', type: 'movie', year: 2023, duration: '2h 15m' },
    { id: 2, title: 'Mystery of the Night', type: 'movie', year: 2022, duration: '1h 45m' },
    { id: 3, title: 'Summer Vibes', type: 'music', artist: 'Chill Wave', duration: '3m 45s' },
    { id: 4, title: 'Tech Talk Podcast', type: 'podcast', episodes: 12, duration: '45m' },
    { id: 5, title: 'Nature Documentary', type: 'documentary', year: 2024, duration: '1h 30m' },
    { id: 6, title: 'Classic Rock Hits', type: 'music', artist: 'Various Artists', duration: '1h 20m' },
    { id: 7, title: 'Comedy Special', type: 'standup', year: 2023, duration: '1h 15m' },
    { id: 8, title: 'Educational Series', type: 'series', episodes: 8, duration: '30m each' }
  ];

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      // Use IPC to call the main process for YouTube search
      const results = await window.electronAPI.youtubeSearch(query);
      setSearchResults(results);
    } catch (error) {
      // Show empty results if search fails
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header with Branding and Search */}
      <div className="mb-6 flex items-center justify-between">
        {/* Branding */}
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.location.href = '/'}>
          <div>
            <h1 className="text-2xl font-bold text-primary">Spectra</h1>
            <p className="text-sm text-base-content/70">Media Center</p>
          </div>
        </div>

        {/* Search Bar - Centered */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <div className="relative w-96">
            <input
              type="text"
              placeholder="Search videos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              className="input input-bordered w-full pl-10 pr-4"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {isSearching && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="loading loading-spinner loading-sm"></span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {searchResults.map((result) => (
              <div key={result.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate(`/play/${result.id}`, { state: { video: result, searchQuery, searchResults } })}>
                <figure className="px-4 pt-4">
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="w-full h-64 object-cover rounded-lg"
                  />
                </figure>
                <div className="card-body p-4">
                  <h3 className="card-title text-sm line-clamp-2">{result.title}</h3>
                  <p className="text-xs text-base-content/70">{result.channel}</p>
                  <div className="flex justify-between items-center text-xs text-base-content/60">
                    <span>{result.duration}</span>
                    <span>{result.views}</span>
                  </div>
                  <div className="card-actions justify-end mt-3">
                    <button className="btn btn-primary btn-xs">Add to Library</button>
                    <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/play/${result.id}`, { state: { video: result, searchQuery, searchResults } })}>Play</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Media Tile - Only show when no search results */}
      {searchResults.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-base-200 hover:bg-base-300 transition-colors cursor-pointer rounded-lg border border-base-300 flex items-center justify-center h-full min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Add New Media</h3>
              <p className="text-sm text-base-content/70">Import your files</p>
            </div>
          </div>

          {/* Media Items */}
          {mediaItems.map((item) => (
            <div key={item.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
              <figure className="px-6 pt-6">
                <img
                  src="https://placehold.co/100x100"
                  alt={item.title}
                  className="w-full h-64 object-cover rounded-lg"
                />
              </figure>
              <div className="card-body">
                <h3 className="card-title text-base">{item.title}</h3>
                <div className="text-sm text-base-content/70">
                  {item.artist && <p>Artist: {item.artist}</p>}
                  {item.year && <p>Year: {item.year}</p>}
                  {item.episodes && <p>Episodes: {item.episodes}</p>}
                  <p>Duration: {item.duration}</p>
                </div>
                <div className="card-actions justify-end mt-4">
                  <button className="btn btn-primary btn-sm">Play</button>
                  <button className="btn btn-ghost btn-sm">Details</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function About() {
  return <h1>About Page</h1>;
}

function Settings() {
  return <h1>Settings Page</h1>;
}

function VideoPlayer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const video = location.state?.video;
  const searchQuery = location.state?.searchQuery;
  const searchResults = location.state?.searchResults;
  const [videoDetails, setVideoDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadedVideo, setDownloadedVideo] = useState(null);
  const [videoRef, setVideoRef] = useState(null);
  const [videoDataUrl, setVideoDataUrl] = useState(null);
  const downloadStartedRef = useRef(false);

  useEffect(() => {
    if (video?.videoId) {
      fetchVideoDetails();
    }
  }, [video]);

  const fetchVideoDetails = async () => {
    if (!video?.videoId) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const details = await window.electronAPI.fetchVideoDetails(video.videoId);
      setVideoDetails(details);
    } catch (err) {
      setError('Failed to load video details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = useCallback(async () => {
    if (!video?.videoId || downloadStartedRef.current) return;
    
    downloadStartedRef.current = true;
    setIsDownloading(true);
    setError(null);
    
    try {
      const result = await window.electronAPI.downloadVideo(video.videoId);
      setDownloadedVideo(result);
      
      // Get the video as a blob URL for secure playback
      if (result.success) {
        const blobResult = await window.electronAPI.getVideoBlob(result.filePath);
        if (blobResult.success) {
          setVideoDataUrl(blobResult.dataUrl);
        }
      }
    } catch (err) {
      setError('Failed to download video');
    } finally {
      setIsDownloading(false);
    }
  }, [video?.videoId]);

  // Auto-download when component mounts
  useEffect(() => {
    if (video?.videoId && !downloadedVideo && !isDownloading && !downloadStartedRef.current) {
      handleDownload();
    }
  }, [video, downloadedVideo, isDownloading, handleDownload]);

  if (!video) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Video Not Found</h1>
          <button className="btn btn-primary" onClick={() => navigate('/')}>Go Back</button>
        </div>
      </div>
    );
  }

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

function NotFound() {
  return <h1>404 - Page Not Found</h1>;
}

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play/:id" element={<VideoPlayer />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;