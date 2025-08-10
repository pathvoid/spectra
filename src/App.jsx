import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import About from './pages/About';
import Settings from './pages/Settings';
import Favorites from './pages/Favorites';
import NotFound from './pages/NotFound';
import Sidebar from './components/Sidebar';
import BackgroundDownloadStatus from './components/BackgroundDownloadStatus';
import UpdateNotification from './components/UpdateNotification';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-64">
        {/* Mobile header with menu button */}
        <div className="lg:hidden bg-base-200 border-b border-base-300 p-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="btn btn-ghost btn-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Routes */}
        <div className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/favorites" element={<Favorites />} />
            <Route path="/play/:id" element={<VideoPlayer />} />
            <Route path="/about" element={<About />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
      
      {/* Background download status indicator */}
      <BackgroundDownloadStatus />
      
      {/* Update notification */}
      <UpdateNotification />
    </div>
  );
}

export default App;