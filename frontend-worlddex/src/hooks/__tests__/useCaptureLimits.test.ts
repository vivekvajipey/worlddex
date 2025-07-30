import { renderHook, act } from '@testing-library/react-native';
import { useCaptureLimits } from '../useCaptureLimits';
import { useUser } from '../../../database/hooks/useUsers';
import { useAlert } from '../../contexts/AlertContext';

// Mock dependencies
jest.mock('../../../database/hooks/useUsers');
jest.mock('../../contexts/AlertContext');

describe('useCaptureLimits', () => {
  const mockShowAlert = jest.fn();
  const mockUser = {
    daily_captures_used: 5,
    total_captures: 100
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useAlert as jest.Mock).mockReturnValue({ showAlert: mockShowAlert });
    (useUser as jest.Mock).mockReturnValue({ user: mockUser });
  });

  it('should return correct capture limit values', () => {
    const { result } = renderHook(() => useCaptureLimits('user-123'));

    expect(result.current.dailyCapturesUsed).toBe(5);
    expect(result.current.dailyCaptureLimit).toBe(10);
  });

  it('should allow captures when under limit', () => {
    const { result } = renderHook(() => useCaptureLimits('user-123'));

    let canCapture: boolean = false;
    act(() => {
      canCapture = result.current.checkCaptureLimit();
    });

    expect(canCapture).toBe(true);
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('should block captures when at limit', () => {
    (useUser as jest.Mock).mockReturnValue({ 
      user: { ...mockUser, daily_captures_used: 10 } 
    });

    const { result } = renderHook(() => useCaptureLimits('user-123'));

    let canCapture: boolean = false;
    act(() => {
      canCapture = result.current.checkCaptureLimit();
    });

    expect(canCapture).toBe(false);
    expect(mockShowAlert).toHaveBeenCalledWith({
      title: "Daily Limit Reached",
      message: "You have used all 10 daily captures! They will reset at midnight PST.",
      icon: "timer-outline",
      iconColor: "#EF4444"
    });
  });

  it('should allow capture when no user (not logged in)', () => {
    (useUser as jest.Mock).mockReturnValue({ user: null });

    const { result } = renderHook(() => useCaptureLimits(null));

    let canCapture: boolean = false;
    act(() => {
      canCapture = result.current.checkCaptureLimit();
    });

    expect(canCapture).toBe(true);
    expect(mockShowAlert).not.toHaveBeenCalled();
  });

  it('should handle edge case of exactly at limit', () => {
    (useUser as jest.Mock).mockReturnValue({ 
      user: { ...mockUser, daily_captures_used: 9 } 
    });

    const { result } = renderHook(() => useCaptureLimits('user-123'));

    let canCapture: boolean = false;
    act(() => {
      canCapture = result.current.checkCaptureLimit();
    });

    expect(canCapture).toBe(true); // 9 < 10, so should be allowed
  });
});