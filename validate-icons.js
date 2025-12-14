#!/usr/bin/env node

// Icon validation script for EasyLiftDrop App
const fs = require('fs');
const path = require('path');

const requiredIcons = [
  'icon.png',
  'adaptive-icon.png',
  'splash-icon.png',
  'favicon.png',
  'icon-1024.png',
  'icon-180.png',
  'icon-167.png',
  'icon-152.png',
  'icon-512.png'
];

const assetsDir = path.join(__dirname, 'assets');

console.log('🔍 Validating EasyLiftDrop App Icons...\n');

let allIconsPresent = true;

requiredIcons.forEach(iconName => {
  const iconPath = path.join(assetsDir, iconName);
  const exists = fs.existsSync(iconPath);
  
  if (exists) {
    const stats = fs.statSync(iconPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`✅ ${iconName} - ${sizeKB} KB`);
  } else {
    console.log(`❌ ${iconName} - MISSING`);
    allIconsPresent = false;
  }
});

console.log('\n' + '='.repeat(50));

if (allIconsPresent) {
  console.log('🎉 All required icons are present and ready!');
  console.log('📱 Your app is configured for optimal cross-platform compatibility.');
} else {
  console.log('⚠️  Some icons are missing. Please check the assets folder.');
}

console.log('\n📋 Icon Usage:');
console.log('• icon.png - Main app identifier');
console.log('• adaptive-icon.png - Android adaptive icon');
console.log('• splash-icon.png - Splash screen logo');
console.log('• favicon.png - Web platform favicon');
console.log('• icon-1024.png - iOS App Store submission');
console.log('• icon-180.png - iPhone home screen');
console.log('• icon-167.png - iPad Pro home screen');
console.log('• icon-152.png - iPad home screen');
console.log('• icon-512.png - High-res fallback');
