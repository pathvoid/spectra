function MediaGrid({ mediaItems }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-base-200 hover:bg-base-300 transition-colors cursor-pointer rounded-lg border border-base-300 flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Add New Media</h3>
          <p className="text-sm text-base-content/70">Import your files</p>
        </div>
      </div>

      {/* Media Items */}
      {mediaItems.map((item) => (
        <div key={item.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
          <figure className="px-6 pt-6">
            <img
              src="https://placehold.co/100x100"
              alt={item.title}
              className="w-full h-64 object-cover rounded-lg"
            />
          </figure>
          <div className="card-body">
            <h3 className="card-title text-base">{item.title}</h3>
            <div className="text-sm text-base-content/70">
              {item.artist && <p>Artist: {item.artist}</p>}
              {item.year && <p>Year: {item.year}</p>}
              {item.episodes && <p>Episodes: {item.episodes}</p>}
              <p>Duration: {item.duration}</p>
            </div>
            <div className="card-actions justify-end mt-4">
              <button className="btn btn-primary btn-sm">Play</button>
              <button className="btn btn-ghost btn-sm">Details</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default MediaGrid; 