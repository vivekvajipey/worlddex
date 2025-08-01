import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useUser } from '../../database/hooks/useUsers';
import { updateUserField } from '../../database/hooks/useUsers';

interface CameraSettingsContextType {
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
}

const CameraSettingsContext = createContext<CameraSettingsContextType | undefined>(undefined);

export function CameraSettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user?.id || null;
  const { user } = useUser(userId);
  
  // Initialize with user's preference or false
  const [isPublic, setIsPublicState] = useState(false);
  
  // Update when user data loads
  useEffect(() => {
    if (user?.default_public_captures !== undefined) {
      setIsPublicState(user.default_public_captures);
    }
  }, [user?.default_public_captures]);
  
  // Function to update both state and database
  const setIsPublic = async (value: boolean) => {
    setIsPublicState(value);
    if (userId) {
      await updateUserField(userId, 'default_public_captures', value);
    }
  };
  
  return (
    <CameraSettingsContext.Provider value={{ isPublic, setIsPublic }}>
      {children}
    </CameraSettingsContext.Provider>
  );
}

export function useCameraSettings() {
  const context = useContext(CameraSettingsContext);
  if (context === undefined) {
    throw new Error('useCameraSettings must be used within a CameraSettingsProvider');
  }
  return context;
}