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

  // Helper function to load video file safely (handles large files)
  const loadVideoFile = async (filePath, title) => {
    try {
      const blobResult = await window.electronAPI.getVideoBlob(filePath);
      if (blobResult.success) {
        console.log(`Using existing downloaded file: ${filePath.split('/').pop() || filePath.split('\\').pop() || 'video'} (${blobResult.isLargeFile ? 'large file' : 'small file'})`);
        
        setDownloadedVideo({
          success: true,
          filePath: filePath,
          fileName: blobResult.fileName,
          title: title,
          alreadyExists: true,
          isLargeFile: blobResult.isLargeFile
        });

        // For large files, use file URL instead of blob URL
        if (blobResult.isLargeFile) {
          const fileUrlResult = await window.electronAPI.getVideoFileUrl(filePath);
          if (fileUrlResult.success) {
            setVideoDataUrl(fileUrlResult.fileUrl);
          }
        } else {
          setVideoDataUrl(blobResult.dataUrl);
        }
        
        return true;
      }
    } catch (err) {
      console.log('Error loading video file:', err);
    }
    return false;
  };

  const loadVideoData = async () => {
    if (!video?.videoId) return;
    
    // First check if we have cached details passed from navigation state (instant)
    if (cachedVideoDetails && cachedFilePath) {
      console.log('Using passed cached video details for instant loading');
      setVideoDetails(cachedVideoDetails);
      
      const loaded = await loadVideoFile(cachedFilePath, video.title);
      if (loaded) {
        return; // Skip all other loading since we have everything
      } else {
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
        const loaded = await loadVideoFile(cachedVideo.filePath, cachedVideo.title);
        if (loaded) {
          return; // Skip downloading since we have the file
        } else {
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
      
      // Get the video as a blob/file URL for secure playback
      if (result.success) {
        await loadVideoFile(result.filePath, result.title || video?.title);
        
        // Notify other components that download completed
        console.log(`VideoPlayer download completed for ${video.title || video.videoId}`);
        window.dispatchEvent(new CustomEvent('video-download-completed', {
          detail: { videoId: video.videoId, result }
        }));
      }
    } catch (err) {
      setError('Failed to download video');
      
      // Notify other components that download failed
      console.log(`VideoPlayer download failed for ${video.title || video.videoId}`);
      window.dispatchEvent(new CustomEvent('video-download-completed', {
        detail: { videoId: video.videoId, result: { success: false, error: err } }
      }));
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