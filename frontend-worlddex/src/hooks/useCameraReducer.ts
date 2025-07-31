import { useReducer, useCallback, Dispatch } from 'react';

export type RarityTier = "common" | "uncommon" | "rare" | "epic" | "mythic" | "legendary";

export interface CaptureBox {
  x: number;
  y: number;
  width: number;
  height: number;
  aspectRatio: number;
}

export interface CameraState {
  // Capture flow
  capture: {
    isCapturing: boolean;
    uri: string | null;
    box: CaptureBox;
  };
  
  // Location
  location: {
    latitude: number;
    longitude: number;
  } | null;
  
  // VLM/Identification
  identification: {
    vlmSuccess: boolean | null;
    label: string | null;
    isComplete: boolean;
  };
  
  // Metadata
  metadata: {
    rarityTier: RarityTier;
    rarityScore: number | undefined;
  };
}

export type CameraAction = 
  // Capture actions
  | { type: 'START_CAPTURE' }
  | { type: 'CAPTURE_SUCCESS'; payload: { uri: string; box?: CaptureBox } }
  | { type: 'CAPTURE_FAILED' }
  | { type: 'RESET_CAPTURE' }
  | { type: 'SET_CAPTURE_BOX'; payload: CaptureBox }
  
  // Location actions
  | { type: 'SET_LOCATION'; payload: { latitude: number; longitude: number } | null }
  
  // VLM/Identification actions
  | { type: 'VLM_PROCESSING_START' }
  | { type: 'VLM_PROCESSING_SUCCESS'; payload: { label: string } }
  | { type: 'VLM_PROCESSING_FAILED' }
  | { type: 'IDENTIFICATION_COMPLETE' }
  | { type: 'RESET_IDENTIFICATION' }
  
  // Metadata actions
  | { type: 'SET_RARITY'; payload: { tier: RarityTier; score?: number } }
  | { type: 'RESET_METADATA' }
  
  // Global reset
  | { type: 'RESET_ALL' };

const initialState: CameraState = {
  capture: {
    isCapturing: false,
    uri: null,
    box: {
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      aspectRatio: 1
    }
  },
  location: null,
  identification: {
    vlmSuccess: null,
    label: null,
    isComplete: false
  },
  metadata: {
    rarityTier: "common",
    rarityScore: undefined
  }
};

function cameraReducer(state: CameraState, action: CameraAction): CameraState {
  switch (action.type) {
    // Capture actions
    case 'START_CAPTURE':
      return {
        ...state,
        capture: {
          ...state.capture,
          isCapturing: true,
          uri: null
        }
      };
    
    case 'CAPTURE_SUCCESS':
      return {
        ...state,
        capture: {
          ...state.capture,
          isCapturing: false,
          uri: action.payload.uri,
          box: action.payload.box || state.capture.box
        }
      };
    
    case 'CAPTURE_FAILED':
      return {
        ...state,
        capture: {
          ...state.capture,
          isCapturing: false,
          uri: null
        }
      };
    
    case 'RESET_CAPTURE':
      return {
        ...state,
        capture: {
          ...initialState.capture,
          box: state.capture.box // Preserve box for next capture
        }
      };
    
    case 'SET_CAPTURE_BOX':
      return {
        ...state,
        capture: {
          ...state.capture,
          box: action.payload
        }
      };
    
    // Location actions
    case 'SET_LOCATION':
      return {
        ...state,
        location: action.payload
      };
    
    // VLM/Identification actions
    case 'VLM_PROCESSING_START':
      return {
        ...state,
        identification: {
          ...state.identification,
          vlmSuccess: null,
          label: null,
          isComplete: false
        }
      };
    
    case 'VLM_PROCESSING_SUCCESS':
      return {
        ...state,
        identification: {
          ...state.identification,
          vlmSuccess: true,
          label: action.payload.label
        }
      };
    
    case 'VLM_PROCESSING_FAILED':
      return {
        ...state,
        identification: {
          ...state.identification,
          vlmSuccess: false,
          label: null
        }
      };
    
    case 'IDENTIFICATION_COMPLETE':
      return {
        ...state,
        identification: {
          ...state.identification,
          isComplete: true
        }
      };
    
    case 'RESET_IDENTIFICATION':
      return {
        ...state,
        identification: initialState.identification
      };
    
    // Metadata actions
    case 'SET_RARITY':
      return {
        ...state,
        metadata: {
          ...state.metadata,
          rarityTier: action.payload.tier,
          rarityScore: action.payload.score ?? state.metadata.rarityScore
        }
      };
    
    case 'RESET_METADATA':
      return {
        ...state,
        metadata: initialState.metadata
      };
    
    // Global reset
    case 'RESET_ALL':
      return initialState;
    
    default:
      return state;
  }
}

