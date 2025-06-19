import React from 'react';
import { Menu } from 'lucide-react'; // Hamburger icon
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const { currentUser } = useAuth();

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

      <div className="text-sm text-slate-600 dark:text-slate-300">
        {currentUser ? (
          <>Welcome, {currentUser.role}</>
        ) : (
          <>Loading user...</>
        )}
      </div>
    </header>
  );
};

export default Header;
