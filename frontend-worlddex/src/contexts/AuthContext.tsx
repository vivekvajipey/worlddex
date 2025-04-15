import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { Session, User, AuthResponse } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import * as AppleAuthentication from 'expo-apple-authentication';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      // Generate nonce for security
      const rawNonce = Array(16)
        .fill(0)
        .map(() => Math.floor(Math.random() * 256).toString(16))
        .join("");
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // Get the OAuth URL from Supabase with correct redirectTo value
      const response = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'worlddex://',
          queryParams: {
            nonce: hashedNonce,
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (response.error) throw response.error;

      if (response.data?.url) {
        // Open browser for authentication with exact matching URL scheme
        const result = await WebBrowser.openAuthSessionAsync(
          response.data.url,
          'worlddex://'
        );

        if (result.type === 'cancel') {
          throw new Error('User cancelled the operation');
        }

        if (result.type === 'success' && result.url) {
          // Handle the redirect URL
          const url = new URL(result.url);
          const params = new URLSearchParams(url.hash.substring(1));
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            // Set the session with the tokens
            const { error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) throw error;
          }
        }
      }
    } catch (error: any) {
      if (error.code !== "ERR_CANCELED") {
        throw error;
      }
    }
  };

  const signInWithApple = async () => {
    try {
      // Check if Apple Authentication is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Apple authentication is not available on this device");
      }

      // Generate nonce for security
      const rawNonce = Array(16)
        .fill(0)
        .map(() => Math.floor(Math.random() * 256).toString(16))
        .join("");
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // Use native Apple Sign In
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      // Sign in with Supabase using the Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) throw error;
    } catch (error: any) {
      if (error.code !== "ERR_CANCELED" && error.code !== "ERR_APPLE_AUTHENTICATION_CANCELLED") {
        throw error;
      }
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      signInWithGoogle,
      signInWithApple,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 