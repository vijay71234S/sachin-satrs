"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export interface UserProfile {
  uid: string;
  email: string;
  role: "admin" | "member";
  playerName: string;
  phoneNumber?: string;
  playerId?: string;
  disabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  resetPassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Synchronize Firebase Auth State with Firestore User Profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setLoading(true);
        if (firebaseUser) {
          setUser(firebaseUser);
          
          // Get user profile from Firestore
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userSnapshot = await getDoc(userDocRef);
          
          if (userSnapshot.exists()) {
            const profileData = userSnapshot.data() as UserProfile;
            
            if (profileData.disabled) {
              await signOut(auth);
              setUser(null);
              setProfile(null);
              throw new Error("Your account has been disabled. Please contact the administrator.");
            }
            
            setProfile({ ...profileData, uid: firebaseUser.uid });
          } else {
            // Admin could have created user in auth but Firestore document hasn't synced,
            // or the user was created directly in Firebase Auth console.
            // Create a temporary read-only profile so they don't break, defaulting to 'member'.
            setProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              role: "member",
              playerName: firebaseUser.displayName || "Team Member",
            });
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Error in auth state change listener:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean) => {
    setLoading(true);
    try {
      // Set persistence based on "Remember Me" choice
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Force fetch profile now to ensure it is in state before page transitions finish
      const userDocRef = doc(db, "users", userCredential.user.uid);
      const userSnapshot = await getDoc(userDocRef);
      if (userSnapshot.exists()) {
        const profileData = userSnapshot.data() as UserProfile;
        if (profileData.disabled) {
          await signOut(auth);
          throw new Error("Your account has been disabled. Please contact the administrator.");
        }
        setProfile({ ...profileData, uid: userCredential.user.uid });
      }
    } catch (error: any) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
