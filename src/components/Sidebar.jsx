import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      id: 'library',
      label: 'Your Library',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      path: '/'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      path: '/favorites'
    }
  ];

  const handleNavigation = (path) => {
    // If navigating to home and we're already on home, clear search results
    if (path === '/' && location.pathname === '/') {
      window.dispatchEvent(new CustomEvent('clear-search-and-return'));
    } else {
      // For all other routes, use normal navigation
      navigate(path);
    }
    
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-base-content/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed top-0 left-0 h-full w-64 bg-base-200 shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        lg:fixed lg:z-auto
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-300">
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => handleNavigation('/')}
              className="hover:opacity-80 transition-opacity"
            >
              <h1 className="text-xl font-bold text-primary">Spectra</h1>
            </button>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden btn btn-ghost btn-sm"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors
                    ${isActive(item.path) 
                ? 'bg-primary text-primary-content' 
                : 'hover:bg-base-300 text-base-content'
              }
                  `}
                >
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-base-300">
          <p className="text-xs text-base-content/50 text-center">
            Privacy in every frame
          </p>
        </div>
      </div>
    </>
  );
}

export default Sidebar;
