// Custom setup that bypasses jest-expo issues
global.__DEV__ = true;

// Fix for jest-expo Object.defineProperty error
if (!global.window) {
  global.window = {};
}
if (!global.window.localStorage) {
  global.window.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
}

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo modules
jest.mock('expo-constants', () => ({
  expoConfig: {
    version: '1.0.0',
    name: 'test',
    slug: 'test',
  },
  appOwnership: 'expo',
}));

// Mock reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock gesture handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    /* Buttons */
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    /* Other */
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

// Setup React Native globals
global.__reanimatedWorkletInit = jest.fn();

// Mock PostHog
jest.mock('posthog-react-native', () => ({
  usePostHog: () => ({
    capture: jest.fn(),
    identify: jest.fn(),
    screen: jest.fn(),
  }),
  PostHogProvider: ({ children }) => children,
}));

// Mock Platform for posthog-react-native
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  Version: '14.0',
  select: jest.fn((obj) => obj.ios || obj.default),
}));