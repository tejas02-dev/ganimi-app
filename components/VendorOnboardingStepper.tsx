import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import type { VendorProfile, Gender } from '@/types/auth';
import type {
  UpdateVendorProfilePayload,
  UpdateVendorInstitutionPayload,
  UpdateBankProfilePayload,
} from '@/services/auth.service';
import type { VendorOnboardingStatus } from '@/types/auth';

const STEPS = [
  { key: 'email', title: 'Email', icon: 'mail-outline' as const },
  { key: 'phone', title: 'Phone', icon: 'call-outline' as const },
  { key: 'personal', title: 'Personal details', icon: 'person-outline' as const },
  { key: 'institution', title: 'Institution details', icon: 'business-outline' as const },
  { key: 'bank', title: 'Bank details', icon: 'card-outline' as const },
];

function getInitialStepFromOnboarding(status: VendorOnboardingStatus | null): number {
  if (!status) return 0;
  if (!status.emailVerified) return 0;
  if (!status.phoneVerified) return 1;
  if (!status.profileCompleted) return 2;
  if (!status.institutionCompleted) return 3;
  if (!status.bankCompleted) return 4;
  return 0;
}

export interface VendorOnboardingStepperProps {
  initialProfile: VendorProfile | null;
  initialOnboardingStatus: VendorOnboardingStatus | null;
  onSendEmailOtp: (email: string) => Promise<void>;
  onVerifyEmailOtp: (email: string, otp: string) => Promise<void>;
  onResendEmailOtp: (email: string) => Promise<void>;
  onSendPhoneOtp: (phone: string) => Promise<void>;
  onVerifyPhoneOtp: (phone: string, otp: string) => Promise<void>;
  onResendPhoneOtp: (phone: string) => Promise<void>;
  onSavePersonal: (data: UpdateVendorProfilePayload) => Promise<void>;
  onSaveInstitution: (data: UpdateVendorInstitutionPayload) => Promise<void>;
  onSaveBank: (data: UpdateBankProfilePayload) => Promise<void>;
  onComplete: () => Promise<void>;
}

