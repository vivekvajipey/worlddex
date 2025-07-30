import React from 'react';
import { render } from '@testing-library/react-native';
import { CameraDebugLogger } from '../CameraDebugLogger';

// Mock console.log
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

describe('CameraDebugLogger', () => {
  beforeEach(() => {
    consoleLogSpy.mockClear();
  });

  afterAll(() => {
    consoleLogSpy.mockRestore();
  });

  it('should render without crashing', () => {
    const states = {
      isCapturing: false,
      capturedUri: null,
      vlmCaptureSuccess: null,
      identifiedLabel: null,
      identificationComplete: false,
      idLoading: false,
      idError: null,
      savedOffline: false
    };

    const { toJSON } = render(<CameraDebugLogger states={states} />);
    expect(toJSON()).toBeNull(); // Component doesn't render anything
  });

  it('should log state changes in development mode', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;

    const states = {
      isCapturing: true,
      capturedUri: 'test-uri',
      vlmCaptureSuccess: true,
      identifiedLabel: 'Test Label',
      identificationComplete: true,
      idLoading: false,
      idError: null,
      savedOffline: false
    };

    render(<CameraDebugLogger states={states} />);

    expect(consoleLogSpy).toHaveBeenCalledWith("=== CAMERA STATE UPDATE ===");
    expect(consoleLogSpy).toHaveBeenCalledWith("isCapturing:", true);
    expect(consoleLogSpy).toHaveBeenCalledWith("capturedUri:", 'test-uri');
    expect(consoleLogSpy).toHaveBeenCalledWith("vlmCaptureSuccess:", true);
    expect(consoleLogSpy).toHaveBeenCalledWith("identifiedLabel:", 'Test Label');
    expect(consoleLogSpy).toHaveBeenCalledWith("identificationComplete:", true);
    expect(consoleLogSpy).toHaveBeenCalledWith("idLoading:", false);
    expect(consoleLogSpy).toHaveBeenCalledWith("idError:", null);
    expect(consoleLogSpy).toHaveBeenCalledWith("savedOffline:", false);

    global.__DEV__ = originalDev;
  });

  it('should not log in production mode', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = false;

    const states = {
      isCapturing: true,
      capturedUri: 'test-uri',
      vlmCaptureSuccess: true,
      identifiedLabel: 'Test Label',
      identificationComplete: true,
      idLoading: false,
      idError: null,
      savedOffline: false
    };

    render(<CameraDebugLogger states={states} />);

    expect(consoleLogSpy).not.toHaveBeenCalled();

    global.__DEV__ = originalDev;
  });

  it('should log when states change', () => {
    const originalDev = global.__DEV__;
    global.__DEV__ = true;

    const states = {
      isCapturing: false,
      capturedUri: null,
      vlmCaptureSuccess: null,
      identifiedLabel: null,
      identificationComplete: false,
      idLoading: false,
      idError: null,
      savedOffline: false
    };

    const { rerender } = render(<CameraDebugLogger states={states} />);

    consoleLogSpy.mockClear();

    // Update states
    const newStates = {
      ...states,
      isCapturing: true,
      capturedUri: 'new-uri'
    };

    rerender(<CameraDebugLogger states={newStates} />);

    expect(consoleLogSpy).toHaveBeenCalledWith("=== CAMERA STATE UPDATE ===");
    expect(consoleLogSpy).toHaveBeenCalledWith("isCapturing:", true);
    expect(consoleLogSpy).toHaveBeenCalledWith("capturedUri:", 'new-uri');

    global.__DEV__ = originalDev;
  });
});