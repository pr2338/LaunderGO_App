import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator, Image } from 'react-native';
import { AppConfig } from '../types/AppConfig';

interface SplashScreenProps {
  message?: string;
  config: AppConfig;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ 
  message,
  config
}) => {
  const displayMessage = message || `Loading ${config.shortName}...`;
  
  return (
    <View style={[styles.container, { backgroundColor: config.primaryColor }]}>
      <View style={styles.logoContainer}>
        <View style={[styles.logo, { backgroundColor: config.backgroundColor }]}>
          {config.logoUrl ? (
            <Image 
              source={{ uri: config.logoUrl }} 
              style={styles.logoImage}
              resizeMode="contain"
            />
          ) : (
            <Text style={[styles.logoText, { color: config.primaryColor }]}>
              {config.shortName.substring(0, 2).toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.title}>{config.appName}</Text>
        <Text style={styles.subtitle}>{config.tagline}</Text>
      </View>
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={config.secondaryColor} />
        <Text style={[styles.loadingText, { color: config.secondaryColor }]}>{displayMessage}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 50,
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
  logoImage: {
    width: 60,
    height: 60,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontWeight: '300',
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
});
