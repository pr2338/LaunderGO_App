import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, Text, ActivityIndicator, Image, TouchableOpacity, Platform, Linking, BackHandler, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

const API_URL = 'https://laundergo.shubhworks.com/api/admin/app-config';
const WEBVIEW_URL = 'https://laundergo.shubhworks.com/schedule';

// JavaScript to completely disable zoom on all pages
const DISABLE_ZOOM_SCRIPT = `
  (function() {
    // Set viewport meta tag
    var meta = document.querySelector('meta[name="viewport"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'viewport');
      document.getElementsByTagName('head')[0].appendChild(meta);
    }
    meta.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no');
    
    // Disable pinch zoom
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gesturechange', function(e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('gestureend', function(e) { e.preventDefault(); }, { passive: false });
    
    // Disable double-tap zoom
    var lastTouchEnd = 0;
    document.addEventListener('touchend', function(e) {
      var now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
    
    // Disable wheel zoom (for testing in browser)
    document.addEventListener('wheel', function(e) {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // Add CSS to prevent text selection zoom issues
    var style = document.createElement('style');
    style.innerHTML = '* { -webkit-touch-callout: none; -webkit-text-size-adjust: 100%; touch-action: pan-x pan-y; }';
    document.head.appendChild(style);
  })();
  true;
`;

interface AppConfig {
  appName: string;
  shortName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  logoUrl: string;
}

const DEFAULT_CONFIG: AppConfig = {
  appName: "LaunderGo",
  shortName: "LaunderGo",
  tagline: "Get your clothes cleaned your way",
  primaryColor: "#000000",
  secondaryColor: "#14b8a6",
  backgroundColor: "#F5F5F5",
  logoUrl: "",
};

export default function App() {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [webViewReady, setWebViewReady] = useState(false);
  const [webViewError, setWebViewError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [locationGranted, setLocationGranted] = useState(false);
  const webViewRef = useRef<WebView>(null);

  // Request permissions on app start - this will show the permission dialog
  useEffect(() => {
    const requestPermissions = async () => {
      try {
        // Request location permission first - this triggers the popup
        const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
        console.log('Location permission status:', locationStatus);
        
        if (locationStatus === 'granted') {
          setLocationGranted(true);
          // Get current location to ensure permission is active
          try {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            console.log('Current location:', location.coords.latitude, location.coords.longitude);
          } catch (locErr) {
            console.log('Could not get current location:', locErr);
          }
        } else {
          // Show alert explaining why location is needed
          Alert.alert(
            'Location Permission Required',
            'LaunderGo needs your location to find nearby laundry services and show them on the map. Please enable location in your device settings.',
            [
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
              { text: 'Maybe Later', style: 'cancel' }
            ]
          );
        }
      } catch (err) {
        console.log('Error requesting permissions:', err);
      }
    };
    
    // Small delay to ensure app is fully loaded before showing permission dialogs
    const timer = setTimeout(() => {
      requestPermissions();
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // Fetch app config from API
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(API_URL, { 
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          }
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        }
      } catch (err) {
        console.log('Using default config');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleRetry = () => {
    setWebViewError(false);
    setWebViewReady(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  // Handle geolocation requests from WebView
  const handleGeolocationPermission = async (origin: string, callback: (allow: boolean) => void) => {
    const { status } = await Location.getForegroundPermissionsAsync();
    callback(status === 'granted');
  };

  // Show splash screen while loading config
  if (loading) {
    return (
      <View style={[styles.splashContainer, { backgroundColor: config.primaryColor }]}>
        <StatusBar style="light" />
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: '#FFFFFF' }]}>
            {config.logoUrl ? (
              <Image 
                source={{ uri: config.logoUrl }} 
                style={styles.logoInCircle}
                resizeMode="contain"
              />
            ) : (
              <Image 
                source={require('./assets/icons/icon-512.png')} 
                style={styles.logoInCircle}
                resizeMode="contain"
              />
            )}
          </View>
          <Text style={styles.appNameText}>{config.appName}</Text>
          <Text style={styles.subtitle}>{config.tagline}</Text>
        </View>
        <ActivityIndicator size="large" color={config.secondaryColor} style={styles.loader} />
      </View>
    );
  }

  // Show error screen if WebView fails
  if (webViewError) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: config.backgroundColor }]}>
        <StatusBar style="dark" />
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Connection Error</Text>
        <Text style={styles.errorMessage}>
          Unable to connect to {config.appName}. Please check your internet connection.
        </Text>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: config.primaryColor }]} 
          onPress={handleRetry}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: config.primaryColor }]}>
        <StatusBar style="light" />
        
        {/* WebView Loading Overlay */}
        {!webViewReady && (
          <View style={[styles.loadingOverlay, { backgroundColor: config.primaryColor }]}>
            <View style={[styles.logoCircle, { backgroundColor: config.secondaryColor || '#FFFFFF' }]}>
              {config.logoUrl ? (
                <Image 
                  source={{ uri: config.logoUrl }} 
                  style={styles.logoInCircle}
                  resizeMode="contain"
                />
              ) : (
                <Image 
                  source={require('./assets/icons/icon-512.png')} 
                  style={styles.logoInCircle}
                  resizeMode="contain"
                />
              )}
            </View>
            <Text style={styles.appNameText}>{config.appName}</Text>
            <Text style={styles.subtitle}>{config.tagline}</Text>
            <ActivityIndicator size="large" color={config.secondaryColor} style={styles.loader} />
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: WEBVIEW_URL }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scrollEnabled={true}
          scalesPageToFit={false}
          bounces={false}
          allowsFullscreenVideo={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          geolocationEnabled={true}
          // Disable all zoom
          setBuiltInZoomControls={false}
          setDisplayZoomControls={false}
          // Allow location access in WebView
          allowsBackForwardNavigationGestures={true}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            // Re-inject zoom prevention on every navigation
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(DISABLE_ZOOM_SCRIPT);
            }
          }}
          onLoadEnd={() => {
            setWebViewReady(true);
            // Inject zoom prevention when page loads
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(DISABLE_ZOOM_SCRIPT);
            }
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.log('WebView error:', nativeEvent);
            setWebViewError(true);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.log('WebView HTTP error:', nativeEvent.statusCode);
            if (nativeEvent.statusCode >= 500) {
              setWebViewError(true);
            }
          }}
          // Handle file upload (camera/gallery)
          onFileDownload={({ nativeEvent }) => {
            const { downloadUrl } = nativeEvent;
            Linking.openURL(downloadUrl);
          }}
          // Allow camera and microphone access
          mediaCapturePermissionGrantType="grant"
          // User agent to ensure proper mobile experience
          userAgent={Platform.select({
            android: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
            ios: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
          })}
          injectedJavaScript={DISABLE_ZOOM_SCRIPT}
          // @ts-ignore - geolocation permission handler works on Android
          onGeolocationPermissionsShowPrompt={(origin: string, callback: (origin: string, allow: boolean, retain: boolean) => void) => {
            callback(origin, true, true);
          }}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  logoInCircle: {
    width: 80,
    height: 80,
  },
  appNameText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  splashLogo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  logoTextLarge: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginTop: 10,
  },
  loader: {
    marginTop: 30,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
