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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { authService } from '@/services/auth.service';
import type { VendorProfile, VendorOnboardingStatus, Gender, Branch } from '@/types/auth';

type SectionKey = 'personal' | 'institution' | 'bank' | null;

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

  const [expandedSection, setExpandedSection] = useState<SectionKey>('personal');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileRes, onboardingRes] = await Promise.all([
        authService.getUserProfile(),
        authService.getVendorOnboardingStatus(),
      ]);

      const vendor = profileRes.data;
      setProfile(vendor);
      setOnboarding(onboardingRes.data);

      setFullName(vendor.name ?? '');
      setEmail(vendor.email ?? '');
      setPhone(vendor.phone ?? '');
      setGender((vendor.gender as Gender) ?? '');
      setAddress(vendor.address ?? '');
      setPincode(vendor.pincode ?? '');
      // Backend uses "dob" field name
      setDateOfBirth(vendor.dob ?? '');
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerCard}>
        <View style={styles.headerTopRow}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={48} color={Colors.primary} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.name}>{profile?.name ?? user?.name}</Text>
            <Text style={styles.email}>{profile?.email ?? user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>{user?.role}</Text>
            </View>
          </View>
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

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.loadingText}>Loading profile…</Text>
        </View>
      ) : null}

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

      <View style={styles.footerActions}>
        <TouchableOpacity style={styles.footerButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.footerButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingTop: 32,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerInfo: {
    flex: 1,
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
    alignSelf: 'flex-start',
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
    justifyContent: 'flex-start',
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
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  institutionCard: {
    marginTop: 16,
  },
  bankCard: {
    marginTop: 16,
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
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.inputBackground,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: Colors.textSecondary,
  },
  multilineInput: {
    minHeight: 68,
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
    backgroundColor: '#FFFFFF',
  },
  genderChipActive: {
    backgroundColor: '#DBEAFE',
    borderColor: Colors.primary,
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
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 16,
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
    marginTop: 16,
    alignItems: 'flex-start',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  footerButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },
});

