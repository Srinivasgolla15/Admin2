import React, { lazy, Suspense } from 'react'; // Added lazy and Suspense
import { Routes, Route, Outlet, useLocation, BrowserRouter } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import { UserRole } from './types'; // Ensure this import matches your types file

import ProtectedRoute from './components/auth/ProtectedRoute';
import MainLayout from './components/layout/MainLayout';
import UnauthorizedPage from './pages/auth/UnauthorizedPage';

// Lazy-loaded Page Components
const LoginPage = lazy(() => import('./pages/auth/LoginPage')); // Lazy-loaded
const DashboardPage = lazy(() => import('./pages/DashboardPage')); // Lazy-loaded
const AllClientsPage = lazy(() => import('./pages/clients/AllClientsPage')); // Lazy-loaded
const AllEmployeesPage = lazy(() => import('./pages/employees/AllEmployeesPage')); // Lazy-loaded
const PlatformUserManagementPage = lazy(() => import('./pages/users/PlatformUserManagementPage')); // Lazy-loaded
const AllPropertiesPage = lazy(() => import('./pages/properties/AllProperties')); // Lazy-loaded
const PaymentsPage = lazy(() => import('./pages/finance/PaymentsPage')); // Lazy-loaded
const CallbackRequestsPage = lazy(() => import('./pages/crm/CallbackRequests')); // Lazy-loaded
const ServiceEnquiriesPage = lazy(() => import('./pages/crm/ServiceEnquiriesPage')); // Lazy-loaded
const CombinedHistoryPage = lazy(() => import('./pages/history/CombinedHistoryPage')); // Lazy-loaded
const LeadsPage = lazy(() => import('./pages/crm/leadsPage')); // Lazy-loaded

// Page wrapper with animation (remains the same)
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

  return (
    <BrowserRouter>
      {/* Wrap your Routes with Suspense to handle lazy loading */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-screen bg-background text-foreground">
            Loading route...
          </div>
        }
      >
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<MainLayout />}>
              <Route element={<AnimatedOutlet />}>
                <Route path="/" element={<DashboardPage />} />
                {/* Add actual protected routes here */}

                <Route
                  path="/clients/AllClients"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]}>
                      <AllClientsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/crm/Leads"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]}>
                      <LeadsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/users/PlatformUserManagement"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin]}>
                      <PlatformUserManagementPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/crm/CallbackRequests"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]}>
                      <CallbackRequestsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/employees/Allemployees"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin]}>
                      <AllEmployeesPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/properties/AllProperties"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin]}>
                      <AllPropertiesPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/finance/Payments"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin]}>
                      <PaymentsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/crm/ServiceEnquiries"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]}>
                      <ServiceEnquiriesPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/history/CombinedHistory"
                  element={
                    <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin]}>
                      <CombinedHistoryPage />
                    </ProtectedRoute>
                  }
                />

                {/* Add more routes as needed */}
              </Route>
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default App;