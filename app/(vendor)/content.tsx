import React, { useState, useEffect, useCallback } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { VendorVerificationGate } from '@/components/VendorVerificationGate';
import { contentService, type VendorContent, type ContentType } from '@/services/content.service';

export default function VendorContentScreen() {
  const [list, setList] = useState<VendorContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  const renderItem = ({ item }: { item: VendorContent }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typePill, item.contentType === 'video' ? styles.typeVideo : styles.typeText]}>
          <Ionicons
            name={item.contentType === 'video' ? 'videocam-outline' : 'document-text-outline'}
            size={14}
            color="#FFF"
          />
          <Text style={styles.typePillText}>{item.contentType === 'video' ? 'Video' : 'Text'}</Text>
        </View>
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      {item.description ? (
        <Text style={styles.cardDescription} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={[styles.cardActionBtn, styles.cardActionUpdate]}
          onPress={() => openEditModal(item)}
        >
          <Ionicons name="create-outline" size={18} color={Colors.primary} />
          <Text style={styles.cardActionUpdateText}>Update</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cardActionBtn, styles.cardActionDelete]}
          onPress={() => handleDelete(item)}
          disabled={deletingId === item.id}
        >
          {deletingId === item.id ? (
            <ActivityIndicator size="small" color="#FF6B6B" />
          ) : (
            <>
              <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
              <Text style={styles.cardActionDeleteText}>Delete</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

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
            <FlatList
              data={list}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.listContent, list.length === 0 && styles.listEmpty]}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Ionicons name="document-text-outline" size={56} color={Colors.textSecondary} />
                  <Text style={styles.emptyTitle}>No content yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Create content for your services or batches.
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
          animationType="fade"
          transparent
          onRequestClose={closeModal}
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
                    <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                      <Text style={styles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </VendorVerificationGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  typeVideo: {
    backgroundColor: Colors.primary,
  },
  typeText: {
    backgroundColor: Colors.textSecondary,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  cardActionBtn: {
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
  cardActionUpdate: {
    backgroundColor: `${Colors.primary}15`,
    borderColor: `${Colors.primary}22`,
  },
  cardActionUpdateText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  cardActionDelete: {
    backgroundColor: '#FFF0F0',
    borderColor: 'rgba(255, 107, 107, 0.25)',
  },
  cardActionDeleteText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B6B',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
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
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
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
    fontWeight: '700',
    color: Colors.text,
  },
  modalSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: Colors.textSecondary,
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
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
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
    borderRadius: 999,
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
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: '#FFF',
  },
  modalActions: {
    marginTop: 8,
    marginBottom: 24,
    gap: 10,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