// Action creators
export const cameraActions = {
  // Capture actions
  startCapture: (): CameraAction => ({ type: 'START_CAPTURE' }),
  captureSuccess: (uri: string, box?: CaptureBox): CameraAction => ({ 
    type: 'CAPTURE_SUCCESS', 
    payload: { uri, box } 
  }),
  captureFailed: (): CameraAction => ({ type: 'CAPTURE_FAILED' }),
  resetCapture: (): CameraAction => ({ type: 'RESET_CAPTURE' }),
  setCaptureBox: (box: CaptureBox): CameraAction => ({ 
    type: 'SET_CAPTURE_BOX', 
    payload: box 
  }),
  
  // Location actions
  setLocation: (location: { latitude: number; longitude: number } | null): CameraAction => ({ 
    type: 'SET_LOCATION', 
    payload: location 
  }),
  
  // VLM/Identification actions
  vlmProcessingStart: (): CameraAction => ({ type: 'VLM_PROCESSING_START' }),
  vlmProcessingSuccess: (label: string): CameraAction => ({ 
    type: 'VLM_PROCESSING_SUCCESS', 
    payload: { label } 
  }),
  vlmProcessingFailed: (): CameraAction => ({ type: 'VLM_PROCESSING_FAILED' }),
  identificationComplete: (): CameraAction => ({ type: 'IDENTIFICATION_COMPLETE' }),
  resetIdentification: (): CameraAction => ({ type: 'RESET_IDENTIFICATION' }),
  
  // Metadata actions
  setRarity: (tier: RarityTier, score?: number): CameraAction => ({ 
    type: 'SET_RARITY', 
    payload: { tier, score } 
  }),
  resetMetadata: (): CameraAction => ({ type: 'RESET_METADATA' }),
  
  // Global reset
  resetAll: (): CameraAction => ({ type: 'RESET_ALL' })
};

export interface UseCameraReducerReturn {
  state: CameraState;
  dispatch: Dispatch<CameraAction>;
  actions: typeof cameraActions;
  
  // Convenience getters
  isCapturing: boolean;
  capturedUri: string | null;
  captureBox: CaptureBox;
  location: { latitude: number; longitude: number } | null;
  vlmSuccess: boolean | null;
  identifiedLabel: string | null;
  identificationComplete: boolean;
  rarityTier: RarityTier;
  rarityScore: number | undefined;
}

export function useCameraReducer(): UseCameraReducerReturn {
  const [state, dispatch] = useReducer(cameraReducer, initialState);
  
  // Log actions in development
  const dispatchWithLogging = useCallback((action: CameraAction) => {
    // if (__DEV__) {
    //   console.log('[CameraReducer] Action:', action.type, action);
    // }
    dispatch(action);
  }, []);
  
  return {
    state,
    dispatch: dispatchWithLogging,
    actions: cameraActions,
    
    // Convenience getters for backward compatibility
    isCapturing: state.capture.isCapturing,
    capturedUri: state.capture.uri,
    captureBox: state.capture.box,
    location: state.location,
    vlmSuccess: state.identification.vlmSuccess,
    identifiedLabel: state.identification.label,
    identificationComplete: state.identification.isComplete,
    rarityTier: state.metadata.rarityTier,
    rarityScore: state.metadata.rarityScore
  };
}