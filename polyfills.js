// Polyfills for React Native
import 'react-native-url-polyfill/auto';

// Fix for protocol property error
if (typeof global !== 'undefined') {
  // Ensure protocol is not writable to prevent the error
  if (global.location && global.location.protocol) {
    try {
      Object.defineProperty(global.location, 'protocol', {
        value: global.location.protocol,
        writable: false,
        configurable: false
      });
    } catch (e) {
      // Ignore if already defined
    }
  }
}
