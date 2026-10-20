import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType, signInWithPopup, signOut } from '../lib/firebase';
import { AppUser, UserRole } from '../types/accounting';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  appUser: AppUser | null;
  role: UserRole;
  isAdmin: boolean;
  isAccountant: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'premdhfa@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>('admin'); // Default admin for development/owner
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setCurrentUser(fbUser);
      if (fbUser) {
        const isOwnerAdmin = fbUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();
        let userRole: UserRole = isOwnerAdmin ? 'admin' : 'accountant';

        const userDocRef = doc(db, 'users', fbUser.uid);
        try {
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            const data = snap.data();
            userRole = isOwnerAdmin ? 'admin' : (data.role || 'accountant');
          } else {
            // Create user document
            await setDoc(userDocRef, {
              uid: fbUser.uid,
              email: fbUser.email || '',
              displayName: fbUser.displayName || 'Accountant',
              role: userRole,
              createdAt: new Date().toISOString(),
            });
          }
        } catch (err) {
          console.warn('Could not read user profile from Firestore, using inferred role:', err);
        }

        const profile: AppUser = {
          uid: fbUser.uid,
          email: fbUser.email || '',
          displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
          role: userRole,
        };
        setAppUser(profile);
        setRole(userRole);
      } else {
        // Guest mode - provide default owner session so app works seamlessly
        setAppUser({
          uid: 'local-owner',
          email: ADMIN_EMAIL,
          displayName: 'Owner / Accountant',
          role: 'admin',
        });
        setRole('admin');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign In Error:', err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  const isAdmin = role === 'admin';
  const isAccountant = role === 'admin' || role === 'accountant';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        appUser,
        role,
        isAdmin,
        isAccountant,
        isLoading,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
