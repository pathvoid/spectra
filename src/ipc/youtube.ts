import { ipcMain, app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import play from 'play-dl';
import ytdl from '@distube/ytdl-core';

/**
 * YouTube and Video IPC Handlers
 * Manages YouTube search, video details, and download functionality
 */

export function registerYouTubeHandlers() {
  // IPC handlers for YouTube search
  ipcMain.handle('youtube-search', async (event, query) => {
    try {
      const searchResults = await play.search(query, {
        limit: 12
      });

      // Transform and filter the results to match our UI format
      const transformedResults = searchResults
        .filter(result => {
          // Filter out invalid/unavailable content:
          // - Videos with 0 duration (invalid/unavailable)
          // - Videos without proper title
          // - Videos without proper URL
          return result.durationInSec && 
                 result.durationInSec > 0 && 
                 result.title && 
                 result.title.trim().length > 0 &&
                 result.url;
        })
        .map((result, index) => {
          // Extract video ID from URL
          let videoId = result.id;
          if (!videoId && result.url) {
            const urlMatch = result.url.match(/[?&]v=([^&]+)/);
            videoId = urlMatch ? urlMatch[1] : null;
          }
           
          return {
            id: `yt${index + 1}`,
            title: result.title,
            channel: result.channel?.name || 'Unknown Channel',
            duration: formatDuration(result.durationInSec),
            views: formatViews(result.views),
            thumbnail: result.thumbnails?.[0]?.url || 'https://placehold.co/100x100',
            url: result.url,
            videoId: videoId
          };
        });

      return transformedResults;
    } catch (error) {
      console.error('Error searching YouTube:', error);
      return [];
    }
  });

  // IPC handler for fetching video details using play-dl
  ipcMain.handle('fetch-video-details', async (event, videoId) => {
    try {
      // Use play-dl to get video info directly
      const videoInfo = await play.video_info(`https://www.youtube.com/watch?v=${videoId}`);
       
      // Transform the formats to match our UI expectations
      const formatStreams = videoInfo.format.map((format, index) => {
        return {
          quality: format.quality || 'Unknown',
          container: 'mp4', // Most YouTube formats are mp4
          contentLength: format.contentLength?.toString() || null,
          url: format.url,
          index: index
        };
      });

      return {
        title: videoInfo.video_details.title,
        description: videoInfo.video_details.description,
        author: videoInfo.video_details.channel?.name || 'Unknown Channel',
        lengthSeconds: videoInfo.video_details.durationInSec,
        viewCount: videoInfo.video_details.views,
        published: new Date(videoInfo.video_details.uploadedAt).getTime() / 1000,
        videoThumbnails: videoInfo.video_details.thumbnails,
        formatStreams: formatStreams,
        adaptiveFormats: []
      };
    } catch (error) {
      console.error('Error fetching video details:', error);
      throw error;
    }
  });
   
  // IPC handler for downloading video
  ipcMain.handle('download-video', async (event, videoId) => {
    try {
      // Get video info first
      const videoInfo = await ytdl.getInfo(`https://www.youtube.com/watch?v=${videoId}`);
      const videoTitle = videoInfo.videoDetails.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
       
      // Create downloads directory if it doesn't exist
      const downloadsDir = path.join(app.getPath('userData'), 'downloads');
      if (!fs.existsSync(downloadsDir)) {
        fs.mkdirSync(downloadsDir, { recursive: true });
      }
       
      // Choose the best quality format that includes both audio and video
      const format = ytdl.chooseFormat(videoInfo.formats, { 
        quality: 'highest',
        filter: 'audioandvideo' // This ensures we get a format with both audio and video
      });
      const fileName = `${videoTitle}_${videoId}.mp4`;
      const filePath = path.join(downloadsDir, fileName);
       
      // Check if file already exists
      if (fs.existsSync(filePath)) {
        console.log('Video already exists:', filePath);
        return { 
          success: true, 
          filePath: filePath,
          fileName: fileName,
          title: videoInfo.videoDetails.title,
          alreadyExists: true
        };
      }
       
      console.log('Downloading to:', filePath);
       
      // Download the video
      const writeStream = fs.createWriteStream(filePath);
      const videoStream = ytdl(`https://www.youtube.com/watch?v=${videoId}`, { format });
       
      return new Promise((resolve, reject) => {
        videoStream.pipe(writeStream);
         
        writeStream.on('finish', () => {
          console.log('Download completed:', filePath);
          resolve({ 
            success: true, 
            filePath: filePath,
            fileName: fileName,
            title: videoInfo.videoDetails.title,
            alreadyExists: false
          });
        });
         
        writeStream.on('error', (error) => {
          reject(error);
        });
      });
    } catch (error) {
      console.error('Error downloading video:', error);
      throw error;
    }
  });
   
  // IPC handler for getting video file as blob URL
  ipcMain.handle('get-video-blob', async (event, filePath) => {
    try {
      // Read the file and convert to base64
      const videoBuffer = fs.readFileSync(filePath);
      const base64Data = videoBuffer.toString('base64');
       
      return {
        success: true,
        dataUrl: `data:video/mp4;base64,${base64Data}`,
        fileName: path.basename(filePath)
      };
    } catch (error) {
      console.error('Error getting video blob:', error);
      throw error;
    }
  });

  // IPC handler for deleting video files
  ipcMain.handle('delete-video-file', async (event, filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('Video file deleted:', filePath);
        return { success: true };
      } else {
        console.log('Video file not found:', filePath);
        return { success: true, message: 'File not found' };
      }
    } catch (error) {
      console.error('Error deleting video file:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('YouTube IPC handlers registered successfully');
}

// Helper functions
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatViews(views: number): string {
  if (!views) return '0 views';
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M views`;
  } else if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K views`;
  }
  return `${views} views`;
}