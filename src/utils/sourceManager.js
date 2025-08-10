/**
 * Source Management Utilities
 * Handles video source definitions and configurations for different platforms
 */

// Define supported video sources
export const VIDEO_SOURCES = {
  YOUTUBE: 'youtube',
  VIMEO: 'vimeo', 
  LOCAL: 'local',
  UNKNOWN: 'unknown'
};

// Source configurations with display information
export const SOURCE_CONFIG = {
  [VIDEO_SOURCES.YOUTUBE]: {
    name: 'YouTube',
    color: 'bg-red-500',
    searchEnabled: true,
    downloadEnabled: true,
    description: 'YouTube videos and content'
  },
  [VIDEO_SOURCES.VIMEO]: {
    name: 'Vimeo', 
    color: 'bg-blue-500',
    searchEnabled: false, // Not implemented yet
    downloadEnabled: false, // Not implemented yet
    description: 'Vimeo videos and content'
  },
  [VIDEO_SOURCES.LOCAL]: {
    name: 'Local',
    color: 'bg-gray-500', 
    searchEnabled: false,
    downloadEnabled: false, // Already local
    description: 'Local video files'
  },
  [VIDEO_SOURCES.UNKNOWN]: {
    name: 'Unknown',
    color: 'bg-gray-400',
    searchEnabled: false,
    downloadEnabled: false,
    description: 'Unknown or unsupported source'
  }
};

/**
 * Get source configuration for a given source
 * @param {string} source - Source identifier
 * @returns {object} Source configuration object
 */
export function getSourceConfig(source) {
  return SOURCE_CONFIG[source] || SOURCE_CONFIG[VIDEO_SOURCES.UNKNOWN];
}

/**
 * Get list of all available sources
 * @returns {Array} Array of source configurations
 */
export function getAllSources() {
  return Object.entries(SOURCE_CONFIG).map(([key, config]) => ({
    id: key,
    ...config
  }));
}

/**
 * Get list of sources that support searching
 * @returns {Array} Array of search-enabled source configurations
 */
export function getSearchableSources() {
  return getAllSources().filter(source => source.searchEnabled);
}

/**
 * Get list of sources that support downloading
 * @returns {Array} Array of download-enabled source configurations
 */
export function getDownloadableSources() {
  return getAllSources().filter(source => source.downloadEnabled);
}

/**
 * Validate if a source is supported
 * @param {string} source - Source identifier to validate
 * @returns {boolean} True if source is supported
 */
export function isValidSource(source) {
  return Object.keys(SOURCE_CONFIG).includes(source);
}

/**
 * Get the downloads subdirectory name for a source
 * @param {string} source - Source identifier
 * @returns {string} Directory name for downloads
 */
export function getSourceDirectory(source) {
  return isValidSource(source) ? source : VIDEO_SOURCES.UNKNOWN;
}
