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
import type { VendorProfile, VendorOnboardingStatus, Gender, Branch } from '@/types/auth';
import * as ImagePicker from 'expo-image-picker';
import { apiService } from '@/services/api';

type SectionKey = 'personal' | 'institution' | 'bank' | 'password' | null;

export default function VendorProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [onboarding, setOnboarding] = useState<VendorOnboardingStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, onboardingRes] = await Promise.all([
        apiService.get<{ status: string; message: string; data: VendorProfile }>('/auth/user'),
        authService.getVendorOnboardingStatus(),
      ]);

      console.log('[VendorProfile] /auth/user response', profileRes);
      const vendor = profileRes.data;

      if (__DEV__) {
        console.log('[VendorProfile] /auth/user response', { vendor });
      }

      if (!vendor) {
        throw new Error('Vendor profile data not found in /auth/user response.');
      }

      applyVendorToState(vendor);
      setLocalPhotoUri(null);
      setOnboarding(onboardingRes.data);
    } catch (e: any) {
      console.error('Failed to load vendor profile', e);
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
    if (onboarding.onboardingCompleted) return 'Onboarding complete';
    if (!onboarding.profileCompleted) return 'Complete personal profile';
    if (!onboarding.institutionCompleted) return 'Complete institution details';
    if (!onboarding.bankCompleted) return 'Add bank details';
    return 'In progress';
  };

  const getOnboardingStatusColor = () => {
    if (!onboarding) return Colors.textSecondary;
    return onboarding.onboardingCompleted ? Colors.success : Colors.warning;
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

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header card with profile image and status */}
          <View style={styles.headerCard}>
            <View style={styles.avatarContainer}>
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
              <Text style={styles.name} numberOfLines={1}>
                {profile?.name ?? user?.name}
              </Text>
              <Text style={styles.email} numberOfLines={1}>
                {profile?.email ?? user?.email}
              </Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{user?.role}</Text>
              </View>
            </View>

            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.uploadButton} onPress={handlePickPhoto}>
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

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* Personal information */}
          <View style={styles.formCard}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('personal')}>
          <Text style={styles.sectionTitle}>Personal information</Text>
          <Ionicons
            name={expandedSection === 'personal' ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSection === 'personal' && (
          <View style={styles.sectionBody}>
            {/* Full Name (read-only) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Full name</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={fullName}
                editable={false}
                placeholder="Full name"
              />
            </View>

            {/* Email (read-only) */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={email}
                editable={false}
                placeholder="Email"
              />
            </View>

            {/* Phone */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Phone number"
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

            {/* Address */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Address</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={address}
                onChangeText={setAddress}
                placeholder="Address"
                multiline
              />
            </View>

            {/* Pincode & DOB */}
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Pincode</Text>
                <TextInput
                  style={styles.input}
                  value={pincode}
                  onChangeText={setPincode}
                  placeholder="Pincode"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Date of birth</Text>
                <TextInput
                  style={styles.input}
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="YYYY-MM-DD"
                />
              </View>
            </View>

            {/* Qualification & Experience */}
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Qualification</Text>
                <TextInput
                  style={styles.input}
                  value={qualification}
                  onChangeText={setQualification}
                  placeholder="e.g. M.Ed"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Experience</Text>
                <TextInput
                  style={styles.input}
                  value={experience}
                  onChangeText={setExperience}
                  placeholder="e.g. 5 years"
                />
              </View>
            </View>

            {/* Aadhar & PAN */}
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Aadhar number</Text>
                <TextInput
                  style={styles.input}
                  value={aadharNumber}
                  onChangeText={setAadharNumber}
                  placeholder="XXXX-XXXX-XXXX"
                  keyboardType="number-pad"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>PAN number</Text>
                <TextInput
                  style={styles.input}
                  value={panNumber}
                  onChangeText={setPanNumber}
                  placeholder="ABCDE1234F"
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Achievements */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Achievements</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={achievements}
                onChangeText={setAchievements}
                placeholder="Awards, recognition, key milestones…"
                multiline
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

          {/* Institution details */}
          <View style={[styles.formCard, styles.institutionCard]}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('institution')}>
          <Text style={styles.sectionTitle}>Institution details</Text>
          <Ionicons
            name={expandedSection === 'institution' ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSection === 'institution' && (
          <View style={styles.sectionBody}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Institution name</Text>
              <TextInput
                style={styles.input}
                value={institutionName}
                onChangeText={setInstitutionName}
                placeholder="Your institute / academy name"
              />
            </View>

            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Institution phone</Text>
                <TextInput
                  style={styles.input}
                  value={institutionPhone}
                  onChangeText={setInstitutionPhone}
                  placeholder="Contact phone"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.rowItem}>
                <Text style={styles.fieldLabel}>Institution email</Text>
                <TextInput
                  style={styles.input}
                  value={institutionEmail}
                  onChangeText={setInstitutionEmail}
                  placeholder="Contact email"
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
                    <Text style={styles.fieldLabel}>Branch name</Text>
                    <TextInput
                      style={styles.input}
                      value={branch.branchName}
                      onChangeText={(text) => updateBranchField(index, 'branchName', text)}
                      placeholder="e.g. Main branch"
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Branch address</Text>
                    <TextInput
                      style={[styles.input, styles.multilineInput]}
                      value={branch.branchAddress}
                      onChangeText={(text) => updateBranchField(index, 'branchAddress', text)}
                      placeholder="Address"
                      multiline
                    />
                  </View>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Branch pincode</Text>
                    <TextInput
                      style={styles.input}
                      value={branch.branchPincode}
                      onChangeText={(text) => updateBranchField(index, 'branchPincode', text)}
                      placeholder="Pincode"
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
                <Text style={styles.saveButtonText}>Save institution details</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

          {/* Bank details */}
          <View style={[styles.formCard, styles.bankCard]}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('bank')}>
          <Text style={styles.sectionTitle}>Bank details</Text>
          <Ionicons
            name={expandedSection === 'bank' ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSection === 'bank' && (
          <View style={styles.sectionBody}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bank name</Text>
              <TextInput
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank name"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Account holder name</Text>
              <TextInput
                style={styles.input}
                value={bankAccountHolderName}
                onChangeText={setBankAccountHolderName}
                placeholder="Account holder name"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Account number</Text>
              <TextInput
                style={styles.input}
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                placeholder="Account number"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>IFSC code</Text>
              <TextInput
                style={styles.input}
                value={bankIfscCode}
                onChangeText={setBankIfscCode}
                placeholder="SBIN0001234"
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
                <Text style={styles.saveButtonText}>Save bank details</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Change password */}
      <View style={[styles.formCard, styles.bankCard]}>
        <TouchableOpacity style={styles.sectionHeader} onPress={() => toggleSection('password')}>
          <Text style={styles.sectionTitle}>Change password</Text>
          <Ionicons
            name={expandedSection === 'password' ? 'chevron-up-outline' : 'chevron-down-outline'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>

        {expandedSection === 'password' && (
          <View style={styles.sectionBody}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Old password</Text>
              <TextInput
                style={styles.input}
                value={oldPassword}
                onChangeText={setOldPassword}
                placeholder="Old password"
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>New password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password"
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
                <Text style={styles.saveButtonText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

          {/* Logout */}
          <View style={styles.footerActions}>
            <TouchableOpacity style={styles.footerButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={20} color={Colors.error} />
              <Text style={styles.footerButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
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
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextCol: {
    alignItems: 'center',
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
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  roleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
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
    fontWeight: '500',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginBottom: 8,
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  institutionCard: {
  },
  bankCard: {
  },
  photoActions: {
    marginTop: 12,
    width: '100%',
    alignItems: 'center',
    gap: 8,
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
  },
  savePhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  sectionBody: {
    marginTop: 8,
  },
  fieldGroup: {
    marginBottom: 12,
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
  inputDisabled: {
    backgroundColor: '#F3F4F6',
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
  branchesHeader: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  branchesTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  addBranchButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addBranchText: {
    marginLeft: 4,
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  branchesEmptyText: {
    fontSize: 13,
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
    fontWeight: '600',
    color: Colors.text,
  },
  removeBranchButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  removeBranchText: {
    marginLeft: 4,
    fontSize: 12,
    color: Colors.error,
  },
  footerActions: {
    marginTop: 8,
    alignItems: 'center',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.error,
  },
});

