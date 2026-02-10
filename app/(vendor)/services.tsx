import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useAuth } from '@/context/AuthContext';
import { serviceService } from '@/services/service.service';
import { VendorService } from '@/types/service';
import { categoryService } from '@/services/category.service';
import { branchService } from '@/services/branch.service';
import type { Category } from '@/types/category';
import type { Branch } from '@/types/auth';

export default function VendorServicesScreen() {
  const router = useRouter();
  const { user, vendorProfile } = useAuth();
  const [services, setServices] = useState<VendorService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add service modal state
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<VendorService | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceDescription, setServiceDescription] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(null);
  const [isLoadingFormMeta, setIsLoadingFormMeta] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [servicePendingDelete, setServicePendingDelete] = useState<VendorService | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    if (!user?.id) {
      setError('User not found');
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const response = await serviceService.getServicesByUserId(user.id);
      setServices(response.data || []);
    } catch (err: any) {
      console.error('Failed to load services:', err);
      setError(err.message || 'Failed to load services');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadServices();
  };

  const handleViewDetails = (service: VendorService) => {
    router.push({
      pathname: '/(vendor)/service/[serviceId]' as any,
      params: { serviceId: service.id },
    });
  };

  const handleEditService = async (service: VendorService) => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setEditingService(service);
    setServiceName(service.name);
    setServiceDescription(service.description ?? '');
    setServicePrice(service.price != null ? String(service.price) : '');

    setIsAddModalVisible(true);

    await loadFormMeta({
      initialCategoryId: service.categoryId ?? vendorProfile?.categoryId ?? null,
      initialBranchId: service.branchId ?? null,
    });
  };

  const handleDeleteService = (service: VendorService) => {
    setServicePendingDelete(service);
  };

  const handleAddService = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setEditingService(null);
    resetForm();
    setIsAddModalVisible(true);
    await loadFormMeta();
  };

  const loadFormMeta = async (options?: { initialBranchId?: string | null; initialCategoryId?: string | null }) => {
    if (!user?.id) return;

    // Category ID is stored on the vendor profile; fall back gracefully if missing
    const categoryIdFromUser = vendorProfile?.categoryId;
    console.log("categoryIdFromUser", categoryIdFromUser);
    try {
      setIsLoadingFormMeta(true);

      const [categoryFromApi, vendorBranchesRaw] = await Promise.all([
        categoryIdFromUser ? categoryService.getCategoryById(categoryIdFromUser) : Promise.resolve(null),
        branchService.getBranchesForVendor(user.id),
      ]);

      const vendorBranches = Array.isArray(vendorBranchesRaw) ? vendorBranchesRaw : [];
      const userCategories = categoryFromApi ? [categoryFromApi] : [];

      if (__DEV__) {
        console.log('[Services] Form meta loaded', {
          hasCategoryIdOnUser: !!categoryIdFromUser,
          categoriesCount: userCategories.length,
          branchesCount: vendorBranches.length,
        });
      }

      setCategories(userCategories);
      setBranches(vendorBranches);

      const effectiveCategoryId =
        options?.initialCategoryId ??
        (userCategories.length > 0 ? userCategories[0].id : undefined);
      if (effectiveCategoryId) {
        setSelectedCategoryId(effectiveCategoryId);
      }

      const effectiveBranchId =
        options?.initialBranchId ??
        (vendorBranches.length > 0 ? String(vendorBranches[0].id) : undefined);
      if (effectiveBranchId) {
        setSelectedBranchId(effectiveBranchId);
      }
    } catch (err: any) {
      console.error('Failed to load form metadata:', err);
      Alert.alert('Error', err.message || 'Failed to load categories/branches');
    } finally {
      setIsLoadingFormMeta(false);
    }
  };

  const resetForm = () => {
    setServiceName('');
    setServiceDescription('');
    setServicePrice('');
    setSelectedBranchId(null);
    setSelectedCategoryId(null);
    setShowBranchDropdown(false);
    setFocusedField(null);
  };

  const handleCloseModal = () => {
    setIsAddModalVisible(false);
    setEditingService(null);
    resetForm();
  };

  const handleSubmitService = async () => {
    if (!serviceName.trim()) {
      Alert.alert('Missing field', 'Please enter a service name.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Missing field', 'Category is not available for this account.');
      return;
    }
    if (!selectedBranchId) {
      Alert.alert('Missing field', 'Please select a branch.');
      return;
    }
    if (!servicePrice.trim() || Number.isNaN(Number(servicePrice.trim()))) {
      Alert.alert('Invalid price', 'Please enter a valid numeric price.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        name: serviceName.trim(),
        description: serviceDescription.trim() || undefined,
        categoryId: selectedCategoryId,
        branchId: selectedBranchId,
        // Backend accepts numeric string, but UpdateServiceRequest expects number; convert here.
        price: Number(servicePrice.trim()),
      };

      if (editingService) {
        await serviceService.updateService(editingService.id, payload);
        Alert.alert('Success', 'Service updated successfully');
      } else {
        await serviceService.createService(payload);
        Alert.alert('Success', 'Service created successfully');
      }

      handleCloseModal();
      loadServices();
    } catch (err: any) {
      console.error('Failed to save service:', err);
      Alert.alert('Error', err.message || 'Failed to save service');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMetaChip = (icon: keyof typeof Ionicons.glyphMap, label: string) => (
    <View style={styles.metaChip}>
      <Ionicons name={icon} size={14} color={Colors.textSecondary} />
      <Text style={styles.metaChipText} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  const renderServiceCard = ({ item }: { item: VendorService }) => (
    <View style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={styles.serviceInfo}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {item.name}
          </Text>
          {item.description && (
            <Text style={styles.serviceDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>
        {item.price !== undefined && <Text style={styles.pricePill}>₹{item.price}</Text>}
      </View>

      <View style={styles.metaRow}>
        {item.branchName ? renderMetaChip('location-outline', item.branchName) : null}
        {typeof item.batchCount === 'number'
          ? renderMetaChip('people-outline', `${item.batchCount} batches`)
          : null}
        {typeof item.studentCount === 'number'
          ? renderMetaChip('person-outline', `${item.studentCount} students`)
          : null}
      </View>

      <View style={styles.divider} />

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => handleViewDetails(item)}
        >
          <Ionicons name="eye-outline" size={18} color={Colors.primary} />
          <Text style={[styles.actionButtonText, styles.viewButtonText]}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => handleEditService(item)}
        >
          <Ionicons name="create-outline" size={18} color={Colors.primary} />
          <Text style={[styles.actionButtonText, styles.editButtonText]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteService(item)}
        >
          <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderAddServiceModal = () => {
    const fixedCategory = Array.isArray(categories)
      ? categories.find((c) => c.id === selectedCategoryId)
      : undefined;

    return (
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.modalKeyboardView}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>
                    {editingService ? 'Edit Service' : 'Add New Service'}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    Fill in the details below to create a new service offering.
                  </Text>
                </View>
                <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                  <Ionicons name="close" size={22} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.modalScroll}
                contentContainerStyle={styles.modalContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Service Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Name</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'name' && styles.inputContainerFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="Enter service name"
                      placeholderTextColor={Colors.textSecondary}
                      value={serviceName}
                      onChangeText={setServiceName}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Service Description */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Description</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      styles.textAreaContainer,
                      focusedField === 'description' && styles.inputContainerFocused,
                    ]}
                  >
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      placeholder="Brief description of your service"
                      placeholderTextColor={Colors.textSecondary}
                      value={serviceDescription}
                      onChangeText={setServiceDescription}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField(null)}
                      multiline
                    />
                  </View>
                </View>

                {/* Service Category (fixed) */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Category</Text>
                  <View style={[styles.inputContainer, styles.readonlyField]}>
                    {isLoadingFormMeta ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <Text
                        style={styles.readonlyText}
                        numberOfLines={1}
                      >
                        {fixedCategory?.name ?? 'Loading category...'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.helperText}>Category is fixed based on your profile.</Text>
                </View>

                {/* Branch dropdown */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Select Branch</Text>
                  <TouchableOpacity
                    style={[
                      styles.inputContainer,
                      styles.dropdownTrigger,
                      focusedField === 'branch' && styles.inputContainerFocused,
                    ]}
                    onPress={() => setShowBranchDropdown((prev) => !prev)}
                    disabled={isLoadingFormMeta || branches.length === 0}
                    activeOpacity={0.8}
                  >
                    {isLoadingFormMeta ? (
                      <ActivityIndicator size="small" color={Colors.primary} />
                    ) : (
                      <>
                        <Text
                          style={[
                            styles.dropdownText,
                            !selectedBranchId && styles.placeholderText,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedBranchId
                            ? branches.find((b) => String(b.id) === selectedBranchId)?.branchName ??
                              'Select a branch'
                            : 'Select a branch'}
                        </Text>
                        <Ionicons
                          name={showBranchDropdown ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={Colors.textSecondary}
                        />
                      </>
                    )}
                  </TouchableOpacity>

                  {showBranchDropdown && branches.length > 0 && (
                    <View style={styles.dropdownList}>
                      <ScrollView
                        style={styles.dropdownScroll}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                      >
                        {branches.map((branch) => (
                          <TouchableOpacity
                            key={branch.id}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setSelectedBranchId(String(branch.id));
                              setShowBranchDropdown(false);
                              setFocusedField(null);
                            }}
                          >
                            <View style={styles.dropdownItemRow}>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.dropdownItemText} numberOfLines={1}>
                                  {branch.branchName}
                                </Text>
                                {!!branch.branchAddress && (
                                  <Text style={styles.dropdownItemSubText} numberOfLines={1}>
                                    {branch.branchAddress}
                                  </Text>
                                )}
                              </View>
                              {String(branch.id) === selectedBranchId && (
                                <Ionicons
                                  name="checkmark-circle"
                                  size={18}
                                  color={Colors.primary}
                                />
                              )}
                            </View>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Service Price */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Service Price (₹)</Text>
                  <View
                    style={[
                      styles.inputContainer,
                      focusedField === 'price' && styles.inputContainerFocused,
                    ]}
                  >
                    <TextInput
                      style={styles.input}
                      placeholder="Enter price"
                      placeholderTextColor={Colors.textSecondary}
                      keyboardType="numeric"
                      value={servicePrice}
                      onChangeText={setServicePrice}
                      onFocus={() => setFocusedField('price')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <Text style={styles.helperText}>
                    This price will be used if you don&apos;t add batches to this service.
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.primaryButton, (isSubmitting || isLoadingFormMeta) && styles.primaryButtonDisabled]}
                    onPress={handleSubmitService}
                    disabled={isSubmitting || isLoadingFormMeta}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <Ionicons name="add" size={18} color="#FFF" />
                        <Text style={styles.primaryButtonText}>
                          {editingService ? 'Save Changes' : 'Add Service'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.secondaryButton} onPress={handleCloseModal}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  };

  const renderDeleteConfirmModal = () => {
    if (!servicePendingDelete) return null;

    return (
      <Modal
        visible={!!servicePendingDelete}
        animationType="fade"
        transparent
        onRequestClose={() => setServicePendingDelete(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteIconCircle}>
              <Ionicons name="trash-outline" size={26} color="#FF6B6B" />
            </View>
            <Text style={styles.deleteTitle}>Delete service?</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete{' '}
              <Text style={styles.deleteServiceName}>{servicePendingDelete.name}</Text>? This
              action cannot be undone.
            </Text>

            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.deleteCancelButton}
                onPress={() => setServicePendingDelete(null)}
                disabled={isDeleting}
              >
                <Text style={styles.deleteCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteConfirmButton}
                onPress={async () => {
                  if (!servicePendingDelete) return;
                  try {
                    setIsDeleting(true);
                    await serviceService.deleteService(servicePendingDelete.id);
                    setServicePendingDelete(null);
                    Alert.alert('Success', 'Service deleted successfully');
                    loadServices();
                  } catch (err: any) {
                    Alert.alert('Error', err.message || 'Failed to delete service');
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.deleteConfirmText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="briefcase-outline" size={64} color={Colors.textSecondary} />
      <Text style={styles.emptyTitle}>No Services Yet</Text>
      <Text style={styles.emptySubtitle}>
        Start by creating your first service to manage your offerings
      </Text>
      <TouchableOpacity style={styles.emptyButton} onPress={handleAddService}>
        <Text style={styles.emptyButtonText}>Create Service</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading services...</Text>
      </View>
    );
  }

  if (error && !services.length) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF6B6B" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadServices}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderAddServiceModal()}
      {renderDeleteConfirmModal()}
      <FlatList
        data={services}
        renderItem={renderServiceCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          services.length === 0 && styles.emptyListContainer,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      />

      {services.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={handleAddService}>
          <Ionicons name="add" size={28} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#FF6B6B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  emptyListContainer: {
    flexGrow: 1,
  },
  serviceCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  serviceInfo: {
    flex: 1,
    marginRight: 12,
  },
  serviceName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  pricePill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: `${Colors.primary}12`,
    borderWidth: 1,
    borderColor: `${Colors.primary}22`,
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(148, 163, 184, 0.14)',
    maxWidth: '100%',
  },
  metaChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.06)',
    marginTop: 14,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
  },
  viewButton: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: `${Colors.primary}22`,
  },
  editButton: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: `${Colors.primary}22`,
  },
  deleteButton: {
    backgroundColor: '#FFF0F0',
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  viewButtonText: {
    color: Colors.primary,
  },
  editButtonText: {
    color: Colors.primary,
  },
  deleteButtonText: {
    color: '#FF6B6B',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalKeyboardView: {
    width: '100%',
    maxWidth: 420,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
    maxHeight: '90%',
  },
  deleteModalCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  closeButton: {
    marginLeft: -8,
    marginTop: -4,
  },
  modalScroll: {
    maxHeight: 520,
  },
  modalContent: {
    paddingBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  inputContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputContainerFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#F0FDFA',
  },
  input: {
    fontSize: 14,
    color: Colors.text,
  },
  textAreaContainer: {
    minHeight: 72,
  },
  textArea: {
    height: 72,
    textAlignVertical: 'top',
  },
  readonlyField: {
    backgroundColor: '#F9FAFB',
  },
  readonlyText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  helperText: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textSecondary,
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    backgroundColor: '#FFF',
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  dropdownItemSubText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalActions: {
    marginTop: 8,
    gap: 8,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  secondaryButton: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  deleteIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 12,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  deleteMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 18,
  },
  deleteServiceName: {
    fontWeight: '600',
    color: Colors.text,
  },
  deleteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  deleteCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#F3F4F6',
  },
  deleteCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  deleteConfirmButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#EF4444',
  },
  deleteConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
