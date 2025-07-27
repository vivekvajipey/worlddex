import React, { useState, useCallback } from 'react';
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

export function useStyledAlert() {
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

  const AlertComponent = () => (
    <StyledAlert
      {...alertState}
      buttons={wrappedButtons}
    />
  );

  return {
    showAlert,
    hideAlert,
    AlertComponent
  };
}