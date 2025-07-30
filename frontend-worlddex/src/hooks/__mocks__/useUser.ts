export const useUser = jest.fn(() => ({
  user: {
    id: 'test-user-123',
    email: 'test@example.com',
    daily_captures_used: 0,
    total_captures: 0,
    display_name: 'Test User',
    username: 'testuser',
  },
  isLoading: false,
  refetch: jest.fn(),
}));