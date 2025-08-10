function SearchBar({ searchQuery, setSearchQuery, onSearch, isSearching }) {
  return (
    <div className="absolute left-1/2 transform -translate-x-1/2">
      <div className="relative w-96">
        <input
          type="text"
          placeholder="Search videos or paste YouTube URL..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSearch(searchQuery)}
          className="input input-bordered w-full pl-10 pr-4"
        />
        <svg
          className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-base-content/50 pointer-events-none z-10"
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
  );
}

export default SearchBar; 