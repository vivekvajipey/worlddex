export const useImageProcessor = jest.fn(() => ({
  processImageForVLM: jest.fn().mockResolvedValue({
    uri: 'file:///processed.jpg',
    width: 512,
    height: 512,
    base64: 'base64data...',
  }),
}));