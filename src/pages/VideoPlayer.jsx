import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import VideoPlayerUI from '../components/VideoPlayerUI';
import downloadManager from '../services/downloadManager';

function VideoPlayer() {
  const navigate = useNavigate();
  const location = useLocation();
  const video = location.state?.video;
  const searchQuery = location.state?.searchQuery;
  const searchResults = location.state?.searchResults;
  const cachedVideoDetails = location.state?.cachedVideoDetails;
  const cachedFilePath = location.state?.cachedFilePath;
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
      loadVideoData();
    }
  }, [video]);

  const loadVideoData = async () => {
    if (!video?.videoId) return;
    
    // First check if we have cached details passed from navigation state (instant)
    if (cachedVideoDetails && cachedFilePath) {
      console.log('Using passed cached video details for instant loading');
      setVideoDetails(cachedVideoDetails);
      
      try {
        const blobResult = await window.electronAPI.getVideoBlob(cachedFilePath);
        if (blobResult.success) {
          console.log('Using existing downloaded file (instant)');
          setDownloadedVideo({
            success: true,
            filePath: cachedFilePath,
            fileName: cachedFilePath.split('/').pop() || 'video.mp4',
            title: video.title,
            alreadyExists: true
          });
          setVideoDataUrl(blobResult.dataUrl);
          return; // Skip all other loading since we have everything
        }
      } catch (err) {
        console.log('Cached file not accessible, checking library');
      }
    }
    
    // Fallback: check library storage for cached details
    const libraryItems = await window.electronAPI.settingsGet('userLibrary') || [];
    const cachedVideo = libraryItems.find(item => item.videoId === video.videoId);
    
    if (cachedVideo && cachedVideo.videoDetails) {
      console.log('Using library cached video details for', video.videoId);
      setVideoDetails(cachedVideo.videoDetails);
      
      // Check if the file still exists
      if (cachedVideo.filePath) {
        try {
          const blobResult = await window.electronAPI.getVideoBlob(cachedVideo.filePath);
          if (blobResult.success) {
            console.log('Using existing downloaded file from library');
            setDownloadedVideo({
              success: true,
              filePath: cachedVideo.filePath,
              fileName: cachedVideo.fileName,
              title: cachedVideo.title,
              alreadyExists: true
            });
            setVideoDataUrl(blobResult.dataUrl);
            return; // Skip downloading since we have the file
          }
        } catch (err) {
          console.log('Cached file not accessible, will re-download');
        }
      }
    } else {
      // No cached details, fetch from internet
      await fetchVideoDetails();
    }
  };

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
      // Use download manager to prevent concurrent downloads
      const result = await downloadManager.startDownload(
        video.videoId,
        () => window.electronAPI.downloadVideo(video.videoId)
      );
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

  // Auto-download when component mounts (only if we don't have the file)
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