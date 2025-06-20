import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NAV_ITEMS, APP_NAME } from '../../constants';
import { NavItem, UserRole } from '../../types';

interface SidebarProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, toggleSidebar }) => {
  const location = useLocation();
  const { currentUser } = useAuth();
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
    const padding = level === 0 ? 'px-4' : `pl-${4 + level * 4} pr-4`;

    const itemClasses = `flex items-center justify-between text-sm py-2.5 rounded-md transition group ${
      isActive
        ? 'bg-primary/20 text-white font-semibold'
        : 'hover:bg-slate-700 text-gray-300 hover:text-white'
    } ${padding}`;

    if (item.subItems && item.subItems.length > 0) {
      return (
        <div key={item.name}>
          <button
            onClick={() => toggleSection(item.name)}
            className={itemClasses}
          >
            <span className="flex items-center gap-2">
              {item.icon}
              {item.name}
            </span>
            {openSections[item.name] ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {openSections[item.name] && (
            <div className="ml-4 space-y-1 mt-1">
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
          className={({ isActive: linkActive }) =>
            `block ${itemClasses} ${
              linkActive ? 'bg-primary/20 text-white' : ''
            }`
          }
          onClick={() => {
            if (window.innerWidth < 768) toggleSidebar();
          }}
        >
          <span className="flex items-center gap-2">
            {item.icon}
            {item.name}
          </span>
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
        <nav className="p-4 space-y-1">{NAV_ITEMS.map(renderItem)}</nav>
      </aside>
    </>
  );
};

export default Sidebar;
