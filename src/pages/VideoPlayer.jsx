import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import VideoPlayerUI from '../components/VideoPlayerUI';

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
    <VideoPlayerUI
      video={video}
      videoDetails={videoDetails}
      isLoading={isLoading}
      error={error}
      isDownloading={isDownloading}
      downloadedVideo={downloadedVideo}
      videoDataUrl={videoDataUrl}
      videoRef={videoRef}
      setVideoRef={setVideoRef}
      searchQuery={searchQuery}
      searchResults={searchResults}
      navigate={navigate}
      fetchVideoDetails={fetchVideoDetails}
    />
  );
}

export default VideoPlayer; 