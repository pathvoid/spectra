import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import MediaGrid from '../components/MediaGrid';
import useLibrary from '../hooks/useLibrary';
import useSettings from '../hooks/useSettings';
import { validateYouTubeUrl } from '../utils/youtubeUrlParser';

function Home() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  const [searchedQuery, setSearchedQuery] = useState(location.state?.searchQuery || '');
  const [searchResults, setSearchResults] = useState(location.state?.searchResults || []);
  const [librarySearchResults, setLibrarySearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  // Use library and settings hooks
  const { 
    isLoading: libraryLoading,
    getFilteredItems,
    forceReload,
    libraryItems
  } = useLibrary();

  const { 
    isLoading: settingsLoading,
    sortBy,
    sortOrder
  } = useSettings();

  // Get filtered and sorted library items for display
  const displayItems = getFilteredItems({
    sortBy,
    sortOrder
  });

  // Reload library when component mounts or when navigating back to home
  useEffect(() => {
    // Only reload if we don't have search results (meaning we're showing library)
    if (searchResults.length === 0) {
      forceReload();
    }
  }, [forceReload, searchResults.length]);

  // Listen for library updates from background downloads
  useEffect(() => {
    const handleLibraryUpdate = () => {
      // Always reload library data when it's updated, regardless of current view
      console.log('Library updated, refreshing display...');
      forceReload();
      
      // If we have search results, update the library search results to include newly added videos
      if (searchedQuery && searchedQuery.trim()) {
        const updatedLibraryMatches = searchLibraryItems(searchedQuery);
        setLibrarySearchResults(updatedLibraryMatches);
      }
    };

    window.addEventListener('library-updated', handleLibraryUpdate);
    
    return () => {
      window.removeEventListener('library-updated', handleLibraryUpdate);
    };
  }, [forceReload, searchedQuery]);

  // Function to calculate Levenshtein distance between two strings
  const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // substitution
            matrix[i][j - 1] + 1,     // insertion
            matrix[i - 1][j] + 1      // deletion
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Function to calculate similarity score (0-1, where 1 is exact match)
  const calculateSimilarity = (str1, str2) => {
    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - distance) / maxLength;
  };

  // Function to search library items with fuzzy matching
  const searchLibraryItems = (query) => {
    if (!query.trim()) return [];
    
    const searchTerm = query.toLowerCase().trim();
    const results = [];
    const similarityThreshold = 0.3; // Minimum similarity score (30%)
    
    libraryItems.forEach(item => {
      let bestScore = 0;
      let matchedField = '';
      
      // Check title similarity
      const titleScore = calculateSimilarity(searchTerm, item.title);
      if (titleScore > bestScore) {
        bestScore = titleScore;
        matchedField = 'title';
      }
      
      // Check channel similarity
      if (item.channel) {
        const channelScore = calculateSimilarity(searchTerm, item.channel);
        if (channelScore > bestScore) {
          bestScore = channelScore;
          matchedField = 'channel';
        }
      }
      
      // Check tags similarity
      if (item.tags && Array.isArray(item.tags)) {
        item.tags.forEach(tag => {
          const tagScore = calculateSimilarity(searchTerm, tag);
          if (tagScore > bestScore) {
            bestScore = tagScore;
            matchedField = 'tag';
          }
        });
      }
      
      // Check for exact substring matches (higher priority)
      const exactTitleMatch = item.title.toLowerCase().includes(searchTerm);
      const exactChannelMatch = item.channel && item.channel.toLowerCase().includes(searchTerm);
      const exactTagMatch = item.tags && item.tags.some(tag => tag.toLowerCase().includes(searchTerm));
      
      if (exactTitleMatch || exactChannelMatch || exactTagMatch) {
        bestScore = Math.max(bestScore, 0.8); // Boost exact matches
      }
      
      // Add to results if similarity is above threshold
      if (bestScore >= similarityThreshold) {
        results.push({
          ...item,
          searchScore: bestScore,
          matchedField: matchedField
        });
      }
    });
    
    // Sort by relevance (highest score first)
    results.sort((a, b) => b.searchScore - a.searchScore);
    
    // Remove search metadata before returning
    return results.map(({ ...item }) => item);
  };

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setLibrarySearchResults([]);
      setSearchedQuery('');
      // Reload library when clearing search to show updated items
      forceReload();
      return;
    }

    // Set the searched query to the current search term
    setSearchedQuery(query.trim());

    // Check if the query is a YouTube URL
    const urlValidation = validateYouTubeUrl(query);
    if (urlValidation.isValid) {
      console.log(`Detected YouTube URL, opening video: ${urlValidation.videoId}`);
      
      // Navigate directly to video player with the extracted video ID
      const videoForPlayer = {
        videoId: urlValidation.videoId,
        title: `YouTube Video (${urlValidation.videoId})`,
        url: query.trim()
      };

      navigate(`/play/${urlValidation.videoId}`, {
        state: {
          video: videoForPlayer,
          searchQuery: query,
          searchResults: []
        }
      });
      return;
    }

    if (!urlValidation.isValid && urlValidation.reason === 'YouTube Shorts are not supported') {
      alert('YouTube Shorts are not supported. Please use regular YouTube videos.');
      return;
    }

    setIsSearching(true);
    
    try {
      // First, search library items
      const libraryMatches = searchLibraryItems(query);
      setLibrarySearchResults(libraryMatches);
      
      // Then, search external sources (YouTube) - library videos will be shown with "In Library" indicator
      const results = await window.electronAPI.youtubeSearch(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      // Show empty results if search fails
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Function to clear search and return to library view
  const clearSearchAndReturnToLibrary = () => {
    setSearchResults([]);
    setLibrarySearchResults([]);
    setSearchQuery('');
    setSearchedQuery('');
    forceReload();
  };

  // Listen for custom event to clear search (triggered by branding click)
  useEffect(() => {
    const handleClearSearch = () => {
      clearSearchAndReturnToLibrary();
    };

    window.addEventListener('clear-search-and-return', handleClearSearch);
    
    return () => {
      window.removeEventListener('clear-search-and-return', handleClearSearch);
    };
  }, []);

  return (
    <div className="w-full p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base-content mb-2">Your Library</h1>
        <p className="text-base-content/70">Your downloaded videos and media collection</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex items-center justify-center">
        <SearchBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          isSearching={isSearching}
        />
      </div>

      {/* Search Results */}
      {(searchResults.length > 0 || librarySearchResults.length > 0) && (
        <div>
          {/* Library Search Results */}
          {librarySearchResults.length > 0 && (
            <div className="mb-8">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-base-content">
                  Library Results for "{searchedQuery}" ({librarySearchResults.length} videos)
                </h2>
                <p className="text-sm text-base-content/70">Videos already in your library</p>
              </div>
              <MediaGrid 
                mediaItems={librarySearchResults} 
                showAddButton={false} 
                onItemRemoved={forceReload}
                showInLibraryIndicator={true}
              />
            </div>
          )}

          {/* External Search Results */}
          {searchResults.length > 0 && (
            <SearchResults 
              results={searchResults}
              searchQuery={searchedQuery}
              searchResults={searchResults}
              navigate={navigate}
            />
          )}
        </div>
      )}

      {/* Library Section - Only show when no search results */}
      {searchResults.length === 0 && librarySearchResults.length === 0 && (
        <div>
          {/* Show loading state */}
          {(libraryLoading || settingsLoading) && (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-lg"></span>
              <span className="ml-3 text-base-content/70">Loading your library...</span>
            </div>
          )}
          
          {/* Show empty state */}
          {!libraryLoading && !settingsLoading && displayItems.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2 text-base-content">Your Library is Empty</h3>
              <p className="text-base-content/70 mb-4">
                Search for videos above and download them to build your personal library.
              </p>
              <p className="text-sm text-base-content/50">
                Downloaded videos will appear here for offline viewing.
              </p>
            </div>
          )}
          
          {/* Show library items */}
          {!libraryLoading && !settingsLoading && displayItems.length > 0 && (
            <MediaGrid 
              mediaItems={displayItems} 
              showAddButton={false} 
              onItemRemoved={forceReload}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default Home; 