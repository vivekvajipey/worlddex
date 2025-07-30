import React from 'react';
import { Text } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { CameraPermissionHandler } from '../CameraPermissionHandler';
import { CameraPermissionStatus } from 'expo-camera';

// Mock CameraPlaceholder
jest.mock('../CameraPlaceholder', () => ({
  CameraPlaceholder: ({ permissionStatus, onRequestPermission }: any) => (
    <MockCameraPlaceholder 
      permissionStatus={permissionStatus} 
      onRequestPermission={onRequestPermission} 
    />
  )
}));

const MockCameraPlaceholder = ({ permissionStatus, onRequestPermission }: any) => (
  <>
    <Text testID="placeholder">Camera Placeholder: {permissionStatus}</Text>
    <Text testID="request-button" onPress={onRequestPermission}>Request Permission</Text>
  </>
);

describe('CameraPermissionHandler', () => {
  const mockRequestPermission = jest.fn();
  const mockOnPermissionGranted = jest.fn();
  const mockOnPermissionDenied = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render placeholder when permissions not resolved', () => {
    const { getByTestId } = render(
      <CameraPermissionHandler
        permission={{ status: null, granted: false }}
        requestPermission={mockRequestPermission}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    expect(getByTestId('placeholder')).toBeTruthy();
    expect(() => getByTestId('camera-content')).toThrow();
  });

  it('should render children when permission is granted', () => {
    const { getByTestId } = render(
      <CameraPermissionHandler
        permission={{ status: 'granted' as CameraPermissionStatus, granted: true }}
        requestPermission={mockRequestPermission}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    expect(getByTestId('camera-content')).toBeTruthy();
    expect(() => getByTestId('placeholder')).toThrow();
  });

  it('should request permissions on mount if not granted', async () => {
    render(
      <CameraPermissionHandler
        permission={{ status: 'undetermined' as CameraPermissionStatus, granted: false }}
        requestPermission={mockRequestPermission}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    await waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  it('should call onPermissionGranted when permission is granted', () => {
    render(
      <CameraPermissionHandler
        permission={{ status: 'granted' as CameraPermissionStatus, granted: true }}
        requestPermission={mockRequestPermission}
        onPermissionGranted={mockOnPermissionGranted}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    expect(mockOnPermissionGranted).toHaveBeenCalled();
  });

  it('should call onPermissionDenied when permission is denied', () => {
    render(
      <CameraPermissionHandler
        permission={{ status: 'denied' as CameraPermissionStatus, granted: false }}
        requestPermission={mockRequestPermission}
        onPermissionDenied={mockOnPermissionDenied}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    expect(mockOnPermissionDenied).toHaveBeenCalled();
  });

  it('should handle permission status changes', () => {
    const { rerender, getByTestId } = render(
      <CameraPermissionHandler
        permission={{ status: 'undetermined' as CameraPermissionStatus, granted: false }}
        requestPermission={mockRequestPermission}
        onPermissionGranted={mockOnPermissionGranted}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    // Initially should show placeholder
    expect(getByTestId('placeholder')).toBeTruthy();

    // Update to granted
    rerender(
      <CameraPermissionHandler
        permission={{ status: 'granted' as CameraPermissionStatus, granted: true }}
        requestPermission={mockRequestPermission}
        onPermissionGranted={mockOnPermissionGranted}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    // Should now show content
    expect(getByTestId('camera-content')).toBeTruthy();
    expect(mockOnPermissionGranted).toHaveBeenCalled();
  });

  it('should pass correct props to CameraPlaceholder', () => {
    const { getByTestId } = render(
      <CameraPermissionHandler
        permission={{ status: 'denied' as CameraPermissionStatus, granted: false }}
        requestPermission={mockRequestPermission}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    expect(getByTestId('placeholder')).toHaveTextContent('Camera Placeholder: denied');
    
    // Test request permission button
    fireEvent.press(getByTestId('request-button'));
    expect(mockRequestPermission).toHaveBeenCalled();
  });

  it('should handle null permission object', () => {
    const { getByTestId } = render(
      <CameraPermissionHandler
        permission={null}
        requestPermission={mockRequestPermission}
      >
        <Text testID="camera-content">Camera Content</Text>
      </CameraPermissionHandler>
    );

    expect(getByTestId('placeholder')).toBeTruthy();
    expect(getByTestId('placeholder')).toHaveTextContent('Camera Placeholder: undetermined');
  });
});