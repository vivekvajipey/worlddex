// Simple test setup for hooks

// Mock modules that the hooks depend on
jest.mock('../../../database/hooks/useUsers', () => ({
  useUser: jest.fn(() => ({
    user: {
      id: 'test-user',
      daily_captures_used: 0,
      total_captures: 0,
    },
    isLoading: false,
    refetch: jest.fn(),
  })),
}));

jest.mock('../../contexts/AlertContext', () => ({
  useAlert: jest.fn(() => ({
    showAlert: jest.fn(),
    hideAlert: jest.fn(),
  })),
}));

jest.mock('../useImageProcessor', () => ({
  useImageProcessor: jest.fn(() => ({
    processImageForVLM: jest.fn().mockResolvedValue({
      uri: 'file:///processed.jpg',
      width: 512,
      height: 512,
      base64: 'base64data...',
    }),
  })),
}));

jest.mock('../../services/offlineCaptureService', () => ({
  OfflineCaptureService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    saveImageLocally: jest.fn().mockResolvedValue('file:///local/image.jpg'),
    savePendingCapture: jest.fn().mockResolvedValue({}),
    getPendingCaptures: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

jest.mock('react-native', () => ({
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 812 })),
  },
  Alert: {
    alert: jest.fn(),
  },
}));