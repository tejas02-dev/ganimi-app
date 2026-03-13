import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
import { useEffect } from 'react';
import { Colors } from '@/constants/Colors';
export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-ExtraLight': require('../assets/fonts/PlusJakartaSans-ExtraLight.ttf'),
    'PlusJakartaSans-Light': require('../assets/fonts/PlusJakartaSans-Light.ttf'),
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    'PlusJakartaSans-ExtraBold': require('../assets/fonts/PlusJakartaSans-ExtraBold.ttf'),
    'PlusJakartaSans-Italic': require('../assets/fonts/PlusJakartaSans-Italic.ttf'),
    'PlusJakartaSans-MediumItalic': require('../assets/fonts/PlusJakartaSans-MediumItalic.ttf'),
    'PlusJakartaSans-SemiBoldItalic': require('../assets/fonts/PlusJakartaSans-SemiBoldItalic.ttf'),
    'PlusJakartaSans-BoldItalic': require('../assets/fonts/PlusJakartaSans-BoldItalic.ttf'),
    'PlusJakartaSans-ExtraBoldItalic': require('../assets/fonts/PlusJakartaSans-ExtraBoldItalic.ttf'),
  });

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }
    // In Expo Go / edge-to-edge the background color call is ignored,
    // but button style still applies so icons stay visible.
    // NavigationBar.setButtonStyleAsync('dark');
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={Colors.backgroundSecondary} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
