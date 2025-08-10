function Favorites() {
  return (
    <div className="w-full p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-base-content mb-2">Favorites</h1>
        <p className="text-base-content/70">Your favorite videos will appear here</p>
      </div>

      <div className="text-center py-12">
        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 mx-auto">
          <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold mb-2 text-base-content">No Favorites Yet</h3>
        <p className="text-base-content/70 mb-4">
          Start adding videos to your favorites to see them here.
        </p>
        <p className="text-sm text-base-content/50">
          This feature is coming soon!
        </p>
      </div>
    </div>
  );
}

export default Favorites;
