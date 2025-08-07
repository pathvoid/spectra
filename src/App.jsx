import { Routes, Route, Link } from 'react-router-dom';

function Home() {
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

  return (
    <div className="w-full p-6">
      {/* Add New Media Tile */}
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
              <div className="w-full h-64 bg-gradient-to-br from-base-300 to-base-200 rounded-lg flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10"></div>
                <div className="relative z-10 text-center">
                  <div className="text-sm text-base-content/60 uppercase tracking-wide font-medium">{item.type}</div>
                </div>
              </div>
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
    </div>
  );
}

function About() {
  return <h1>About Page</h1>;
}

function Settings() {
  return <h1>Settings Page</h1>;
}

function NotFound() {
  return <h1>404 - Page Not Found</h1>;
}

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;