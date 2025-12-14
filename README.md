# LaunderGo Mobile App

A React Native mobile application built with Expo that provides a seamless mobile experience for the LaunderGo laundry services platform.

## 🚀 Features

- **Cross-Platform**: Works on both iOS and Android
- **WebView Integration**: Displays the LaunderGo website (laundergo.shubhworks.com)
- **Safe Area Support**: Proper handling for devices with notches and different screen sizes
- **Responsive Design**: Optimized for mobile viewing with proper viewport settings
- **Theme Integration**: Custom theme colors (#000000 primary, #14b8a6 secondary) with professional styling
- **Error Handling**: Beautiful error screens with retry functionality
- **Loading States**: Custom splash screen during app initialization
- **Navigation**: Android back button support for WebView navigation
- **Performance**: Optimized WebView settings for smooth user experience

## 🎨 Icon Configuration

The app includes comprehensive icon support with all necessary formats:

### Icon Assets Applied:
- **Main App Icon**: 512x512 PNG (primary identifier)
- **iOS Icons**: 1024x1024 (App Store), 180x180 (iPhone), 167x167 (iPad Pro), 152x152 (iPad)
- **Android Icons**: Adaptive icon with theme background, multiple density support
- **Web Icon**: 192x192 favicon for web platform
- **Splash Screen**: Custom logo with theme color background
- **Notification Icon**: Optimized for push notifications

### Platform-Specific Features:
- **iOS**: Full icon set for all device types and App Store submission
- **Android**: Adaptive icons with monochrome support for Android 13+ themed icons
- **Web**: High-quality favicon for PWA support

All icons maintain consistent branding and are sourced from your public folder assets.

## 📱 Screenshots

The app provides a native mobile wrapper for your web application with:
- Beautiful splash screen with LG logo
- Seamless WebView integration
- Proper safe area handling for all device types
- Error handling with retry functionality

## 🛠 Installation & Setup

### Prerequisites
- Node.js (v18 or later)
- Expo CLI
- For iOS development: Xcode (macOS only)
- For Android development: Android Studio

### Quick Start

1. **Clone and Setup**
   ```bash
   cd EasyLiftDropApp
   npm install
   ```

2. **Development**
   ```bash
   # Start development server
   npm start

   # Run on Android
   npm run android

   # Run on iOS (macOS only)
   npm run ios

   # Run on Web
   npm run web
   ```

3. **Testing on Physical Device**
   - Install Expo Go app from App Store/Play Store
   - Scan QR code from terminal

## 🔧 Configuration

### App Configuration (`app.json`)
- App name and identifiers configured
- Splash screen with theme color
- Platform-specific settings
- Internet permissions for Android

### WebView Settings
- Optimized for mobile viewing
- Safe area insets handling
- Proper viewport meta tags
- Performance optimizations

## 📦 Dependencies

- **expo**: ~54.0.25 - Expo SDK
- **react-native-webview**: 13.15.0 - WebView component
- **react-native-safe-area-context**: ~5.6.0 - Safe area handling
- **expo-status-bar**: ~3.0.8 - Status bar configuration

## 🚀 Deployment

### Android
```bash
# Build APK
expo build:android

# Or build AAB for Play Store
expo build:android -t app-bundle
```

### iOS
```bash
# Build for App Store
expo build:ios
```

### Web
```bash
# Build for web
expo build:web
```

## 📱 Platform-Specific Features

### iOS
- Safe area insets properly handled
- Smooth scrolling and animations
- App Transport Security configured for HTTPS

### Android
- Edge-to-edge display support
- Hardware back button navigation
- Predictive back gesture disabled for WebView

## 🔒 Security

- HTTPS enforcement
- Secure WebView settings
- Proper Content Security Policy
- Network security configuration

## 🎯 Performance Optimizations

- Lazy loading of WebView content
- Optimized bundle size
- Smooth animations and transitions
- Memory management for WebView

## 🐛 Troubleshooting

### Common Issues

1. **WebView not loading**
   - Check internet connection
   - Verify URL is accessible
   - Check firewall settings

2. **Safe area issues**
   - Update react-native-safe-area-context
   - Ensure proper StatusBar configuration

3. **Android back button**
   - Implemented with proper cleanup
   - Works with WebView navigation

## 📞 Support

For technical issues or feature requests, please contact the development team.

## 🔄 Updates

The app automatically displays the latest version of the web application as it loads content directly from easyliftdrop.de.

---

**Built with ❤️ using React Native and Expo**
