import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { DEFAULT_TENANT_ID } from '@/constants/config';
import { Typography } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { tokenStorage } from '@/services/tokenStorage';
import { red } from 'react-native-reanimated/lib/typescript/Colors';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(email, password, DEFAULT_TENANT_ID);

      // Navigate based on user role
      if (user.role === 'vendor') {
        router.replace('/(vendor)/dashboard');
      } else if (user.role === 'student') {
        router.replace('/(student)/dashboard');
      } else {
        // Fallback for other roles
        router.replace('/(vendor)/dashboard');
      }
    } catch (error: any) {
      Alert.alert(
        'Login Failed',
        error.message || 'Invalid credentials. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // DEV ONLY: Clear all auth data
  const clearAuthData = async () => {
    try {
      // Clear SecureStore tokens
      await tokenStorage.clear();
      
      // Clear AsyncStorage
      await AsyncStorage.multiRemove(['user', 'access_token', 'refresh_token', 'accessToken', 'refreshToken']);
      
      // Clear all AsyncStorage (nuclear option for any cached data)
      const allKeys = await AsyncStorage.getAllKeys();
      if (allKeys.length > 0) {
        await AsyncStorage.multiRemove(allKeys);
      }
      
      Alert.alert('Success', 'All auth data and cache cleared. App will reload.');
      
      // Force a hard reload by throwing an error
      setTimeout(() => {
        throw new Error('Forced reload after clearing auth');
      }, 1000);
    } catch (error) {
      Alert.alert('Error', 'Failed to clear auth data');
      console.error('[DEV] Clear auth data failed:', error);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('@/assets/images/icon-wide.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.subtitle}>Connect with expert service providers</Text>

        {/* Login Card */}
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.description}>
            Enter your credentials to access your account
          </Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={Colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Enter your password"
                placeholderTextColor={Colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Remember Me & Forgot Password */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && <Ionicons name="checkmark" size={14} color="#FFF" />}
              </View>
              <Text style={styles.rememberMeText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => Alert.alert('Forgot Password', 'Password reset functionality coming soon!')}>
              <Text style={styles.forgotPassword}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}
          <TouchableOpacity
            style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.signInButtonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          {/* Sign Up Link */}
          <View style={styles.signUpContainer}>
            <Text style={styles.signUpText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/register')}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* DEV ONLY: Clear Auth Button */}
          {/* {__DEV__ && (
            <TouchableOpacity
              style={styles.clearAuthButton}
              onPress={clearAuthData}
            >
              <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              <Text style={styles.clearAuthText}>Clear Auth Data (Dev)</Text>
            </TouchableOpacity>
          )} */}

          {/* Terms */}
          <View style={styles.termsContainer}>
            <Text style={styles.termsText}>
              By signing in, you agree to our{' '}
              <Text
                style={styles.termsLink}
                onPress={() =>
                  Linking.openURL('https://ganimii.com/terms').catch(() => {
                    Alert.alert('Unable to open link', 'Please try again later.');
                  })
                }
              >
                Terms of Service
              </Text>{' '}
              and{' '}
              <Text
                style={styles.termsLink}
                onPress={() =>
                  Linking.openURL('https://ganimii.com/privacy').catch(() => {
                    Alert.alert('Unable to open link', 'Please try again later.');
                  })
                }
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 24,
    backgroundColor: Colors.white,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    left: -5,
  },
  logoImage: {
    width: '100%',
    maxWidth: 100,
    height: 60,
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logoGanimi: {
    color: Colors.text,
  },
  tagline: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
    fontFamily: Typography.fontFamily.regular,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: Typography.fontFamily.regular,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    color: Colors.text,
    marginBottom: 4,
    alignSelf: 'center',
    fontFamily: Typography.fontFamily.bold,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    alignSelf: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    marginLeft: 20,
    color: Colors.textSecondary,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 15,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
  },
  passwordInput: {
    paddingRight: 48,
  },
  eyeIcon: {
    position: 'absolute',
    right: 12,
    padding: 8,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberMeText: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
  },
  forgotPassword: {
    fontSize: 14,
    color: Colors.link,
    fontFamily: Typography.fontFamily.semiBold,
  },
  signInButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    top: -2,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  signUpLink: {
    fontSize: 14,
    color: Colors.link,
    fontFamily: Typography.fontFamily.semiBold,
  },
  termsContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontFamily: Typography.fontFamily.regular,
  },
  termsLink: {
    color: Colors.link,
    fontFamily: Typography.fontFamily.medium,
  },
  clearAuthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    gap: 8,
  },
  clearAuthText: {
    color: '#FF6B6B',
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
