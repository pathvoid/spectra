function SearchResults({ results, searchQuery, searchResults, navigate }) {
  return (
    <div className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {results.map((result) => (
          <div key={result.id} className="card bg-base-100 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate(`/play/${result.id}`, { state: { video: result, searchQuery, searchResults } })}>
            <figure className="px-4 pt-4">
              <img
                src={result.thumbnail}
                alt={result.title}
                className="w-full h-64 object-cover rounded-lg"
              />
            </figure>
            <div className="card-body p-4">
              <h3 className="card-title text-sm line-clamp-2">{result.title}</h3>
              <p className="text-xs text-base-content/70">{result.channel}</p>
              <div className="flex justify-between items-center text-xs text-base-content/60">
                <span>{result.duration}</span>
                <span>{result.views}</span>
              </div>
              <div className="card-actions justify-end mt-3">
                <button className="btn btn-primary btn-xs">Add to Library</button>
                <button className="btn btn-ghost btn-xs" onClick={() => navigate(`/play/${result.id}`, { state: { video: result, searchQuery, searchResults } })}>Play</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SearchResults; 