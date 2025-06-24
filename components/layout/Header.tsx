import React, { useState } from 'react';
import { Menu, ChevronDown, LogOut, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ toggleSidebar }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  return (
    <header className="bg-white dark:bg-slate-800 shadow px-6 py-4 flex justify-between items-center">
      {/* Hamburger menu for mobile */}
      <button
        className="md:hidden text-slate-700 dark:text-white"
        onClick={toggleSidebar}
        aria-label="Toggle Sidebar"
      >
        <Menu size={24} />
      </button>

      <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Dashboard</h1>

      <div className="relative">
        {currentUser ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {currentUser.email}
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-50">
                <div className="px-4 py-2 text-sm text-slate-700 dark:text-slate-200 border-b border-slate-100 dark:border-slate-700">
                  {currentUser.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-slate-600 dark:text-slate-300">Loading user...</div>
        )}
        
        {/* Click outside to close dropdown */}
        {isDropdownOpen && (
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsDropdownOpen(false)}
          />
        )}
      </div>
    </header>
  );
};

export default Header;
