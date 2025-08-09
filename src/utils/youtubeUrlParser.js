/**
 * YouTube URL Parser Utility
 * Extracts video IDs from various YouTube URL formats
 * Excludes YouTube Shorts
 */

/**
 * Extract video ID from YouTube URL
 * @param {string} url - The YouTube URL to parse
 * @returns {string|null} - The video ID if valid, null if invalid or is a Short
 */
export function extractYouTubeVideoId(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // Remove whitespace and ensure it's a string
  url = url.trim();

  // Check if it's a YouTube Shorts URL (we don't support these)
  if (url.includes('/shorts/')) {
    console.log('YouTube Shorts URLs are not supported');
    return null;
  }

  // Regular expressions for different YouTube URL formats
  const patterns = [
    // Standard watch URLs: https://www.youtube.com/watch?v=VIDEO_ID
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    
    // Short URLs: https://youtu.be/VIDEO_ID
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    
    // Embedded URLs: https://www.youtube.com/embed/VIDEO_ID
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    
    // Mobile URLs: https://m.youtube.com/watch?v=VIDEO_ID
    /(?:m\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  ];

  // Try each pattern
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      const videoId = match[1];
      
      // Validate video ID length (YouTube video IDs are always 11 characters)
      if (videoId.length === 11) {
        console.log(`Extracted YouTube video ID: ${videoId} from URL: ${url}`);
        return videoId;
      }
    }
  }

  return null;
}

/**
 * Check if a string looks like a YouTube URL
 * @param {string} input - The input string to check
 * @returns {boolean} - True if it looks like a YouTube URL
 */
export function isYouTubeUrl(input) {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const youtubeHosts = [
    'youtube.com',
    'www.youtube.com', 
    'm.youtube.com',
    'youtu.be'
  ];

  // Convert to lowercase for case-insensitive matching
  const lowerInput = input.toLowerCase().trim();

  // Check if it contains any YouTube domain
  return youtubeHosts.some(host => lowerInput.includes(host));
}

/**
 * Validate and clean a YouTube URL
 * @param {string} url - The URL to validate
 * @returns {object} - { isValid: boolean, videoId: string|null, reason: string }
 */
export function validateYouTubeUrl(url) {
  if (!isYouTubeUrl(url)) {
    return {
      isValid: false,
      videoId: null,
      reason: 'Not a YouTube URL'
    };
  }

  if (url.includes('/shorts/')) {
    return {
      isValid: false,
      videoId: null,
      reason: 'YouTube Shorts are not supported'
    };
  }

  const videoId = extractYouTubeVideoId(url);
  
  if (!videoId) {
    return {
      isValid: false,
      videoId: null,
      reason: 'Could not extract video ID from URL'
    };
  }

  return {
    isValid: true,
    videoId: videoId,
    reason: 'Valid YouTube video URL'
  };
}

/**
 * Create a clean YouTube watch URL from a video ID
 * @param {string} videoId - The YouTube video ID
 * @returns {string} - Clean YouTube watch URL
 */
export function createYouTubeWatchUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}