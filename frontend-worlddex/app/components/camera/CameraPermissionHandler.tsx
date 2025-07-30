import React, { useEffect } from 'react';
import { CameraPermissionStatus } from 'expo-camera';
import { CameraPlaceholder } from './CameraPlaceholder';

interface CameraPermissionHandlerProps {
  permission: { status: CameraPermissionStatus | null; granted: boolean } | null;
  requestPermission: () => Promise<any>;
  children: React.ReactNode;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
}

export const CameraPermissionHandler: React.FC<CameraPermissionHandlerProps> = ({
  permission,
  requestPermission,
  children,
  onPermissionGranted,
  onPermissionDenied
}) => {
  const permissionsResolved = permission?.status != null;

  useEffect(() => {
    if (permission?.granted && onPermissionGranted) {
      onPermissionGranted();
    } else if (permission?.status === 'denied' && onPermissionDenied) {
      onPermissionDenied();
    }
  }, [permission, onPermissionGranted, onPermissionDenied]);

  // Request permissions on mount if not granted
  useEffect(() => {
    if (!permission?.granted && permissionsResolved) {
      requestPermission();
    }
  }, [permission, requestPermission, permissionsResolved]);

  if (!permissionsResolved) {
    return <CameraPlaceholder 
      permissionStatus={permission?.status || 'undetermined'} 
      onRequestPermission={requestPermission} 
    />;
  }

  if (!permission?.granted) {
    return <CameraPlaceholder 
      permissionStatus={permission?.status || 'undetermined'} 
      onRequestPermission={requestPermission} 
    />;
  }

  return <>{children}</>;
};

export default CameraPermissionHandler;