import React, { useState, useEffect } from 'react';
import { BackgroundImageUrl } from '../../constants'; 
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom'; // Fixed import
import UserIcon from '../../components/ui/Icons/userIcon';
import LockIcon from '../../components/ui/Icons/LockIcon';

const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [secret, setSecret] = useState('');
  const [logoVisible, setLogoVisible] = useState(false);
  const [cardVisible, setCardVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation(); // Added hook
  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    const logoTimer = setTimeout(() => setLogoVisible(true), 100);
    const cardTimer = setTimeout(() => setCardVisible(true), 300);
    return () => {
      clearTimeout(logoTimer);
      clearTimeout(cardTimer);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { success, errorMsg } = await login(identifier, secret);
      if (success) {
        navigate(from, { replace: true });
      } else {
        setError(errorMsg || 'Login failed. Please try again.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-900 p-4">
      {/* Background Image Container */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transition-opacity duration-1000"
        style={{ 
          backgroundImage: `url(${BackgroundImageUrl})`,
          filter: 'blur(8px)', 
          transform: 'scale(1.1)', 
          opacity: logoVisible ? 1 : 0, 
        }}
      ></div>
      {/* Overlay to darken/tint the background image */}
      <div className="absolute inset-0 w-full h-full bg-black/50"></div>

      {/* Login Card */}
      <div 
        className={`relative z-10 w-full max-w-md bg-slate-800/60 backdrop-blur-xl shadow-2xl rounded-xl p-8 md:p-10 text-white transition-all duration-700 ease-out ${
          cardVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95'
        }`}
      >
        {/* Logo and Tagline */}
        <div className="text-center mb-8">
          <h1 
            className={`text-5xl font-bold text-yellow-400 transition-all duration-700 ease-out ${
              logoVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-5'
            }`}
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Propeas
          </h1>
          <p 
            className={`mt-3 text-gray-300 transition-opacity duration-700 ease-out delay-200 ${
              logoVisible ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Manage properties, people, and performance.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-500/30 border border-red-700 text-red-300 rounded-md text-sm">
              <p>{error}</p>
            </div>
          )}
          {/* Phone/Email Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <UserIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text" // Reverted type
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Phone or Email" // Reverted placeholder
              className="w-full pl-10 pr-3 py-3 bg-slate-700/50 border border-slate-600 rounded-lg placeholder-gray-400 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              required
              aria-label="Phone or Email Address"
              disabled={loading}
            />
          </div>

          {/* Password/OTP Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LockIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="password"
              id="secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="Password or OTP" // Reverted placeholder
              className="w-full pl-10 pr-3 py-3 bg-slate-700/50 border border-slate-600 rounded-lg placeholder-gray-400 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-colors"
              required
              aria-label="Password or OTP"
              disabled={loading}
            />
          </div>
          
          {/* Login Button */}
          <button
            type="submit"
            className={`w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500 transition-all duration-300 transform hover:scale-105 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>

          {/* Links */}
          <div className="flex justify-between items-center text-sm">
            <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot password?
            </a>
            <a href="#" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
              Need help?
            </a>
          </div>

          {/* "Or continue with" Separator - Kept as it can be generic */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800/0 text-gray-400 backdrop-blur-sm">Or continue with</span>
            </div>
          </div>
          
          {/* Placeholder for other login methods or remove this section if not needed */}
          <div className="text-center text-sm text-gray-500">
            {/* Example: <button type="button" className="text-indigo-400 hover:text-indigo-300">Login with SSO</button> */}
            {/* For now, just a message or remove */}
            Alternative login methods might be available.
          </div>


        </form>
        
        {/* Language Toggle Placeholder */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>Language: <span className="font-medium text-indigo-400 cursor-pointer hover:text-indigo-300">English (US)</span></p>
        </div>
      </div>
    </div>
   
  );
};

export default LoginPage;