/* eslint-env jest */
/**
 * Jest setup that runs after the test framework is installed.
 */

// react-native-gesture-handler's Jest setup mocks the native module so
// GestureHandlerRootView / GestureDetector (toast, progress) render under Jest.
require("react-native-gesture-handler/jestSetup");
jest.mock("expo-image", () => {
  const React = require("react");
  const { Image } = require("react-native");

  const MockExpoImage = React.forwardRef((props, ref) =>
    React.createElement(Image, { ...props, ref }),
  );
  MockExpoImage.displayName = "ExpoImage";

  return { Image: MockExpoImage };
});

// BNA UI's Link opens external URLs through expo-web-browser, whose native
// module does not exist under Jest.
jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn().mockResolvedValue(undefined),
}));
