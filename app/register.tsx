import React, { useState, useEffect } from 'react';
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
import { Colors } from '@/constants/Colors';
import { DEFAULT_TENANT_ID } from '@/constants/config';
import { authService } from '@/services/auth.service';
import { categoryService } from '@/services/category.service';
import { Ionicons } from '@expo/vector-icons';
import { UserRole } from '@/types/auth';
import { Category } from '@/types/category';
import { Typography } from '@/constants/typography';

export default function RegisterScreen() {
  const router = useRouter();
  
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  
  // Category related states
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const roles: { label: string; value: UserRole }[] = [
    { label: 'Student', value: 'student' },
    { label: 'Service Provider', value: 'vendor' },
  ];

  // Fetch categories when component mounts
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const fetchedCategories = await categoryService.getCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      Alert.alert('Error', 'Failed to load categories. Please try again.');
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleRegister = async () => {
    // Validation
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (!email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (role === 'vendor' && !selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!agreeToTerms) {
      Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setIsLoading(true);
    try {
      await authService.register({
        name: fullName,
        email,
        password,
        confirmPassword,
        role,
        category: role === 'vendor' ? selectedCategory : undefined,
        tenantId: DEFAULT_TENANT_ID,
      });
      
      Alert.alert(
        'Success',
        'Account created successfully! Please login with your credentials.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/login'),
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(
        'Registration Failed',
        error.message || 'An error occurred during registration. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
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
          <Text style={styles.subtitle}>Join our community of learners and educators</Text>

          {/* Register Card */}
          <View>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.description}>
              Get started with your learning journey
            </Text>

          {/* Full Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={Colors.placeholder}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          </View>

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

          {/* Role Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>I am a</Text>
            <TouchableOpacity
              style={styles.dropdownContainer}
              onPress={() => setShowRoleDropdown(!showRoleDropdown)}
            >
              <Text style={[styles.dropdownText, !role && styles.placeholderText]}>
                {roles.find(r => r.value === role)?.label || 'Select your role'}
              </Text>
              <Ionicons
                name={showRoleDropdown ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>
            
            {showRoleDropdown && (
              <View style={styles.dropdownList}>
                {roles.map((roleOption) => (
                  <TouchableOpacity
                    key={roleOption.value}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setRole(roleOption.value);
                      setShowRoleDropdown(false);
                      // Reset category when role changes
                      if (roleOption.value === 'student') {
                        setSelectedCategory('');
                      }
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{roleOption.label}</Text>
                    {role === roleOption.value && (
                      <Ionicons name="checkmark" size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Category Dropdown - Only show for vendors */}
          {role === 'vendor' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                style={styles.dropdownContainer}
                onPress={() => setShowCategoryDropdown(!showCategoryDropdown)}
                disabled={loadingCategories}
              >
                {loadingCategories ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Text style={[styles.dropdownText, !selectedCategory && styles.placeholderText]}>
                      {categories.find(c => c.id === selectedCategory)?.name || 'Select a category'}
                    </Text>
                    <Ionicons
                      name={showCategoryDropdown ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={Colors.textSecondary}
                    />
                  </>
                )}
              </TouchableOpacity>
              
              {showCategoryDropdown && (
                <View style={styles.dropdownList}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setSelectedCategory(category.id);
                          setShowCategoryDropdown(false);
                        }}
                      >
                        <View style={styles.categoryItem}>
                          <View>
                            <Text style={styles.dropdownItemText}>{category.name}</Text>
                          </View>
                          {selectedCategory === category.id && (
                            <Ionicons name="checkmark" size={20} color={Colors.primary} />
                          )}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Create a password"
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

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={Colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm your password"
                placeholderTextColor={Colors.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms Checkbox */}
          <TouchableOpacity
            style={styles.termsCheckboxContainer}
            onPress={() => setAgreeToTerms(!agreeToTerms)}
          >
            <View style={[styles.checkbox, agreeToTerms && styles.checkboxChecked]}>
              {agreeToTerms && <Ionicons name="checkmark" size={14} color="#FFF" />}
            </View>
            <Text style={styles.termsCheckboxText}>
              I agree to the{' '}
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
          </TouchableOpacity>

            {/* Create Account Button */}
            <TouchableOpacity
              style={[styles.createButton, isLoading && styles.createButtonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.createButtonText}>Create account</Text>
              )}
            </TouchableOpacity>

            {/* Sign In Link */}
            <View style={styles.signInContainer}>
              <Text style={styles.signInText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.signInLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </ScrollView>
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
    borderRadius: 24,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    marginTop: 8,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingBottom: 40,
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
  orangeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F97316',
  },
  blueDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logoGanimi: {
    color: Colors.text,
  },
  logoI: {
    color: Colors.text,
  },
  brandName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
    fontFamily: Typography.fontFamily.regular,
  },
  card: {
    // kept for backward-compat; no longer used for layout
  },
  title: {
    fontSize: 24,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.bold,
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.regular,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    fontFamily: Typography.fontFamily.semiBold,
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
  dropdownContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    height: 48,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  placeholderText: {
    color: Colors.placeholder,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    paddingTop: 4,
    borderColor: Colors.border,
    backgroundColor: Colors.inputBackground,
    color: Colors.textSecondary,
  },
  dropdownScroll: {
    maxHeight: 240,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.white,
    marginHorizontal: 4,
    marginBottom: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  categoryItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  termsCheckboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    marginRight: 8,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  termsCheckboxText: {
    fontSize: 13,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 20,
    fontFamily: Typography.fontFamily.regular,
  },
  termsLink: {
    color: Colors.link,
    fontFamily: Typography.fontFamily.medium,
  },
  createButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    flex: 1,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    lineHeight: 16,
    top: -1,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  signInLink: {
    fontSize: 14,
    color: Colors.link,
    fontFamily: Typography.fontFamily.semiBold,
  },
});
