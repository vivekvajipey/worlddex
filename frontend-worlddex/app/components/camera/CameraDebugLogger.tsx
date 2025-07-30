import { useEffect } from 'react';

interface CameraDebugLoggerProps {
  states: {
    isCapturing: boolean;
    capturedUri: string | null;
    vlmCaptureSuccess: boolean | null;
    identifiedLabel: string | null;
    identificationComplete: boolean;
    idLoading: boolean;
    idError: any;
    savedOffline: boolean;
  };
}

export const CameraDebugLogger: React.FC<CameraDebugLoggerProps> = ({ states }) => {
  // useEffect(() => {
  //   if (__DEV__) {
  //     console.log("=== CAMERA STATE UPDATE ===");
  //     console.log("isCapturing:", states.isCapturing);
  //     console.log("capturedUri:", states.capturedUri);
  //     console.log("vlmCaptureSuccess:", states.vlmCaptureSuccess);
  //     console.log("identifiedLabel:", states.identifiedLabel);
  //     console.log("identificationComplete:", states.identificationComplete);
  //     console.log("idLoading:", states.idLoading);
  //     console.log("idError:", states.idError);
  //     console.log("savedOffline:", states.savedOffline);
  //   }
  // }, [states]);

  // This component doesn't render anything
  return null;
};

export default CameraDebugLogger;