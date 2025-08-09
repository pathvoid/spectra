import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import VideoPlayer from './pages/VideoPlayer';
import About from './pages/About';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';
import BackgroundDownloadStatus from './components/BackgroundDownloadStatus';

function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/play/:id" element={<VideoPlayer />} />
        <Route path="/about" element={<About />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Background download status indicator */}
      <BackgroundDownloadStatus />
    </div>
  );
}

export default App;