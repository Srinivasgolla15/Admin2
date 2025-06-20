import React from 'react';
import { Routes, Route, Outlet, Navigate, useLocation, BrowserRouter } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';

import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute'; // ✅ capitalize and import correctly
import MainLayout from './components/layout/MainLayout';


// Dashboard layout component
import DashboardPage from './pages/DashboardPage'; // Uncomment if you have a layout component
import AllClientsPage from './pages/clients/AllClientsPage';

// Page wrapper with animation
const AnimatedOutlet: React.FC = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
};

const App: React.FC = () => {
  const { isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground">
        Loading application...
      </div>
    );
  }

  // console.log("Auth instance:", auth); // Removed undefined variable 'auth'

  return (
    <BrowserRouter>
        <Routes>
          {/* 🔓 Public route */}
          <Route path="/login" element={<LoginPage />} />

        {/* 🔐 Protected Routes */}
          <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout />}>
                  <Route element={<AnimatedOutlet />}>
                      <Route path="/" element={<DashboardPage />} />
                    {/* Add actual protected routes here */}

                    <Route path="/AllClients" element={<AllClientsPage/>} />
                  </Route>
              </Route>
          </Route>
        </Routes>
    </BrowserRouter>
  );
};

export default App;
