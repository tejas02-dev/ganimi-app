import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { contentService, type VendorContent, type ContentType } from '@/services/content.service';

type TabKey = 'all' | 'video' | 'article';

function formatContentDate(iso: string | undefined): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function VendorContentScreen() {
  const [list, setList] = useState<VendorContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingContent, setEditingContent] = useState<VendorContent | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState<ContentType | ''>('');
  const [videoUrl, setVideoUrl] = useState('');
  const [articleText, setArticleText] = useState('');

  const loadContent = useCallback(async () => {
    try {
      const res = await contentService.getContent();
      setList(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load content', e);
      setList([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  const onRefresh = () => {
    setRefreshing(true);
    loadContent();
  };

  const filteredList = useMemo(() => {
    if (activeTab === 'all') return list;
    if (activeTab === 'video') return list.filter((item) => item.contentType === 'video');
    return list.filter((item) => item.contentType === 'text');
  }, [list, activeTab]);

  const openCreateModal = () => {
    setEditingContent(null);
    setTitle('');
    setDescription('');
    setContentType('');
    setVideoUrl('');
    setArticleText('');
    setModalVisible(true);
  };

  const openEditModal = (item: VendorContent) => {
    setEditingContent(item);
    setTitle(item.title ?? '');
    setDescription(item.description ?? '');
    setContentType((item.contentType as ContentType) ?? '');
    setVideoUrl(item.videoUrl ?? '');
    setArticleText(item.articleText ?? '');
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingContent(null);
  };

  const handleDelete = (item: VendorContent) => {
    Alert.alert(
      'Delete content',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(item.id);
            try {
              await contentService.deleteContent(item.id);
              Alert.alert('Success', 'Content deleted successfully.');
              loadContent();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to delete content.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Please enter a title.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation', 'Please enter a description.');
      return;
    }
    if (!contentType) {
      Alert.alert('Validation', 'Please select a content type.');
      return;
    }
    if (contentType === 'video' && !videoUrl.trim()) {
      Alert.alert('Validation', 'Please enter the video link.');
      return;
    }
    if (contentType === 'text' && !articleText.trim()) {
      Alert.alert('Validation', 'Please enter the text content.');
      return;
    }

    const payload =
      contentType === 'video'
        ? {
            title: title.trim(),
            description: description.trim(),
            contentType: 'video' as const,
            videoUrl: videoUrl.trim(),
            provider: 'youtube',
            articleText: null,
          }
        : {
            title: title.trim(),
            description: description.trim(),
            contentType: 'text' as const,
            videoUrl: null,
            provider: null,
            articleText: articleText.trim(),
          };

    setSaving(true);
    try {
      if (editingContent) {
        await contentService.updateContent(editingContent.id, payload);
        Alert.alert('Success', 'Content updated successfully.');
      } else {
        await contentService.createContent(payload);
        Alert.alert('Success', 'Content created successfully.');
      }
      closeModal();
      loadContent();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Failed to create content.');
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: VendorContent }) => {
    const isVideo = item.contentType === 'video';
    const createdLabel = formatContentDate(item.createdAt);
    return (
      <View style={styles.card}>
        <View style={styles.cardInner}>
          <View style={styles.cardIconWrap}>
            <Ionicons
              name={isVideo ? 'play' : 'document-text'}
              size={24}
              color={Colors.primary}
            />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            {item.description ? (
              <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
            ) : null}
            {createdLabel ? (
              <View style={styles.cardDateRow}>
                <Ionicons name="calendar" size={12} color={Colors.textSecondary} />
                <Text style={styles.cardDateText}>Created {createdLabel}</Text>
              </View>
            ) : null}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.btnUpdate}
                onPress={() => openEditModal(item)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="edit" size={16} color={Colors.primary} />
                <Text style={styles.btnUpdateText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() => handleDelete(item)}
                disabled={deletingId === item.id}
                activeOpacity={0.8}
              >
                {deletingId === item.id ? (
                  <ActivityIndicator size="small" color={Colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash" size={16} color={Colors.error} />
                    <Text style={styles.btnDeleteText}>Delete</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <VendorVerificationGate>
      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading content…</Text>
          </View>
        ) : (
          <>
            <View style={styles.tabsRow}>
              {(['all', 'video', 'article'] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={styles.tabItem}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.tabLabel,
                      activeTab === tab && styles.tabLabelActive,
                    ]}
                  >
                    {tab === 'all' ? 'All' : tab === 'video' ? 'Video' : 'Article'}
                  </Text>
                  {activeTab === tab && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
              ))}
            </View>
            <FlatList
              data={filteredList}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, filteredList.length === 0 && styles.listEmpty]}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons
                    name={activeTab === 'video' ? 'videocam-outline' : activeTab === 'article' ? 'document-text-outline' : 'folder-open-outline'}
                    size={56}
                    color={Colors.textSecondary}
                  />
                  <Text style={styles.emptyTitle}>
                    {activeTab === 'all' ? 'No content yet' : activeTab === 'video' ? 'No videos' : 'No articles'}
                  </Text>
                  <Text style={styles.emptySubtitle}>
                    {activeTab === 'all'
                      ? 'Create content for your services or batches.'
                      : 'Add content from the + button to see it here.'}
                  </Text>
                </View>
              }
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
              }
            />
            <TouchableOpacity style={styles.fab} onPress={openCreateModal}>
              <Ionicons name="add" size={28} color="#FFF" />
            </TouchableOpacity>
          </>
        )}

        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent
          onRequestClose={closeModal}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <TouchableOpacity
              style={styles.modalBackdrop}
              activeOpacity={1}
              onPress={closeModal}
            />
            <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Text style={styles.modalTitle}>
                      {editingContent ? 'Edit Content' : 'Create New Content'}
                    </Text>
                    <Text style={styles.modalSubtitle}>
                      {editingContent
                        ? 'Update the content details below.'
                        : 'Create content for your services or batches. Fill in all required fields.'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={closeModal} style={styles.closeBtn}>
                    <Ionicons name="close" size={22} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.modalScroll}
                  contentContainerStyle={styles.modalScrollContent}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <View style={styles.field}>
                    <Text style={styles.label}>Title *</Text>
                    <TextInput
                      style={styles.input}
                      value={title}
                      onChangeText={setTitle}
                      placeholder="Enter content title"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Description *</Text>
                    <TextInput
                      style={[styles.input, styles.textArea]}
                      value={description}
                      onChangeText={setDescription}
                      placeholder="Enter content description"
                      placeholderTextColor={Colors.textSecondary}
                      multiline
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Content Type *</Text>
                    <View style={styles.chipRow}>
                      <TouchableOpacity
                        style={[styles.chip, contentType === 'video' && styles.chipActive]}
                        onPress={() => setContentType('video')}
                      >
                        <Ionicons
                          name="videocam-outline"
                          size={18}
                          color={contentType === 'video' ? '#FFF' : Colors.textSecondary}
                        />
                        <Text style={[styles.chipText, contentType === 'video' && styles.chipTextActive]}>
                          Video
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.chip, contentType === 'text' && styles.chipActive]}
                        onPress={() => setContentType('text')}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={18}
                          color={contentType === 'text' ? '#FFF' : Colors.textSecondary}
                        />
                        <Text style={[styles.chipText, contentType === 'text' && styles.chipTextActive]}>
                          Text
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {contentType === 'video' && (
                    <View style={styles.field}>
                      <Text style={styles.label}>Video link *</Text>
                      <TextInput
                        style={styles.input}
                        value={videoUrl}
                        onChangeText={setVideoUrl}
                        placeholder="https://youtube.com/watch?v=..."
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="url"
                        autoCapitalize="none"
                      />
                    </View>
                  )}

                  {contentType === 'text' && (
                    <View style={styles.field}>
                      <Text style={styles.label}>Text content *</Text>
                      <TextInput
                        style={[styles.input, styles.textAreaLarge]}
                        value={articleText}
                        onChangeText={setArticleText}
                        placeholder="Enter your text content..."
                        placeholderTextColor={Colors.textSecondary}
                        multiline
                      />
                    </View>
                  )}

                  <View style={styles.modalActions}>
                    
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                      onPress={handleSave}
                      disabled={saving}
                    >
                      {saving ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.saveBtnText}>{editingContent ? 'Update' : 'Save'}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  tabItem: {
    marginRight: 24,
  },
  tabLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.semiBold,
  },
  tabLabelActive: {
    color: Colors.primary,
  },
  tabUnderline: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: Colors.primary,
  },
  listContent: {
    padding: 16,
    paddingBottom: 88,
  },
  listEmpty: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${Colors.primary}18`,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  cardDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  cardDateText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    top: -1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  btnUpdate: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  btnUpdateText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
    top: -1,
  },
  btnDelete: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: `${Colors.error}12`,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
  },
  btnDeleteText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.error,
    top: -1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: Typography.fontFamily.extraBold,
    color: Colors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
  closeBtn: {
    marginLeft: -8,
    marginTop: -4,
  },
  modalScroll: {
    maxHeight: 440,
  },
  modalScrollContent: {
    paddingBottom: 16,
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    fontFamily: Typography.fontFamily.regular,
    backgroundColor: '#F9FAFB',
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  textAreaLarge: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#F9FAFB',
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
    top: -1,
  },
  chipTextActive: {
    color: '#FFF',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 10,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontFamily: Typography.fontFamily.semiBold,
    color: '#FFF',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: Typography.fontFamily.regular,
  },
});
