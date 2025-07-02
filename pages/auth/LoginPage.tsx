// pages/auth/LoginPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { PlatformAuditLog } from '../../utils/auditLogger'; // Keep this import as is
import { SignInMethod } from 'firebase/auth';
import type { UserRole, User as AuthUserType } from '../../types';

// Import React Hook Form and Zod for validation
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI Components
import { Timestamp } from 'firebase/firestore';
import Button from '../../components/ui/Button';
import { Lock, User } from 'lucide-react'; // Lucide icons
// Removed GoogleIcon import as per previous request

// Define the validation schema for the login form
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  rememberMe: z.boolean().optional(),
});

// Infer the TypeScript type from the schema
type LoginFormInputs = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { login, isLoadingAuth, currentUser  } = useAuth();
  const userRole = currentUser?.role as UserRole | undefined; // Ensure userRole is defined
  const navigate = useNavigate();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setErrorMessage('');
    try {
      await login(data.email, data.password);

      const actorInfo: AuthUserType | null = currentUser ? {
        id: currentUser.id,
        email: currentUser.email || '',
        name: currentUser.name || '',
        phone: '',
        role: userRole || undefined as unknown as UserRole,
        // photoURL: currentUser.photoURL || undefined
      } : null;

      PlatformAuditLog({
        actionType: 'LOGIN',
        actor: actorInfo,
        targetEntityId: data.email,
        targetEntityType: 'user',
        targetEntityDescription: `User login attempt by ${data.email}`,
        actionDescription: `User ${data.email} logged in successfully via email/password.`,
        details: {
          method: SignInMethod.EMAIL_LINK,
        },
        timestamp: Timestamp.now(),
      });
      navigate('/');
    } catch (error: any) {
      console.error('[DEBUG] Login error:', error);
      let userFacingError = 'An unexpected error occurred. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          userFacingError = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          userFacingError = 'The email address is not valid.';
          break;
        case 'auth/user-disabled':
          userFacingError = 'Your account has been disabled.';
          break;
        case 'auth/network-request-failed':
          userFacingError = 'Network error. Please check your internet connection.';
          break;
        default:
          userFacingError = 'An unexpected error occurred. Please try again.';
          break;
      }
      setErrorMessage(userFacingError);

      const actorInfoFailed: AuthUserType | null = currentUser ? {
        id: currentUser.id,
        email: currentUser.email || '',
        name: currentUser.name || '',
        phone: '',
        role: userRole || undefined as unknown as UserRole,
        // photoURL: currentUser.photoURL || undefined
      } : null;

      PlatformAuditLog({
        actionType: 'LOGIN',
        actor: actorInfoFailed,
        targetEntityId: data.email,
        targetEntityType: 'user',
        targetEntityDescription: `Failed login attempt by ${data.email}`,
        actionDescription: `Login attempt failed for ${data.email}. Error: ${error.message}`,
        details: {
          method: SignInMethod.EMAIL_LINK,
          errorCode: error.code,
          errorMessage: error.message,
        },
        timestamp: Timestamp.now(),
      });
    }
  };

  return (
    // ✅ UI IMPROVEMENT: Gradient background
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 dark:from-gray-900 dark:to-gray-800">
      {/* ✅ UI IMPROVEMENT: Enhanced card appearance */}
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg dark:bg-gray-800 dark:shadow-2xl dark:border dark:border-gray-700">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 dark:text-white">
          Welcome Back
        </h2>
        <p className="text-center text-gray-600 dark:text-gray-400 text-lg">
          Sign in to your account
        </p>

        {errorMessage && (
          // ✅ UI IMPROVEMENT: Slightly more refined error message style
          <div
            className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950 dark:text-red-300 dark:border-red-700 transition-all duration-300 ease-in-out"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Email
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="w-5 h-5 text-gray-400" />
              </span>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                // ✅ UI IMPROVEMENT: Refined input focus and border colors
                className={`block w-full pl-10 pr-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:focus:ring-indigo-500 dark:focus:border-indigo-500
                  ${errors.email ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                {...register('email')}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.email.message}</p>  
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Password
            </label>
            <div className="relative mt-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="w-5 h-5 text-gray-400" />
              </span>
              <input
                id="password"
                type={passwordVisible ? 'text' : 'password'}
                autoComplete="current-password"
                required
                // ✅ UI IMPROVEMENT: Refined input focus and border colors
                className={`block w-full pl-10 pr-10 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:focus:ring-indigo-500 dark:focus:border-indigo-500
                  ${errors.password ? 'border-red-500 dark:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setPasswordVisible(!passwordVisible)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm leading-5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                {passwordVisible ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3.981 12C5.06 1.705 8.082 1.5 12 1.5s6.94 0 8.019 10.5h-16.038z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 12a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"
                    />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.password.message}</p>  
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:checked:bg-indigo-500"
                {...register('rememberMe')}
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-900 dark:text-gray-300"
              >
                Remember me
              </label>
            </div>
          </div>

          <Button type="submit" isLoading={isSubmitting || isLoadingAuth} className="w-full">
            Sign In
          </Button>
        </form>

        {/* Removed Google Login section - previously done */}
        <div className="relative mt-6"> {/* ✅ UI IMPROVEMENT: More subtle separator */}
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              Or
            </span>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{' '}
          <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Sign up
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;