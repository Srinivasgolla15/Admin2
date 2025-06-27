import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../services/firebase';
import { PlatformAuditLog } from '../../utils/auditLogger';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Attempting login:', { email });

      // Perform login
      const { success, errorMsg } = await login(email, password);

      if (!success) {
        console.error('Login failed:', errorMsg);
        setError(errorMsg || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Wait for auth state to update
      const user = await new Promise((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          if (user) {
            console.log('Auth state updated:', { uid: user.uid, email: user.email });
            resolve(user);
          } else {
            console.error('No user after login');
            reject(new Error('Authentication state not updated'));
          }
        }, reject);
      });

      const userId = user.uid;
      const userRef = doc(db, 'users', userId);

      // Check if user document exists in Firestore
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        console.error('User document not found in Firestore:', userId);
        setError('User data not found. Please contact support.');
        setLoading(false);
        return;
      }

      const userData = userSnap.data();
      const now = Timestamp.now();

      // Update lastLogin in Firestore
      try {
        console.log('Updating lastLogin for user:', userId);
        await updateDoc(userRef, { lastLogin: now });
      } catch (err) {
        console.error('Error updating lastLogin:', err);
        // Continue despite Firestore error to avoid blocking login
      }

      // Log audit
      try {
        console.log('Logging audit for login:', { userId, email });
        await PlatformAuditLog({
          actionType: 'USER_LOGIN',
          actor: {
            id: userId,
            name: userData?.name || '',
            email: userData?.email || '',
            role: userData?.role || '',
            phone: userData?.phone || '',
          },
          targetEntityId: userId,
          targetEntityType: 'user',
          targetEntityDescription: `${userData?.name || userData?.email || userId}`,
          actionDescription: `User ${userData?.name || userData?.email || userId} logged in`,
          timestamp: now,
          details: {
            lastLogin: now,
          },
        });
      } catch (err) {
        console.error('Error logging audit:', err);
        // Continue despite audit error
      }

      console.log('Navigating to:', from);
      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[LoginPage] Login error:', err);
      setError(errorMessage.includes('auth/') ? 'Invalid email or password' : 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white dark:bg-slate-700 shadow-lg hover:shadow-xl transition-all border border-gray-200 dark:border-gray-600"
        aria-label="Toggle dark mode"
      >
        {theme === 'dark' ? (
          <Sun size={20} className="text-yellow-400" />
        ) : (
          <Moon size={20} className="text-gray-700" />
        )}
      </button>

      {/* Left Side - Image Section */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-blue-900 to-blue-700 p-12 text-white relative">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{
            backgroundImage: `url('/loginpage.jpg')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        />
        <div className="relative z-10">
          <p className="text-blue-100">Schedule visits in just a few clicks</p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center p-8 bg-white dark:bg-black">
        {/* Logo */}
        <div className="mb-10 w-full flex justify-center">
          <img 
            src="/Logo.jpg" 
            alt="Logo" 
            className="h-16 w-auto object-contain"
          />
        </div>
        
        <div className="w-full max-w-md mt-4">
          {/* Welcome Message */}
          <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-2">
            Welcome back
          </h1>
          
          {/* Sign in text */}
          <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
            Sign in to your account
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500 dark:text-gray-500 dark:hover:text-gray-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  'Signing in...'
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;