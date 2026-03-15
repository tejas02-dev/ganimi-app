import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/auth.service';
import type { VendorProfile, VendorOnboardingStatus, Gender, Branch } from '@/types/auth';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '@/services/api';
import { VendorOnboardingStepper } from '@/components/VendorOnboardingStepper';
import AsyncStorage from '@react-native-async-storage/async-storage';

type SectionKey = 'personal' | 'institution' | 'bank' | 'password' | null;

export default function VendorProfileScreen() {
  const router = useRouter();
  const { user, logout, setVendorProfile } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [onboarding, setOnboarding] = useState<VendorOnboardingStatus | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender>('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('');
  const [aadharNumber, setAadharNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [achievements, setAchievements] = useState('');

  // Institution details
  const [institutionName, setInstitutionName] = useState('');
  const [institutionPhone, setInstitutionPhone] = useState('');
  const [institutionEmail, setInstitutionEmail] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isSavingInstitution, setIsSavingInstitution] = useState(false);

  // Bank details
  const [bankName, setBankName] = useState('');
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');
  const [isSavingBank, setIsSavingBank] = useState(false);

  // Change password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const [expandedSection, setExpandedSection] = useState<SectionKey>('personal');

  const applyVendorToState = (vendor: VendorProfile) => {
    setProfile(vendor);

    setFullName(vendor.name ?? '');
    setEmail(vendor.email ?? '');
    setPhone(vendor.phone ?? '');
    setGender((vendor.gender as Gender) ?? '');
    setAddress(vendor.address ?? '');
    setPincode(vendor.pincode ?? '');
    // Backend uses "dob" field name
    setDateOfBirth((vendor as any).dateOfBirth ?? vendor.dob ?? '');
    setQualification(vendor.qualification ?? '');
    setExperience(vendor.experience ?? '');
    setAadharNumber(vendor.aadharNumber ?? '');
    setPanNumber(vendor.panNumber ?? '');
    setAchievements(vendor.achievements ?? '');

    // Institution details
    setInstitutionName(vendor.businessName ?? '');
    setInstitutionPhone(vendor.businessPhone ?? '');
    setInstitutionEmail(vendor.businessEmail ?? '');
    setBranches(vendor.branches ?? []);

    // Bank details
    setBankName(vendor.bankName ?? '');
    setBankAccountHolderName(vendor.bankAccountHolderName ?? '');
    setBankAccountNumber(vendor.bankAccountNumber ?? '');
    setBankIfscCode(vendor.bankIfscCode ?? '');
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!showOnboarding) {
      loadProfileForForm();
    }
  }, [showOnboarding]);

  const loadProfileForForm = async () => {
    try {
      const res = await apiService.get<{ status: string; message: string; data: VendorProfile }>(
        '/auth/user'
      );
      const vendor = res.data;
      if (vendor) {
        applyVendorToState(vendor);
      }
    } catch (e) {
      console.warn('[VendorProfile] Failed to fetch form data', e);
    }
  };

  const loadData = async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);
    try {
      const [profileRes, onboardingRes] = await Promise.all([
        apiService.get<{ status: string; message: string; data: VendorProfile }>('/auth/user'),
        authService.getVendorOnboardingStatus(),
      ]);

      const vendor = profileRes.data;

      if (__DEV__) {
        console.log('[VendorProfile] /auth/user response', { vendor });
      }

      if (!vendor) {
        throw new Error('Vendor profile data not found in /auth/user response.');
      }

      applyVendorToState(vendor);
      setLocalPhotoUri(null);
      const onboardingData = onboardingRes.data;
      setOnboarding(onboardingData);
      setShowOnboarding(!(onboardingData?.onboardingCompleted ?? false));
    } catch (e: any) {
      console.error('Failed to load vendor profile', e);
      setError(e?.message || 'Unable to load profile. Please try again.');
      setShowOnboarding(true);
    } finally {
      if (!isRefresh) setIsLoading(false);
      else setIsRefreshing(false);
    }
  };

  const checkOnboardingStatus = async () => {
    try {
      const response = await authService.getVendorOnboardingStatus();
      const data = response.data;
      const isOnboardingCompleted = data?.onboardingCompleted ?? false;
      setOnboarding(data);
      setShowOnboarding(!isOnboardingCompleted);
      return isOnboardingCompleted;
    } catch (err) {
      console.error('Error checking onboarding status:', err);
      return false;
    }
  };

  const handleOnboardingComplete = async () => {
    const completed = await checkOnboardingStatus();
    if (completed) {
      try {
        const profileResponse = await authService.getUserProfile();
        const updatedProfile = profileResponse.data;
        setVendorProfile(updatedProfile);
        setProfile(updatedProfile);
        applyVendorToState(updatedProfile);
        await AsyncStorage.setItem('vendorProfile', JSON.stringify(updatedProfile));
      } catch (e) {
        console.warn('Failed to refetch profile after onboarding', e);
      }
      Alert.alert('Success', 'Welcome! Your vendor profile is now complete.');
    }
  };

  const handleSave = async () => {
    if (!phone.trim()) {
      Alert.alert('Validation', 'Phone is required.');
      return;
    }

    if (!gender) {
      Alert.alert('Validation', 'Please select a gender.');
      return;
    }

    setIsSaving(true);
    try {
      await authService.updateVendorProfile({
        name: fullName,
        phone,
        gender,
        address,
        pincode,
        // Backend expects "dateOfBirth" field
        dateOfBirth,
        qualification,
        experience,
        aadharNumber,
        panNumber,
        achievements,
      });
      Alert.alert('Success', 'Profile updated successfully.');
      await loadData();
    } catch (e: any) {
      console.error('Failed to update vendor profile', e);
      Alert.alert('Error', e?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInstitution = async () => {
    if (!institutionName.trim()) {
      Alert.alert('Validation', 'Institution name is required.');
      return;
    }

    setIsSavingInstitution(true);
    try {
      await authService.updateInstitutionProfile({
        institutionName,
        institutionPhone,
        institutionEmail,
        branches,
      });
      Alert.alert('Success', 'Institution details updated successfully.');
      await loadData();
    } catch (e: any) {
      console.error('Failed to update institution profile', e);
      Alert.alert('Error', e?.message || 'Failed to update institution details. Please try again.');
    } finally {
      setIsSavingInstitution(false);
    }
  };

  const handleAddBranch = () => {
    const newBranch: Branch = {
      id: Date.now(),
      branchName: '',
      branchAddress: '',
      branchPincode: '',
    };
    setBranches((prev) => [...prev, newBranch]);
  };

  const updateBranchField = (index: number, field: keyof Branch, value: string | number) => {
    setBranches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value } as Branch;
      return copy;
    });
  };

  const handleRemoveBranch = (index: number) => {
    Alert.alert(
      'Remove branch',
      'Are you sure you want to remove this branch?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setBranches((prev) => prev.filter((_, i) => i !== index));
          },
        },
      ]
    );
  };

  const handleSaveBank = async () => {
    if (!bankName.trim() || !bankAccountHolderName.trim() || !bankAccountNumber.trim() || !bankIfscCode.trim()) {
      Alert.alert('Validation', 'Please fill in all bank details.');
      return;
    }

    setIsSavingBank(true);
    try {
      await authService.updateBankProfile({
        bankName,
        bankAccountNumber,
        bankAccountHolderName,
        bankIfscCode,
      });
      Alert.alert('Success', 'Bank details updated successfully.');
      await loadData();
    } catch (e: any) {
      console.error('Failed to update bank profile', e);
      Alert.alert('Error', e?.message || 'Failed to update bank details. Please try again.');
    } finally {
      setIsSavingBank(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photos to upload a profile picture.'
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const asset = result.assets[0];
    if (!asset?.uri) return;
    setLocalPhotoUri(asset.uri);
    setProfile((prev) => (prev ? { ...prev, profilePicture: asset.uri } : prev));
  };

  const handleSavePhoto = async () => {
    if (!localPhotoUri) {
      Alert.alert('Select image', 'Please select a photo first.');
      return;
    }

    setIsSavingPhoto(true);
    try {
      const filename = localPhotoUri.split('/').pop() || 'profile.jpg';
      const mimeType = 'image/jpeg';
      const res = await authService.uploadProfileImage(localPhotoUri, mimeType, filename);
      if (res.profilePicture) {
        setProfile((prev) => (prev ? { ...prev, profilePicture: res.profilePicture } : prev));
      }
      Alert.alert('Success', 'Profile photo updated successfully.');
      setLocalPhotoUri(null);
    } catch (e: any) {
      console.error('Failed to upload profile image', e);
      Alert.alert('Error', e?.message || 'Failed to update profile photo. Please try again.');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPassword.trim() || !newPassword.trim()) {
      Alert.alert('Validation', 'Please fill in both old and new password.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await authService.updatePassword({
        oldPassword: oldPassword.trim(),
        newPassword: newPassword.trim(),
      });
      Alert.alert('Success', 'Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
    } catch (e: any) {
      console.error('Failed to update password', e);
      Alert.alert('Error', e?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const getOnboardingLabel = () => {
    if (!onboarding) return 'Loading…';
    if (onboarding.onboardingCompleted) {
      const status = profile?.isVerified ?? (user as any)?.isVerified ?? '';
      if (status === 'approved') return 'Approved';
      if (status === 'applied') return 'Applied';
      return 'Onboarding complete';
    }
    if (!onboarding.profileCompleted) return 'Complete personal profile';
    if (!onboarding.institutionCompleted) return 'Complete institution details';
    if (!onboarding.bankCompleted) return 'Add bank details';
    return 'In progress';
  };

  const getOnboardingStatusColor = () => {
    if (!onboarding) return Colors.textSecondary;
    if (onboarding.onboardingCompleted) {
      const status = profile?.isVerified ?? (user as any)?.isVerified ?? '';
      if (status === 'approved') return Colors.success;
      if (status === 'applied') return Colors.warning;
      return Colors.success;
    }
    return Colors.warning;
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const toggleSection = (key: SectionKey) => {
    setExpandedSection((prev) => (prev === key ? null : key));
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      </View>
    );
  }

  if (showOnboarding) {
    return (
      <View style={styles.container}>
        <VendorOnboardingStepper
          initialProfile={profile}
          initialOnboardingStatus={onboarding}
          onSendEmailOtp={async (email) => {
            await authService.sendEmailOtp(email);
          }}
          onVerifyEmailOtp={async (email, otp) => {
            await authService.verifyEmailOtp(email, otp);
          }}
          onResendEmailOtp={async (email) => {
            await authService.resendEmailOtp(email);
          }}
          onSendPhoneOtp={async (phone) => {
            await authService.sendPhoneOtp(phone);
          }}
          onVerifyPhoneOtp={async (phone, otp) => {
            await authService.verifyPhoneOtp(phone, otp);
          }}
          onResendPhoneOtp={async (phone) => {
            await authService.resendPhoneOtp(phone);
          }}
          onSavePersonal={async (data) => {
            await authService.updateVendorProfile(data);
          }}
          onSaveInstitution={async (data) => {
            await authService.updateVendorInstitution(data);
          }}
          onSaveBank={async (data) => {
            await authService.updateBankProfile(data);
          }}
          onComplete={handleOnboardingComplete}
        />
      </View>
    );
  }

  const completionSteps = [
    { key: 'photo', label: 'Add Profile Photo', done: !!(localPhotoUri || profile?.profilePicture) },
    { key: 'personal', label: 'Personal Details', done: !!(fullName && phone) },
    { key: 'institution', label: 'Institution Details', done: !!(institutionName || branches?.length) },
    { key: 'bank', label: 'Bank Details', done: !!(bankName && bankAccountNumber) },
  ] as const;
  const completedCount = completionSteps.filter((s) => s.done).length;
  const completionPercent = Math.round((completedCount / completionSteps.length) * 100);

  return (
    <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Header card with profile image and actions */}
          <View style={styles.headerCard}>
            <View style={styles.avatarWrapper}>
              {localPhotoUri || profile?.profilePicture ? (
                <Image
                  source={{ uri: localPhotoUri || (profile?.profilePicture as string) }}
                  style={styles.avatarImage}
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {(profile?.name || user?.name || 'V').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerTextCol}>
              <Text style={styles.headerName} numberOfLines={1}>
                {profile?.name ?? user?.name ?? 'Vendor'}
              </Text>
              <Text style={styles.headerEmail} numberOfLines={1}>
                {profile?.email ?? user?.email}
              </Text>
            </View>

            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.uploadButton} onPress={handlePickPhoto}>
                <Ionicons name="attach-outline" size={20} color={Colors.text} style={styles.uploadButtonIcon} />
                <Text style={styles.uploadButtonText}>Upload New Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.savePhotoButton}
                onPress={handleSavePhoto}
                disabled={isSavingPhoto}
              >
                {isSavingPhoto ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.savePhotoButtonText}>Save Photo</Text>
                )}
              </TouchableOpacity>

              <Text style={styles.photoHelperText}>
                At least 800×800 px recommended. JPG, PNG, or GIF max 1MB.
              </Text>
            </View>

            <View style={styles.statusRow}>
              <View style={[styles.statusPill, { backgroundColor: getOnboardingStatusColor() + '22' }]}>
                <Ionicons
                  name={onboarding?.onboardingCompleted ? 'checkmark-circle' : 'time-outline'}
                  size={16}
                  color={getOnboardingStatusColor()}
                />
                <Text style={[styles.statusText, { color: getOnboardingStatusColor() }]}>{getOnboardingLabel()}</Text>
              </View>
            </View>
          </View>

          {/* Completion card */}
          <View style={styles.completionCard}>
            <Text style={styles.completionTitle}>Complete Your Profile</Text>
            <View style={styles.completionRow}>
              <View style={styles.progressCircleOuter}>
                <View style={styles.progressCircleInner}>
                  <Text style={styles.progressText}>{completionPercent}%</Text>
                </View>
              </View>
              <View style={styles.completionList}>
                {completionSteps.map((step) => (
                  <View key={step.key} style={styles.completionItem}>
                    <Ionicons
                      name={step.done ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={step.done ? Colors.primary : Colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.completionText,
                        step.done ? styles.completionTextDone : styles.completionTextPending,
                      ]}
                    >
                      {step.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Personal Details */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRow}
              activeOpacity={0.8}
              onPress={() => toggleSection('personal')}
            >
              <View style={styles.cardHeaderContent}>
                <View style={styles.cardIconPill}>
                  <Ionicons name="person-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Personal Details</Text>
              </View>
              <Ionicons
                name={expandedSection === 'personal' ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'personal' && (
              <>
                <View style={styles.spacer} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Full Name"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.input, styles.readonlyInput]}>
                <Text style={styles.readonlyText}>{email || user?.email}</Text>
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98000 98000"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>

            {/* Gender */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Gender</Text>
              <View style={styles.genderRow}>
                {(['male', 'female', 'other'] as Gender[]).map((option) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.genderChip,
                      gender === option && styles.genderChipActive,
                    ]}
                    onPress={() => setGender(option)}
                  >
                    <Text
                      style={[
                        styles.genderChipText,
                        gender === option && styles.genderChipTextActive,
                      ]}
                    >
                      {option.charAt(0).toUpperCase() + option.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Pincode</Text>
                <TextInput
                  style={styles.input}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="123456"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Date of Birth</Text>
                <TextInput
                  style={styles.input}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Qualification</Text>
                <TextInput
                  style={styles.input}
                  value={qualification}
                  onChangeText={setQualification}
                  placeholder="e.g. M.Ed"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Experience</Text>
                <TextInput
                  style={styles.input}
                  value={experience}
                  onChangeText={setExperience}
                  placeholder="e.g. 5 years"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Aadhar Number</Text>
                <TextInput
                  style={styles.input}
                  value={aadharNumber}
                  onChangeText={setAadharNumber}
                  placeholder="XXXX-XXXX-XXXX"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>PAN Number</Text>
                <TextInput
                  style={styles.input}
                  value={panNumber}
                  onChangeText={setPanNumber}
                  placeholder="ABCDE1234F"
                  placeholderTextColor={Colors.textSecondary}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Achievements</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={achievements}
                onChangeText={setAchievements}
                placeholder="Awards, recognition, key milestones…"
                placeholderTextColor={Colors.textSecondary}
                multiline
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
              </>
            )}
          </View>

          {/* Institution Details */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRow}
              activeOpacity={0.8}
              onPress={() => toggleSection('institution')}
            >
              <View style={styles.cardHeaderContent}>
                <View style={styles.cardIconPill}>
                  <Ionicons name="business-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Institution Details</Text>
              </View>
              <Ionicons
                name={expandedSection === 'institution' ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'institution' && (
              <>
                <View style={styles.spacer} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Institution Name</Text>
              <TextInput
                style={styles.input}
                value={institutionName}
                onChangeText={setInstitutionName}
                placeholder="Your institute / academy name"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Institution Phone</Text>
                <TextInput
                  style={styles.input}
                  value={institutionPhone}
                  onChangeText={setInstitutionPhone}
                  placeholder="+91 98000 98000"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Institution Email</Text>
                <TextInput
                  style={styles.input}
                  value={institutionEmail}
                  onChangeText={setInstitutionEmail}
                  placeholder="Contact email"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Branches header + add button */}
            <View style={styles.branchesHeader}>
              <Text style={styles.branchesTitle}>Branches</Text>
              <TouchableOpacity style={styles.addBranchButton} onPress={handleAddBranch}>
                <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                <Text style={styles.addBranchText}>Add branch</Text>
              </TouchableOpacity>
            </View>

            {branches.length === 0 ? (
              <Text style={styles.branchesEmptyText}>No branches added yet.</Text>
            ) : (
              branches.map((branch, index) => (
                <View key={branch.id ?? index} style={styles.branchCard}>
                  <View style={styles.branchHeaderRow}>
                    <Text style={styles.branchTitle}>Branch {index + 1}</Text>
                    <TouchableOpacity style={styles.removeBranchButton} onPress={() => handleRemoveBranch(index)}>
                      <Ionicons name="trash-outline" size={18} color={Colors.error} />
                      <Text style={styles.removeBranchText}>Remove</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Branch Name</Text>
                    <TextInput
                      style={styles.input}
                      value={branch.branchName}
                      onChangeText={(text) => updateBranchField(index, 'branchName', text)}
                      placeholder="e.g. Main branch"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Branch Address</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={branch.branchAddress}
                      onChangeText={(text) => updateBranchField(index, 'branchAddress', text)}
                      placeholder="Address"
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Branch Pincode</Text>
                    <TextInput
                      style={styles.input}
                      value={branch.branchPincode}
                      onChangeText={(text) => updateBranchField(index, 'branchPincode', text)}
                      placeholder="123456"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="number-pad"
                    />
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity
              style={[styles.saveButton, isSavingInstitution && styles.saveButtonDisabled]}
              onPress={handleSaveInstitution}
              disabled={isSavingInstitution}
            >
              {isSavingInstitution ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
              </>
            )}
          </View>

          {/* Bank Details */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRow}
              activeOpacity={0.8}
              onPress={() => toggleSection('bank')}
            >
              <View style={styles.cardHeaderContent}>
                <View style={styles.cardIconPill}>
                  <Ionicons name="card-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Bank Details</Text>
              </View>
              <Ionicons
                name={expandedSection === 'bank' ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'bank' && (
              <>
                <View style={styles.spacer} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank name"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                value={bankAccountHolderName}
                onChangeText={setBankAccountHolderName}
                placeholder="Account holder name"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                placeholder="Account number"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                value={bankIfscCode}
                onChangeText={setBankIfscCode}
                placeholder="SBIN0001234"
                placeholderTextColor={Colors.textSecondary}
                autoCapitalize="characters"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSavingBank && styles.saveButtonDisabled]}
              onPress={handleSaveBank}
              disabled={isSavingBank}
            >
              {isSavingBank ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
              </>
            )}
          </View>

          {/* Security */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRow}
              activeOpacity={0.8}
              onPress={() => toggleSection('password')}
            >
              <View style={styles.cardHeaderContent}>
                <View style={styles.cardIconPill}>
                  <Ionicons name="lock-closed-outline" size={18} color={Colors.primary} />
                </View>
                <Text style={styles.cardTitle}>Security</Text>
              </View>
              <Ionicons
                name={expandedSection === 'password' ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'password' && (
              <>
                <View style={styles.spacer} />
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Old Password</Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Old Password"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New Password"
                placeholderTextColor={Colors.textSecondary}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isSavingPassword && styles.saveButtonDisabled]}
              onPress={handleChangePassword}
              disabled={isSavingPassword}
            >
              {isSavingPassword ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
              </>
            )}
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.error,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  headerCard: {
    backgroundColor: '#FFF',
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarFallbackText: {
    fontSize: 20,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  headerTextCol: {
    alignItems: 'center',
    marginTop: 12,
  },
  headerName: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    marginBottom: 2,
  },
  headerEmail: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.textSecondary,
  },
  photoActions: {
    marginTop: 12,
    width: '100%',
    alignItems: 'stretch',
  },
  uploadButtonIcon: {},
  uploadButton: {
    width: '50%',
    alignSelf: 'center',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.backgroundSecondary,
    marginBottom: 8,
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
  },
  savePhotoButton: {
    width: '50%',
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    marginBottom: 6,
  },
  savePhotoButtonText: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: '#FFF',
  },
  photoHelperText: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  statusRow: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
  },
  completionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'column',
    gap: 12,
  },
  completionTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
    textAlign: 'left',
  },
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  progressCircleOuter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 6,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressCircleInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ECFEFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.primary,
  },
  progressText: {
    fontSize: 10,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.primary,
  },
  completionList: {
    flex: 1,
    gap: 4,
  },
  completionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completionText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
  },
  completionTextDone: {
    color: Colors.text,
    fontFamily: Typography.fontFamily.medium,
  },
  completionTextPending: {
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.medium,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardIconPill: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: {
    marginBottom: 8,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.backgroundSecondary,
  },
  readonlyInput: {
    justifyContent: 'center',
  },
  readonlyText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  rowItem: {
    flex: 1,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
  },
  genderChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  genderChipActive: {
    borderColor: Colors.primary,
    backgroundColor: '#ECFEFF',
  },
  genderChipText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  genderChipTextActive: {
    color: Colors.primary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: Typography.fontFamily.medium,
  },
  branchesHeader: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchesTitle: {
    fontSize: 15,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  addBranchButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBranchText: {
    marginLeft: 4,
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.primary,
  },
  branchesEmptyText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  branchCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 4,
    backgroundColor: '#F9FAFB',
  },
  branchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  branchTitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
  },
  removeBranchButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeBranchText: {
    marginLeft: 4,
    fontSize: 12,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.error,
  },
  logoutButton: {
    marginTop: 8,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logoutButtonText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.error,
  },
});

