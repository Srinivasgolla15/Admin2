import React from 'react';
import { Routes, Route, Outlet, useLocation, BrowserRouter } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from './contexts/AuthContext';
import { UserRole } from './types'; // Ensure this import matches your types file

import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute'; 
import UnauthorizedPage from './pages/auth/UnauthorizedPage';
import MainLayout from './components/layout/MainLayout';


// Dashboard layout component
import DashboardPage from './pages/DashboardPage'; // Uncomment if you have a layout component
import AllClientsPage from './pages/clients/AllClientsPage';
import AllEmployeesPage from './pages/employees/AllEmployeesPage';

//Properties
import AllPropertiesPage from './pages/properties/AllProperties';

//finance
import PaymentsPage from './pages/finance/PaymentsPage'; // Replace with actual component

//CRM
import CallbackRequestsPage from './pages/crm/CallbackRequests';
import ServiceEnquiriesPage from './pages/crm/ServiceEnquiriesPage';

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
          {/*  Public route */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/*  Protected Routes */}
          <Route element={<ProtectedRoute />}>
              <Route path="/" element={<MainLayout />}>
                  <Route element={<AnimatedOutlet />}>
                      <Route path="/" element={<DashboardPage />} />
                    {/* Add actual protected routes here */}

                    <Route path="/clients/AllClients" element={ 
                      <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]}>
                        <AllClientsPage />
                      </ProtectedRoute>
                    }/>

                    <Route path="/crm/CallbackRequests" element={ 
                      <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]}>
                        <CallbackRequestsPage />
                      </ProtectedRoute>
                    }/>

                    <Route path="/employees/Allemployees" element={ 
                      <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin]}>
                        <AllEmployeesPage /> {/* Replace with actual component */}
                      </ProtectedRoute>
                    }/>

                    <Route path="/properties/AllProperties" element={ 
                      <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin]}>
                        <AllPropertiesPage /> {/* Replace with actual component */}
                      </ProtectedRoute>
                    }/>

                    <Route path="/finance/Payments" element={ 
                      <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin]}>
                        <PaymentsPage /> {/* Replace with actual component */}
                      </ProtectedRoute>
                    }/>

                    <Route path="/crm/ServiceEnquiries" element={ 
                      <ProtectedRoute allowedRoles={[UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]}>
                        <ServiceEnquiriesPage /> {/* Replace with actual component */}
                      </ProtectedRoute>
                    }/>

                    {/* Add more routes as needed */}
                    
                  </Route>
              </Route>
          </Route>
        </Routes>
    </BrowserRouter>
  );
};

export default App;
