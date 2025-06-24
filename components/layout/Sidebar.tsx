import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NAV_ITEMS, APP_NAME } from '../../Constants';
import { NavItem, UserRole } from '../../types';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const canView = (roles?: UserRole[]): boolean => {
    if (!currentUser) return false;
    if (!roles || roles.length === 0) return true;
    return roles.includes(currentUser.role);
  };

  const isPathActive = (path: string | undefined): boolean => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const hasActiveChild = (items: NavItem[] | undefined): boolean => {
    if (!items) return false;
    return items.some(
      (item) =>
        canView(item.roles) &&
        (isPathActive(item.path) || hasActiveChild(item.subItems))
    );
  };

  useEffect(() => {
    if (!currentUser) return;
    const expandActiveMenus = (items: NavItem[]): Record<string, boolean> => {
      let state: Record<string, boolean> = {};
      for (const item of items) {
        if (!canView(item.roles)) continue;
        if (item.subItems && hasActiveChild(item.subItems)) {
          state[item.name] = true;
          Object.assign(state, expandActiveMenus(item.subItems));
        }
      }
      return state;
    };
    setOpenSections(expandActiveMenus(NAV_ITEMS));
  }, [location.pathname, currentUser]);

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const renderItem = (item: NavItem, level = 0) => {
    if (!canView(item.roles)) return null;

    const isActive = isPathActive(item.path) || hasActiveChild(item.subItems);
    const padding = 'px-4';
    
    const iconContainerClass = 'w-5 h-5 flex-shrink-0 flex items-center justify-center';
    const textContainerClass = 'leading-none text-left flex-1 min-w-0';
    const chevronContainerClass = 'w-4 flex-shrink-0 flex justify-end';

    const itemClasses = `flex items-center text-sm py-2.5 rounded-md transition group ${
      isActive
        ? 'bg-primary/20 text-white font-semibold'
        : 'hover:bg-slate-700 text-gray-300 hover:text-white'
    } ${padding} w-full text-left`;

    if (item.subItems && item.subItems.length > 0) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSection(item.name)}
            className={`${itemClasses} text-left`}
          >
            <div className="flex items-center w-full">
              <span className={iconContainerClass}>
                {item.icon}
              </span>
              <span className={textContainerClass}>
                {item.name}
              </span>
              <span className={chevronContainerClass}>
                {openSections[item.name] ? (
                  <ChevronDown size={16} className="flex-shrink-0" />
                ) : (
                  <ChevronRight size={16} className="flex-shrink-0" />
                )}
              </span>
            </div>
          </button>
          {openSections[item.name] && (
            <div className="ml-8 space-y-1">
              {item.subItems.map((subItem) => renderItem(subItem, level + 1))}
            </div>
          )}
        </div>
      );
    }

    if (item.path) {
      return (
        <NavLink
          key={item.path}
          to={item.path}
          className={itemClasses}
          onClick={() => {
            if (window.innerWidth < 768) toggleSidebar();
            if (item.onClick) item.onClick();
          }}
        >
          <div className="flex items-center w-full">
            <span className={iconContainerClass}>
              {item.icon}
            </span>
            <span className={textContainerClass}>
              {item.name}
            </span>
            <span className={chevronContainerClass}></span>
          </div>
        </NavLink>
      );
    }

    return null;
  };

  if (!currentUser) return null;

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      <aside
        className={`fixed md:static z-40 inset-y-0 left-0 bg-slate-800 text-white w-64 transition-transform transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:w-64`}
      >
        <div className="flex justify-between items-center h-16 px-4 border-b border-slate-700">
          <NavLink to="/" className="flex items-center text-xl font-bold" style={{ color: '#bfa136' }}>
            <img src="/Logo.jpg" className="h-10 w-10 mr-2 object-contain rounded" alt="Logo" />
            {APP_NAME}
          </NavLink>
          <button
            onClick={toggleSidebar}
            className="md:hidden"
            aria-label="Close sidebar"
            title="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>
        <nav className="p-4 space-y-1 flex-1 flex flex-col h-[calc(100%-4rem)]">
          <div className="flex-1 overflow-y-auto">
            {NAV_ITEMS.map(renderItem)}
          </div>
          <div className="pt-2 border-t border-slate-700 mt-4">
            {/* Logout Button */}
            <button
              onClick={async () => {
                try {
                  await logout();
                  window.location.href = '/login';
                } catch (error) {
                  console.error('Failed to log out', error);
                }
              }}
              className="flex items-center w-full text-left px-4 py-2.5 rounded-md text-sm text-gray-300 hover:bg-slate-700 hover:text-white transition-colors group"
            >
              <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out">
                  <path d="m16 17 5-5-5-5"></path>
                  <path d="M21 12H9"></path>
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                </svg>
              </span>
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
