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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/auth.service';
import type { Gender } from '@/types/auth';
type StudentSectionKey = 'personal' | 'guardian' | 'password' | null;
import * as ImagePicker from 'expo-image-picker';

export default function StudentProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [address, setAddress] = useState('');
  const [pincode, setPincode] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [school, setSchool] = useState('');
  const [grade, setGrade] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
  const [localPhotoUri, setLocalPhotoUri] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);
  const [expandedSection, setExpandedSection] = useState<StudentSectionKey>('personal');

  // Guardian / parents info
  const [fatherName, setFatherName] = useState('');
  const [fatherEmail, setFatherEmail] = useState('');
  const [fatherPhone, setFatherPhone] = useState('');
  const [fatherOccupation, setFatherOccupation] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherEmail, setMotherEmail] = useState('');
  const [motherPhone, setMotherPhone] = useState('');
  const [motherOccupation, setMotherOccupation] = useState('');

  // Onboarding/completion flags from profile
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);
  const [isPersonalInfoComplete, setIsPersonalInfoComplete] = useState<boolean | null>(null);
  const [isGuardianInfoComplete, setIsGuardianInfoComplete] = useState<boolean | null>(null);
  const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);

  // Change password
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profileRes = await authService.getStudentProfile();
      const data: any = profileRes.data;

      setFullName(data.name ?? user?.name ?? '');
      setNickname(data.nickname ?? '');
      setEmail(data.email ?? user?.email ?? '');
      setPhone(data.phone ?? '');
      setGender((data.gender as Gender) ?? '');
      setAddress(data.address ?? '');
      setPincode(data.pincode ?? '');
      setDateOfBirth(data.dateOfBirth ?? data.dob ?? '');
      setSchool(data.school ?? '');
      setGrade(data.grade ?? '');
      setProfilePicture(data.profilePicture);

      // Guardian info defaults
      setFatherName(data.fatherName ?? '');
      setFatherEmail(data.fatherEmail ?? '');
      setFatherPhone(data.fatherPhone ?? '');
      setFatherOccupation(data.fatherOccupation ?? '');
      setMotherName(data.motherName ?? '');
      setMotherEmail(data.motherEmail ?? '');
      setMotherPhone(data.motherPhone ?? '');
      setMotherOccupation(data.motherOccupation ?? '');

      // Completion flags
      setIsEmailVerified(!!data.isEmailVerified);
      setIsPersonalInfoComplete(!!data.isPersonalInfoComplete);
      setIsGuardianInfoComplete(!!data.isGuardianInfoComplete);
      setIsProfileComplete(!!data.isProfileComplete);
    } catch (e: any) {
      console.error('Failed to load student profile', e);
      setError(e?.message || 'Unable to load profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!phone.trim()) {
      Alert.alert('Validation', 'Phone is required.');
      return;
    }

    setIsSaving(true);
    try {
      await authService.updateStudentProfile({
        name: fullName,
        phone,
        gender,
        address,
        pincode,
        dateOfBirth,
        school,
        grade,
        nickname,
      });
      Alert.alert('Success', 'Profile updated successfully.');
      await loadProfile();
    } catch (e: any) {
      console.error('Failed to update student profile', e);
      Alert.alert('Error', e?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos to upload a profile picture.');
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
    setLocalPhotoUri(asset.uri);
    setProfilePicture(asset.uri);
  };

  const handleSavePhoto = async () => {
    if (!localPhotoUri) {
      Alert.alert('No photo selected', 'Please upload a new photo first.');
      return;
    }

    try {
      setIsSavingPhoto(true);

      // Basic mime type inference from extension
      let mimeType = 'image/jpeg';
      let filename = 'profile.jpg';
      if (localPhotoUri.includes('.png')) {
        mimeType = 'image/png';
        filename = 'profile.png';
      } else if (localPhotoUri.includes('.gif')) {
        mimeType = 'image/gif';
        filename = 'profile.gif';
      }

      const response = await authService.uploadProfileImage(localPhotoUri, mimeType, filename);
      if (response.profilePicture) {
        setProfilePicture(response.profilePicture);
        setLocalPhotoUri(null);
      }

      Alert.alert('Success', 'Profile photo updated successfully.');
    } catch (e: any) {
      console.error('Failed to upload profile image', e);
      Alert.alert('Error', e?.message || 'Failed to upload photo. Please try again.');
    } finally {
      setIsSavingPhoto(false);
    }
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

  // Derived completion steps
  const completionSteps = [
    {
      key: 'photo',
      label: 'Add Profile Photo',
      done: !!profilePicture,
    },
    {
      key: 'email',
      label: 'Verify Email',
      done: !!isEmailVerified,
    },
    {
      key: 'personal',
      label: 'Fill Personal Details',
      done: !!isPersonalInfoComplete,
    },
    {
      key: 'guardian',
      label: 'Guardian Info',
      done: !!isGuardianInfoComplete,
    },
  ] as const;

  const completedCount = completionSteps.filter((s) => s.done).length;
  const completionPercent = Math.round((completedCount / completionSteps.length) * 100);

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header card with profile image and actions */}
          <View style={styles.headerCard}>
            <View style={styles.avatarWrapper}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>
                    {fullName?.charAt(0)?.toUpperCase() || user?.name?.charAt(0)?.toUpperCase() || 'S'}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.headerTextCol}>
              <Text style={styles.headerName} numberOfLines={1}>
                {fullName || user?.name || 'Student'}
              </Text>
              <Text style={styles.headerEmail} numberOfLines={1}>
                {email || user?.email}
              </Text>
            </View>

            <View style={styles.photoActions}>
              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handlePickPhoto}
              >
                <Ionicons name="attach-outline" size={16} color={Colors.text} />
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
          </View>

          

          {/* Completion / onboarding status */}
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

          {/* Personal information form (collapsible) */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRow}
              activeOpacity={0.8}
              onPress={() => setExpandedSection(expandedSection === 'personal' ? null : 'personal')}
            >
              <View style={styles.cardHeaderContent}>
                <Text style={styles.cardTitle}>Personal Information</Text>
                <Text style={styles.cardSubtitle}>
                  Update your basic details used across the app.
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'personal' ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'personal' && (
              <>
                <View style={styles.spacer}></View>
            {/* Full Name */}
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

            {/* Nickname */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nickname</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Nickname"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            {/* Email (read-only) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <View style={[styles.input, styles.readonlyInput]}>
                <Text style={styles.readonlyText}>{email || user?.email}</Text>
              </View>
            </View>

            {/* Phone */}
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

            {/* Gender chips */}
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

            {/* Address */}
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

            {/* Pincode */}
            <View style={styles.fieldGroup}>
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

            {/* Date of Birth */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              <TextInput
                style={styles.input}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

            {/* School */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>School</Text>
              <TextInput
                style={styles.input}
                value={school}
                onChangeText={setSchool}
                placeholder="School"
                placeholderTextColor={Colors.textSecondary}
              />
            </View>

                {/* Class / Grade */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Class</Text>
                  <TextInput
                    style={styles.input}
                    value={grade}
                    onChangeText={setGrade}
                    placeholder="Class"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                {/* Save button */}
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

          {/* Parents / Guardian information form (collapsible) */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRow}
              activeOpacity={0.8}
              onPress={() => setExpandedSection(expandedSection === 'guardian' ? null : 'guardian')}
            >
              <View style={styles.cardHeaderContent}>
                <Text style={styles.cardTitle}>Parents/Guardian Information</Text>
                <Text style={styles.cardSubtitle}>
                  Keep your guardian details up to date for communication.
                </Text>
              </View>
              <Ionicons
                name={expandedSection === 'guardian' ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'guardian' && (
              <>
                <View style={styles.spacer}></View>
                {/* Father details */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Father&apos;s Name</Text>
                  <TextInput
                    style={styles.input}
                    value={fatherName}
                    onChangeText={setFatherName}
                    placeholder="First Name"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Father&apos;s Email</Text>
                  <TextInput
                    style={styles.input}
                    value={fatherEmail}
                    onChangeText={setFatherEmail}
                    placeholder="abc@gmail.com"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Father&apos;s Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={fatherPhone}
                    onChangeText={setFatherPhone}
                    placeholder="+91 98000 98000"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Father&apos;s Occupation</Text>
                  <TextInput
                    style={styles.input}
                    value={fatherOccupation}
                    onChangeText={setFatherOccupation}
                    placeholder="Occupation"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                {/* Mother details */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mother&apos;s Name</Text>
                  <TextInput
                    style={styles.input}
                    value={motherName}
                    onChangeText={setMotherName}
                    placeholder="First Name"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mother&apos;s Email</Text>
                  <TextInput
                    style={styles.input}
                    value={motherEmail}
                    onChangeText={setMotherEmail}
                    placeholder="abc@gmail.com"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mother&apos;s Phone</Text>
                  <TextInput
                    style={styles.input}
                    value={motherPhone}
                    onChangeText={setMotherPhone}
                    placeholder="+91 98000 98000"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mother&apos;s Occupation</Text>
                  <TextInput
                    style={styles.input}
                    value={motherOccupation}
                    onChangeText={setMotherOccupation}
                    placeholder="Occupation"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>

                <TouchableOpacity
                  style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                  onPress={async () => {
                    try {
                      setIsSaving(true);
                      await authService.updateGuardianProfile({
                        fatherName,
                        fatherEmail,
                        fatherPhone,
                        fatherOccupation,
                        motherName,
                        motherEmail,
                        motherPhone,
                        motherOccupation,
                      });
                      Alert.alert('Success', 'Guardian information updated successfully.');
                    } catch (e: any) {
                      console.error('Failed to update guardian profile', e);
                      Alert.alert(
                        'Error',
                        e?.message || 'Failed to update guardian information. Please try again.'
                      );
                    } finally {
                      setIsSaving(false);
                    }
                  }}
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

            {/* Change password (collapsible) */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeaderRow}
              activeOpacity={0.8}
              onPress={() => setExpandedSection(expandedSection === 'password' ? null : 'password')}
            >
              <View style={styles.cardHeaderContent}>
                <Text style={styles.cardTitle}>Change Password</Text>
                <Text style={styles.cardSubtitle}>
                  Update your account password to keep your account secure.
                </Text>
              </View>
              <Ionicons
                style={styles.cardHeaderIcon}
                name={expandedSection === 'password' ? 'chevron-up-outline' : 'chevron-down-outline'}
                size={18}
                color={Colors.textSecondary}
              />
            </TouchableOpacity>

            {expandedSection === 'password' && (
              <>
                <View style={styles.spacer}></View>
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

          {/* Logout */}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
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
    color: Colors.textSecondary,
  },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
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
    fontWeight: '700',
    color: Colors.primary,
  },
  headerTextCol: {
    alignItems: 'center',
    marginTop: 12,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  headerEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  photoActions: {
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
    gap: 6,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  savePhotoButton: {
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    marginBottom: 6,
  },
  savePhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  photoHelperText: {
    fontSize: 11,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  completionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'column',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  completionTitle: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 16,
    fontWeight: '700',
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
  },
  completionTextDone: {
    color: Colors.text,
    textDecorationLine: 'none',
  },
  completionTextPending: {
    color: Colors.textSecondary,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  cardSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderContent: {
    maxWidth: '95%',
    flex: 2,
  },
  cardHeaderIcon: {
  },
  spacer: {
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: '#F9FAFB',
  },
  readonlyInput: {
    justifyContent: 'center',
  },
  readonlyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
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
    color: Colors.textSecondary,
  },
  genderChipTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  saveButton: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 999,
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
    fontWeight: '600',
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
    fontWeight: '500',
    color: Colors.error,
  },
});

