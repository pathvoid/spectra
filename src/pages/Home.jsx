import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import MediaGrid from '../components/MediaGrid';
import useLibrary from '../hooks/useLibrary';
import useSettings from '../hooks/useSettings';

function Home() {
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState(location.state?.searchQuery || '');
  const [searchResults, setSearchResults] = useState(location.state?.searchResults || []);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  // Use library and settings hooks
  const { 
    isLoading: libraryLoading, 
    error: libraryError,
    getFilteredItems,
    forceReload
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
      // Only reload if we're currently showing the library (no search results)
      if (searchResults.length === 0) {
        console.log('Library updated, refreshing display...');
        forceReload();
      }
    };

    window.addEventListener('library-updated', handleLibraryUpdate);
    
    return () => {
      window.removeEventListener('library-updated', handleLibraryUpdate);
    };
  }, [forceReload, searchResults.length]);

  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      // Reload library when clearing search to show updated items
      forceReload();
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
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
          setSearchQuery('');
          setSearchResults([]);
          forceReload(); // Reload library when going back to home
          navigate('/', { replace: true });
        }}>
          <div>
            <h1 className="text-2xl font-bold text-primary">Spectra</h1>
            <p className="text-sm text-base-content/70">Privacy in every frame</p>
          </div>
        </div>

        {/* Search Bar - Centered */}
        <SearchBar 
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleSearch}
          isSearching={isSearching}
        />
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <SearchResults 
          results={searchResults}
          searchQuery={searchQuery}
          searchResults={searchResults}
          navigate={navigate}
        />
      )}

      {/* Library Section - Only show when no search results */}
      {searchResults.length === 0 && (
        <div>
          {/* Library Header */}
          {displayItems.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className='text-xl font-semibold text-base-content'>
                  Your Library ({displayItems.length} items)
                </h2>
                <div className="text-sm text-base-content/70">
                  {libraryLoading && 'Loading...'}
                  {libraryError && (
                    <span className='text-error'>Error: {libraryError}</span>
                  )}
                </div>
              </div>
            </div>
          )}
          
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