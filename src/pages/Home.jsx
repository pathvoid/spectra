import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import SearchBar from '../components/SearchBar';
import SearchResults from '../components/SearchResults';
import MediaGrid from '../components/MediaGrid';

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
        <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => {
          setSearchQuery('');
          setSearchResults([]);
          navigate('/', { replace: true });
        }}>
          <div>
            <h1 className="text-2xl font-bold text-primary">Spectra</h1>
            <p className="text-sm text-base-content/70">Media Center</p>
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

      {/* Add New Media Tile - Only show when no search results */}
      {searchResults.length === 0 && (
        <MediaGrid mediaItems={mediaItems} />
      )}
    </div>
  );
}

export default Home; 