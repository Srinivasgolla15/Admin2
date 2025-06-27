import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  isLoadingAuth: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; errorMsg?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const loadUserRole = async (firebaseUser: FirebaseUser): Promise<User> => {
  console.log('[DEBUG] AuthContext: Loading user role for UID:', firebaseUser.uid);
  const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
  const data = userDoc.exists() ? userDoc.data() : {};
  console.log('[DEBUG] AuthContext: User doc data:', data);

  return {
    id: firebaseUser.uid,
    email: firebaseUser.email ?? '',
    name: data.name || firebaseUser.displayName || 'Unknown User',
    phone: data.phone || '', // ✅ fix: pull phone from Firestore, not from firebaseUser
    role: data.role ?? 'client',
  };
};


export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    console.log('[DEBUG] AuthContext: Setting up auth state listener');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[DEBUG] AuthContext: Auth state changed:', firebaseUser);
      if (firebaseUser) {
        const userWithRole = await loadUserRole(firebaseUser);
        console.log('[DEBUG] AuthContext: Setting currentUser:', userWithRole);
        setCurrentUser(userWithRole);
      } else {
        console.log('[DEBUG] AuthContext: No user logged in');
        setCurrentUser(null);
      }
      setIsLoadingAuth(false);
    });

    return () => {
      console.log('[DEBUG] AuthContext: Cleaning up auth state listener');
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    console.log('[DEBUG] AuthContext: Attempting login for:', email);
    setIsLoadingAuth(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userWithRole = await loadUserRole(result.user);
      console.log('[DEBUG] AuthContext: Login successful, user:', userWithRole);
      setCurrentUser(userWithRole);
      return { success: true };
    } catch (error: any) {
      console.error('[DEBUG] AuthContext: Login failed:', error);
      let message = 'Login failed. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No user found with this email.';
          break;
        case 'auth/wrong-password':
          message = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many attempts. Try again later.';
          break;
        default:
          message = error.message || message;
          break;
      }
      return { success: false, errorMsg: message };
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const logout = () => {
    console.log('[DEBUG] AuthContext: Logging out');
    signOut(auth);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isLoadingAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};