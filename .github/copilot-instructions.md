# Copilot Instructions for LaunderGo Mobile App

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a React Native mobile application built with Expo that serves as a mobile wrapper for the LaunderGo laundry services platform. The app displays the website laundergo.shubhworks.com in a WebView with native mobile optimizations.

## Technology Stack
- **Framework**: React Native with Expo SDK 54
- **Language**: TypeScript
- **Key Libraries**: 
  - react-native-webview (WebView functionality)
  - react-native-safe-area-context (Safe area handling)
  - expo-status-bar (Status bar configuration)

## Design System
- **Primary Theme Color**: #000000 (Black)
- **Secondary Color**: #14b8a6 (Teal)
- **Accent Color**: #f59e0b (Amber)
- **Background Color**: #F5F5F5 (Light Gray)
- **Design Philosophy**: Mobile-first, clean, professional, accessible

## Code Standards
- Use TypeScript for all new files
- Follow React Native best practices
- Implement proper error handling
- Optimize for performance on mobile devices
- Ensure cross-platform compatibility (iOS/Android)

## Key Components Structure
- `App.tsx` - Main application component with WebView
- `components/SplashScreen.tsx` - Custom loading screen
- `components/ErrorScreen.tsx` - Error handling UI

## WebView Optimization Guidelines
- Always include proper viewport meta tags
- Implement safe area insets for notched devices
- Handle navigation states and back button on Android
- Optimize for mobile touch interactions
- Include proper error handling and retry mechanisms

## Platform Considerations
- **iOS**: Handle safe areas, App Transport Security
- **Android**: Edge-to-edge display, hardware back button
- **Cross-platform**: Consistent user experience

## Performance Best Practices
- Lazy load content where possible
- Optimize bundle size
- Handle memory management for WebView
- Implement proper loading states

When suggesting code improvements or new features, prioritize:
1. Mobile user experience
2. Performance optimization
3. Cross-platform compatibility
4. Proper error handling
5. Accessibility compliance