export function VendorOnboardingStepper({
  initialProfile,
  initialOnboardingStatus,
  onSendEmailOtp,
  onVerifyEmailOtp,
  onResendEmailOtp,
  onSendPhoneOtp,
  onVerifyPhoneOtp,
  onResendPhoneOtp,
  onSavePersonal,
  onSaveInstitution,
  onSaveBank,
  onComplete,
}: VendorOnboardingStepperProps) {
  const [step, setStep] = useState(() =>
    getInitialStepFromOnboarding(initialOnboardingStatus)
  );
  const [saving, setSaving] = useState(false);

  // Email OTP state
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [sendingEmailOtp, setSendingEmailOtp] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);

  // Phone OTP state
  const [phoneCodeSent, setPhoneCodeSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [sendingPhoneOtp, setSendingPhoneOtp] = useState(false);
  const [verifyingPhone, setVerifyingPhone] = useState(false);

  // Personal
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

  // Institution
  const [institutionName, setInstitutionName] = useState('');
  const [institutionPhone, setInstitutionPhone] = useState('');
  const [institutionEmail, setInstitutionEmail] = useState('');

  // Bank
  const [bankName, setBankName] = useState('');
  const [bankAccountHolderName, setBankAccountHolderName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfscCode, setBankIfscCode] = useState('');

  useEffect(() => {
    if (!initialProfile) return;
    setFullName(initialProfile.name ?? '');
    setEmail(initialProfile.email ?? '');
    setPhone(initialProfile.phone ?? '');
    setGender((initialProfile.gender as Gender) ?? '');
    setAddress(initialProfile.address ?? '');
    setPincode(initialProfile.pincode ?? '');
    setDateOfBirth((initialProfile as any).dateOfBirth ?? initialProfile.dob ?? '');
    setQualification(initialProfile.qualification ?? '');
    setExperience(initialProfile.experience ?? '');
    setAadharNumber(initialProfile.aadharNumber ?? '');
    setPanNumber(initialProfile.panNumber ?? '');
    setAchievements(initialProfile.achievements ?? '');
    setInstitutionName(initialProfile.businessName ?? '');
    setInstitutionPhone(initialProfile.businessPhone ?? '');
    setInstitutionEmail(initialProfile.businessEmail ?? '');
    setBankName(initialProfile.bankName ?? '');
    setBankAccountHolderName(initialProfile.bankAccountHolderName ?? '');
    setBankAccountNumber(initialProfile.bankAccountNumber ?? '');
    setBankIfscCode(initialProfile.bankIfscCode ?? '');
  }, [initialProfile]);

  const handleRequestEmailCode = async () => {
    if (!email.trim()) return;
    setSendingEmailOtp(true);
    try {
      await onSendEmailOtp(email.trim());
      setEmailCodeSent(true);
      setEmailOtp('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send verification code.');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleResendEmailCode = async () => {
    if (!email.trim()) return;
    setSendingEmailOtp(true);
    try {
      await onResendEmailOtp(email.trim());
      setEmailOtp('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to resend code.');
    } finally {
      setSendingEmailOtp(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailOtp.trim()) {
      Alert.alert('Validation', 'Please enter the verification code.');
      return;
    }
    setVerifyingEmail(true);
    try {
      await onVerifyEmailOtp(email.trim(), emailOtp.trim());
      setStep(1);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setVerifyingEmail(false);
    }
  };

  const handleRequestPhoneCode = async () => {
    if (!phone.trim()) {
      Alert.alert('Validation', 'Please enter your phone number.');
      return;
    }
    setSendingPhoneOtp(true);
    try {
      await onSendPhoneOtp(phone.trim());
      setPhoneCodeSent(true);
      setPhoneOtp('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to send verification code.');
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleResendPhoneCode = async () => {
    if (!phone.trim()) return;
    setSendingPhoneOtp(true);
    try {
      await onResendPhoneOtp(phone.trim());
      setPhoneOtp('');
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to resend code.');
    } finally {
      setSendingPhoneOtp(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phone.trim()) {
      Alert.alert('Validation', 'Please enter your phone number.');
      return;
    }
    if (!phoneOtp.trim()) {
      Alert.alert('Validation', 'Please enter the verification code.');
      return;
    }
    setVerifyingPhone(true);
    try {
      await onVerifyPhoneOtp(phone.trim(), phoneOtp.trim());
      setStep(2);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Invalid or expired code. Please try again.');
    } finally {
      setVerifyingPhone(false);
    }
  };

  const handleNextPersonal = async () => {
    if (!gender) {
      Alert.alert('Validation', 'Please select a gender.');
      return;
    }
    setSaving(true);
    try {
      await onSavePersonal({
        name: fullName.trim(),
        phone: phone.trim(),
        gender,
        address: address.trim() || undefined,
        pincode: pincode.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
        qualification: qualification.trim() || undefined,
        experience: experience.trim() || undefined,
        aadharNumber: aadharNumber.trim() || undefined,
        panNumber: panNumber.trim() || undefined,
        achievements: achievements.trim() || undefined,
      });
      setStep(3);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleNextInstitution = async () => {
    if (!institutionName.trim()) {
      Alert.alert('Validation', 'Institution name is required.');
      return;
    }
    setSaving(true);
    try {
      await onSaveInstitution({
        institutionName: institutionName.trim(),
        institutionPhone: institutionPhone.trim(),
        institutionEmail: institutionEmail.trim(),
      });
      setStep(4);
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteBank = async () => {
    if (
      !bankName.trim() ||
      !bankAccountHolderName.trim() ||
      !bankAccountNumber.trim() ||
      !bankIfscCode.trim()
    ) {
      Alert.alert('Validation', 'Please fill in all bank details.');
      return;
    }
    setSaving(true);
    try {
      await onSaveBank({
        bankName: bankName.trim(),
        bankAccountHolderName: bankAccountHolderName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfscCode: bankIfscCode.trim(),
      });
      await onComplete();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {STEPS.map((s, i) => (
        <View key={s.key} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              i <= step && styles.stepCircleActive,
              i < step && styles.stepCircleDone,
            ]}
          >
            {i < step ? (
              <Ionicons name="checkmark" size={18} color="#FFF" />
            ) : (
              <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
            )}
          </View>
          {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineDone]} />}
        </View>
      ))}
    </View>
  );

  const renderEmail = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Verify your email</Text>
      <Text style={styles.stepSubtitle}>
        We&apos;ll send a verification code to your registered email.
      </Text>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Email address</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={email}
          editable={false}
          placeholder="Email"
        />
      </View>
      {!emailCodeSent ? (
        <TouchableOpacity
          style={[styles.primaryButton, sendingEmailOtp && styles.primaryButtonDisabled]}
          onPress={handleRequestEmailCode}
          disabled={sendingEmailOtp}
        >
          {sendingEmailOtp ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Request code</Text>
          )}
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Enter verification code</Text>
            <TextInput
              style={styles.input}
              value={emailOtp}
              onChangeText={setEmailOtp}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, sendingEmailOtp && styles.primaryButtonDisabled]}
              onPress={handleResendEmailCode}
              disabled={sendingEmailOtp}
            >
              {sendingEmailOtp ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Resend</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, verifyingEmail && styles.primaryButtonDisabled]}
              onPress={handleVerifyEmail}
              disabled={verifyingEmail}
            >
              {verifyingEmail ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );

  const renderPhone = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Verify your phone</Text>
      <Text style={styles.stepSubtitle}>
        We&apos;ll send a verification code to your phone number.
      </Text>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Phone number *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          keyboardType="phone-pad"
        />
      </View>
      {!phoneCodeSent ? (
        <TouchableOpacity
          style={[styles.primaryButton, sendingPhoneOtp && styles.primaryButtonDisabled]}
          onPress={handleRequestPhoneCode}
          disabled={sendingPhoneOtp}
        >
          {sendingPhoneOtp ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Request code</Text>
          )}
        </TouchableOpacity>
      ) : (
        <>
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Enter verification code</Text>
            <TextInput
              style={styles.input}
              value={phoneOtp}
              onChangeText={setPhoneOtp}
              placeholder="Enter 6-digit code"
              keyboardType="number-pad"
              maxLength={6}
            />
          </View>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, sendingPhoneOtp && styles.primaryButtonDisabled]}
              onPress={handleResendPhoneCode}
              disabled={sendingPhoneOtp}
            >
              {sendingPhoneOtp ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Resend</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, verifyingPhone && styles.primaryButtonDisabled]}
              onPress={handleVerifyPhone}
              disabled={verifyingPhone}
            >
              {verifyingPhone ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
      <TouchableOpacity style={styles.backLink} onPress={() => setStep(0)}>
        <Ionicons name="arrow-back" size={16} color={Colors.primary} />
        <Text style={styles.backLinkText}>Back to email</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPersonal = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Personal information</Text>
      <Text style={styles.stepSubtitle}>Tell us about yourself.</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Full name</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={fullName}
          editable={false}
          placeholder="Full name"
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Email</Text>
        <TextInput
          style={[styles.input, styles.inputDisabled]}
          value={email}
          editable={false}
          placeholder="Email"
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Phone *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Phone number"
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Gender *</Text>
        <View style={styles.genderRow}>
          {(['male', 'female', 'other'] as Gender[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[styles.genderChip, gender === opt && styles.genderChipActive]}
              onPress={() => setGender(opt)}
            >
              <Text style={[styles.genderChipText, gender === opt && styles.genderChipTextActive]}>
                {opt.charAt(0).toUpperCase() + opt.slice(1)}
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
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Achievements</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={achievements}
          onChangeText={setAchievements}
          placeholder="Awards, recognition…"
          multiline
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(1)}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          onPress={handleNextPersonal}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Next</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderInstitution = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Institution details</Text>
      <Text style={styles.stepSubtitle}>Your academy or institute information.</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Institution name *</Text>
        <TextInput
          style={styles.input}
          value={institutionName}
          onChangeText={setInstitutionName}
          placeholder="Your institute / academy name"
        />
      </View>
      <View style={styles.row}>
        <View style={styles.rowItem}>
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={institutionPhone}
            onChangeText={setInstitutionPhone}
            placeholder="Contact phone"
            keyboardType="phone-pad"
          />
        </View>
        <View style={styles.rowItem}>
          <Text style={styles.fieldLabel}>Email</Text>
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

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(2)}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.primaryButtonDisabled]}
          onPress={handleNextInstitution}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.primaryButtonText}>Next</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBank = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Bank details</Text>
      <Text style={styles.stepSubtitle}>For payouts and verification.</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Bank name *</Text>
        <TextInput
          style={styles.input}
          value={bankName}
          onChangeText={setBankName}
          placeholder="Bank name"
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Account holder name *</Text>
        <TextInput
          style={styles.input}
          value={bankAccountHolderName}
          onChangeText={setBankAccountHolderName}
          placeholder="Account holder name"
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Account number *</Text>
        <TextInput
          style={styles.input}
          value={bankAccountNumber}
          onChangeText={setBankAccountNumber}
          placeholder="Account number"
          keyboardType="number-pad"
        />
      </View>
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>IFSC code *</Text>
        <TextInput
          style={styles.input}
          value={bankIfscCode}
          onChangeText={setBankIfscCode}
          placeholder="SBIN0001234"
          autoCapitalize="characters"
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setStep(3)}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, styles.completeButton, saving && styles.primaryButtonDisabled]}
          onPress={handleCompleteBank}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Complete</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {renderStepIndicator()}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 0 && renderEmail()}
          {step === 1 && renderPhone()}
          {step === 2 && renderPersonal()}
          {step === 3 && renderInstitution()}
          {step === 4 && renderBank()}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepCircleDone: {
    backgroundColor: Colors.success,
  },
  stepNum: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
  },
  stepNumActive: {
    color: '#FFF',
  },
  stepLine: {
    width: 24,
    height: 3,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
  },
  stepLineDone: {
    backgroundColor: Colors.primary,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  stepContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
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
    marginBottom: 12,
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
  primaryButton: {
    paddingVertical: 14,
    borderRadius: 999,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  completeButton: {
    flex: 1,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  branchesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addBranchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addBranchText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
  },
  branchesEmpty: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  branchCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  branchHeader: {
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
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  backLinkText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});
