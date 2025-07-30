export const useAlert = jest.fn(() => ({
  showAlert: jest.fn(),
  hideAlert: jest.fn(),
  currentAlert: null,
}));