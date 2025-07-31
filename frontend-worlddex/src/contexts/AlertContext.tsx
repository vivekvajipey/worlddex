import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import StyledAlert from '../components/StyledAlert';
import { Ionicons } from '@expo/vector-icons';

interface AlertOptions {
  title: string;
  message: string;
  buttons?: Array<{
    text: string;
    onPress?: () => void;
    style?: 'default' | 'cancel' | 'destructive';
  }>;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
  hasActiveAlert: boolean;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

interface AlertProviderProps {
  children: ReactNode;
}

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alertState, setAlertState] = useState<AlertOptions & { visible: boolean }>({
    visible: false,
    title: '',
    message: '',
    buttons: [{ text: 'OK' }]
  });

  const showAlert = useCallback((options: AlertOptions) => {
    setAlertState({
      ...options,
      visible: true,
      buttons: options.buttons || [{ 
        text: 'OK', 
        onPress: () => hideAlert() 
      }]
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  // Wrap button handlers to auto-hide alert after press
  const wrappedButtons = alertState.buttons?.map(button => ({
    ...button,
    onPress: () => {
      button.onPress?.();
      hideAlert();
    }
  }));

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert, hasActiveAlert: alertState.visible }}>
      {children}
      <StyledAlert
        {...alertState}
        buttons={wrappedButtons}
      />
    </AlertContext.Provider>
  );
};