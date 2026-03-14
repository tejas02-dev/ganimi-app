import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { Typography } from '@/constants/typography';
import { categoryService } from '@/services/category.service';
import type { Category } from '@/types/category';
import { directoryService, type DirectoryVendor } from '@/services/directory.service';

export default function StudentVendorDirectoryScreen() {
  const [locationQuery, setLocationQuery] = useState('');
  const [locationResults, setLocationResults] = useState<{ description: string; placeId: string }[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');

  const [vendorSearch, setVendorSearch] = useState('');
  const [vendors, setVendors] = useState<DirectoryVendor[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPreviousPage, setHasPreviousPage] = useState(false);
  const [isLoadingVendors, setIsLoadingVendors] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const loadVendors = useCallback(
    async (targetPage: number) => {
      try {
        setError(null);
        setIsLoadingVendors(true);
        const trimmedSearch = vendorSearch.trim();
        const trimmedLocation = locationQuery.trim();
        const res = await directoryService.getDirectory(targetPage, limit, {
          search: trimmedSearch || undefined,
          // Only send plain text location when we don't have coordinates
          location: locationCoords ? undefined : trimmedLocation || undefined,
          latitude: locationCoords?.latitude,
          longitude: locationCoords?.longitude,
          categoryId: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
        });
        setVendors(res.items || []);
        const effectiveTotal = res.total ?? res.items.length ?? 0;
        setTotal(effectiveTotal);
        setTotalPages(res.totalPages ?? (limit ? Math.max(1, Math.ceil(effectiveTotal / limit)) : 1));
        setHasNextPage(!!res.hasNextPage);
        setHasPreviousPage(!!res.hasPreviousPage);
      } catch (e: any) {
        console.error('[VendorDirectory] loadVendors', e);
        setError(e?.message || 'Failed to load vendors.');
        setVendors([]);
        setTotal(0);
      } finally {
        setIsLoadingVendors(false);
      }
    },
    [limit, vendorSearch, locationQuery, locationCoords, selectedCategoryId],
  );

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoryService.getCategories();
      setCategories(data || []);
    } catch (e: any) {
      console.error('[VendorDirectory] loadCategories', e);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadVendors(page);
  }, [page, loadVendors]);

  // Location autocomplete (Google Places)
  useEffect(() => {
    const trimmed = locationQuery.trim();
    if (!trimmed || trimmed.length < 2) {
      setLocationResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        // Expo inlines EXPO_PUBLIC_* vars at build time; dotenv is not used at runtime in the app.
        const apiKey =
          (process.env as any).EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
          (process.env as any).EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
          (process.env as any).GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          console.warn('Google Maps API key not found');
          return;
        }
        setIsLoadingLocations(true);
        const resp = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask':
              'suggestions.placePrediction.placeId,suggestions.placePrediction.text',
          },
          body: JSON.stringify({
            input: trimmed,
            includedRegionCodes: ['IN'],
            locationBias: {
              circle: {
                center: {
                  latitude: 20.5937, // India center (same as web app)
                  longitude: 78.9629,
                },
                radius: 50000,
              },
            },
            languageCode: 'en',
          }),
        });

        if (!resp.ok) {
          const text = await resp.text();
          console.error('[VendorDirectory] autocomplete error', resp.status, text);
          setLocationResults([]);
        } else {
          const data = await resp.json();
          if (Array.isArray(data?.suggestions) && data.suggestions.length > 0) {
            const suggestions = data.suggestions
              .filter((s: any) => s.placePrediction)
              .map((s: any) => {
                const text =
                  s.placePrediction?.text?.text || s.placePrediction?.text || '';
                const placeId = s.placePrediction?.placeId || '';
                return {
                  description: text,
                  placeId,
                };
              })
              .filter((s: any) => s.description);

            setLocationResults(suggestions);
          } else {
            setLocationResults([]);
          }
        }
      } catch (e) {
        console.error('[VendorDirectory] location autocomplete error', e);
      } finally {
        setIsLoadingLocations(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [locationQuery]);

  const fetchPlaceDetails = async (
    placeId: string,
  ): Promise<{ latitude: number; longitude: number } | null> => {
    // Reuse the same API key resolution as autocomplete
    const apiKey =
      (process.env as any).EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
      (process.env as any).EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ??
      (process.env as any).GOOGLE_MAPS_API_KEY;
    if (!apiKey || !placeId) return null;

    try {
      const resp = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'location',
        },
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error('[VendorDirectory] place details error', resp.status, text);
        return null;
      }

      const data = await resp.json();
      if (data?.location?.latitude != null && data?.location?.longitude != null) {
        return {
          latitude: data.location.latitude,
          longitude: data.location.longitude,
        };
      }
    } catch (e) {
      console.error('[VendorDirectory] fetchPlaceDetails error', e);
    }
    return null;
  };

  const handleLocationInputChange = (value: string) => {
    setLocationQuery(value);

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      // Clear location-based filtering and show all vendors again
      setLocationCoords(null);
      setLocationResults([]);
      setPage(1);
      loadVendors(1);
    }
  };

  const handleSelectLocation = async (item: { description: string; placeId: string }) => {
    setLocationQuery(item.description);
    setLocationResults([]);

    const coords = await fetchPlaceDetails(item.placeId);
    if (coords) {
      setLocationCoords(coords);
    } else {
      setLocationCoords(null);
    }

    // Reset to first page and fetch vendors around this location
    setPage(1);
    loadVendors(1);
  };

  const filteredVendors = useMemo(() => {
    return vendors.filter((v) => {
      // Category filter
      if (selectedCategoryId !== 'all') {
        const matchesCategoryId =
          v.categoryId === selectedCategoryId ||
          (v.category && v.category.id === selectedCategoryId);
        const categoryName = (v.categoryName || v.category?.name || '').toLowerCase();
        const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
        const matchesCategoryName =
          !!selectedCategory && categoryName.includes(selectedCategory.name.toLowerCase());
        if (!matchesCategoryId && !matchesCategoryName) return false;
      }

      // Vendor/service search
      const q = vendorSearch.trim().toLowerCase();
      if (!q) return true;
      const name = (v.name || '').toLowerCase();
      const branch = (v.branchName || '').toLowerCase();
      const desc = (v.description || '').toLowerCase();
      return name.includes(q) || branch.includes(q) || desc.includes(q);
    });
  }, [vendors, selectedCategoryId, vendorSearch, categories]);

  const canGoPrev = hasPreviousPage || page > 1;
  const canGoNext = hasNextPage || page < totalPages;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Location search bar */}
      <View style={styles.locationBar}>
        <Ionicons name="location-outline" size={20} color={Colors.textSecondary} style={styles.locationIcon} />
        <TextInput
          style={styles.locationInput}
          value={locationQuery}
          onChangeText={handleLocationInputChange}
          onBlur={() => setTimeout(() => setLocationResults([]), 200)}
          placeholder="Select Location..."
          placeholderTextColor={Colors.placeholder}
        />
        {isLoadingLocations && <ActivityIndicator size="small" color={Colors.primary} />}
      </View>
      {locationResults.length > 0 && (
        <View style={styles.dropdown}>
          {locationResults.map((item) => (
            <TouchableOpacity key={item.placeId} style={styles.dropdownItem} onPress={() => handleSelectLocation(item)}>
              <Text style={styles.dropdownItemText}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Category filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
        <TouchableOpacity
          style={[styles.categoryChip, selectedCategoryId === 'all' && styles.categoryChipActive]}
          onPress={() => setSelectedCategoryId('all')}
        >
          <Text style={[styles.categoryChipText, selectedCategoryId === 'all' && styles.categoryChipTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((c) => {
          const active = selectedCategoryId === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => setSelectedCategoryId(c.id)}
            >
              <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoadingVendors ? (
        <View style={styles.centerRow}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredVendors.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No vendors found</Text>
          <Text style={styles.emptySubtitle}>Try adjusting your location or category filters.</Text>
        </View>
      ) : (
        <>
          <View style={styles.countRow}>
            <Text style={styles.countText}>
              Showing {(page - 1) * limit + 1}-{(page - 1) * limit + filteredVendors.length} of {total}
            </Text>
          </View>
          <View style={styles.vendorList}>
          {filteredVendors.map((v) => {
            const phone =
              (v.phoneNumber as string) ||
              (v.contactNumber as string) ||
              (v.mobile as string) ||
              (v.phone as string) ||
              '';
            const addressParts = [
              (v as any).address,
              v.branchAddress || v.branchName,
              v.city,
              v.state,
              v.branchPincode,
              v.country,
            ].filter(Boolean);
            const address = addressParts.join(', ') || null;
            const categoryLabel = v.categoryName || 'Vendor';

            const handleCallVendor = () => {
              if (!phone) {
                Alert.alert('Contact unavailable', 'No phone number available for this vendor.');
                return;
              }
              Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => {
                Alert.alert('Unable to place call', 'Please try again or check your device settings.');
              });
            };

            const handleViewProfile = () => {
              Alert.alert('Coming soon', 'Vendor profile view will be available in a future update.');
            };

            return (
              <View key={v.id} style={styles.vendorCard}>
                <View style={styles.vendorCardImageWrap}>
                  <View style={styles.vendorCardImagePlaceholder}>
                    <Ionicons name="business-outline" size={40} color={Colors.primary} />
                  </View>
                  <View style={styles.vendorCategoryTag}>
                    <Text style={styles.vendorCategoryTagText}>{categoryLabel}</Text>
                  </View>
                </View>
                <View style={styles.vendorCardBody}>
                  <View style={styles.vendorNameRow}>
                    <Text style={styles.vendorName} numberOfLines={1}>{v.name}</Text>
                    {(v as any).rating != null && (
                      <View style={styles.ratingRow}>
                        <Ionicons name="star" size={14} color={Colors.warning} />
                        <Text style={styles.ratingText}>{(v as any).rating}</Text>
                      </View>
                    )}
                  </View>
                  {v.description ? (
                    <Text style={styles.vendorDescription} numberOfLines={2}>{v.description}</Text>
                  ) : null}
                  <View style={styles.vendorMetaRow}>
                    <Ionicons name="location-outline" size={14} color={Colors.textSecondary} />
                    <Text style={styles.vendorMetaText} numberOfLines={2}>{address || '—'}</Text>
                  </View>
                  {phone ? (
                    <View style={styles.vendorMetaRow}>
                      <Ionicons name="call-outline" size={14} color={Colors.textSecondary} />
                      <Text style={styles.vendorMetaText}>{phone}</Text>
                    </View>
                  ) : null}
                  <View style={styles.vendorActionsRow}>
                    <TouchableOpacity
                      style={[styles.vendorBtnCall, !phone && styles.vendorBtnCallDisabled]}
                      onPress={handleCallVendor}
                      disabled={!phone}
                    >
                      <Ionicons name="call" size={18} color={phone ? '#FFF' : Colors.textSecondary} />
                      <Text style={styles.vendorBtnCallText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.vendorBtnProfile} onPress={handleViewProfile}>
                      <Text style={styles.vendorBtnProfileText}>View Profile</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
          </View>
        </>
      )}

      {/* Pagination */}
      {(totalPages > 1 || canGoPrev || canGoNext) && (
        <View style={styles.paginationRow}>
          <TouchableOpacity
            style={[styles.pageButton, !canGoPrev && styles.pageButtonDisabled]}
            disabled={!canGoPrev}
            onPress={() => canGoPrev && setPage((p) => Math.max(1, p - 1))}
          >
            <Ionicons name="chevron-back" size={18} color={canGoPrev ? Colors.text : Colors.textSecondary} />
            <Text style={[styles.pageButtonText, !canGoPrev && styles.pageButtonTextDisabled]}>Previous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pageButton, styles.pageButtonPrimary, !canGoNext && styles.pageButtonDisabled]}
            disabled={!canGoNext}
            onPress={() => canGoNext && setPage((p) => p + 1)}
          >
            <Text style={[styles.pageButtonText, styles.pageButtonPrimaryText, !canGoNext && styles.pageButtonTextDisabled]}>Next</Text>
            <Ionicons name="chevron-forward" size={18} color={canGoNext ? '#FFF' : Colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },

  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  locationIcon: { marginRight: 10 },
  locationInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text,
    padding: 0,
  },
  dropdown: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 12 },
  dropdownItemText: { fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.text },

  categoryRow: { paddingVertical: 4, paddingRight: 4, marginBottom: 20 },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    marginRight: 10,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.white,
  },

  errorText: { marginBottom: 12, fontSize: 13, fontFamily: Typography.fontFamily.regular, color: Colors.error },
  centerRow: { paddingVertical: 32, alignItems: 'center' },

  countRow: { marginBottom: 12 },
  countText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },

  vendorList: { marginBottom: 16 },
  vendorCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  vendorCardImageWrap: { position: 'relative', height: 140 },
  vendorCardImagePlaceholder: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorCategoryTag: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  vendorCategoryTagText: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
  },
  vendorCardBody: { padding: 14 },
  vendorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  vendorName: {
    flex: 1,
    fontSize: 17,
    fontFamily: Typography.fontFamily.bold,
    color: Colors.text,
  },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.secondary,
  },
  vendorDescription: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  vendorMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  vendorMetaText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.textSecondary,
  },
  vendorActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  vendorBtnCall: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    gap: 8,
  },
  vendorBtnCallDisabled: {
    backgroundColor: Colors.border,
  },
  vendorBtnCallText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.white,
  },
  vendorBtnProfile: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
  },
  vendorBtnProfileText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.semiBold,
    color: Colors.primary,
  },

  emptyState: { paddingVertical: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: Typography.fontFamily.semiBold, color: Colors.text },
  emptySubtitle: { marginTop: 6, fontSize: 14, fontFamily: Typography.fontFamily.regular, color: Colors.textSecondary, textAlign: 'center' },

  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 6,
    minWidth: 110,
    justifyContent: 'center',
  },
  pageButtonDisabled: { opacity: 0.6 },
  pageButtonText: {
    fontSize: 13,
    fontFamily: Typography.fontFamily.medium,
    color: Colors.text,
  },
  pageButtonTextDisabled: { color: Colors.textSecondary },
  pageButtonPrimary: { backgroundColor: Colors.primary },
  pageButtonPrimaryText: { color: Colors.white },
});

