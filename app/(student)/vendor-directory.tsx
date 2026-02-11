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
      <Text style={styles.title}>Vendor Directory</Text>
      <Text style={styles.subtitle}>
        Search for vendors, services, and categories near you.
      </Text>

      {/* Filters card */}
      <View style={styles.filtersCard}>
        {/* Location search */}
        <View style={styles.searchGroup}>
          <Text style={styles.inputLabel}>Select Location</Text>
          <View style={styles.searchInputRow}>
            <Ionicons
              name="location-outline"
              size={18}
              color={Colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={locationQuery}
              onChangeText={handleLocationInputChange}
              placeholder="Type a city or area"
              placeholderTextColor={Colors.placeholder}
            />
            {isLoadingLocations && <ActivityIndicator size="small" color={Colors.primary} />}
          </View>
          {locationResults.length > 0 && (
            <View style={styles.dropdown}>
              {locationResults.map((item) => (
                <TouchableOpacity
                  key={item.placeId}
                  style={styles.dropdownItem}
                  onPress={() => handleSelectLocation(item)}
                >
                  <Text style={styles.dropdownItemText}>{item.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Vendor search */}
        <View style={styles.searchGroup}>
          <Text style={styles.inputLabel}>Search Vendors or Services</Text>
          <View style={styles.searchInputRow}>
            <Ionicons
              name="search-outline"
              size={18}
              color={Colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              value={vendorSearch}
              onChangeText={setVendorSearch}
              placeholder="Search by vendor or service name"
              placeholderTextColor={Colors.placeholder}
            />
          </View>
        </View>

        {/* Category filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryRow}
        >
          <TouchableOpacity
            style={[
              styles.categoryChip,
              selectedCategoryId === 'all' && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategoryId('all')}
          >
            <Ionicons
              name="apps-outline"
              size={16}
              color={selectedCategoryId === 'all' ? '#FFF' : Colors.textSecondary}
            />
            <Text
              style={[
                styles.categoryChipText,
                selectedCategoryId === 'all' && styles.categoryChipTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {categories.map((c) => {
            const active = selectedCategoryId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.categoryChip, active && styles.categoryChipActive]}
                onPress={() => setSelectedCategoryId(c.id)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    active && styles.categoryChipTextActive,
                  ]}
                  numberOfLines={1}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Vendors list */}
      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeaderText}>Vendors</Text>
        <Text style={styles.listHeaderMeta}>
          Page {page} of {totalPages} ({total} total)
        </Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isLoadingVendors ? (
        <View style={styles.centerRow}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : filteredVendors.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No vendors found</Text>
          <Text style={styles.emptySubtitle}>
            Try adjusting your search or filters.
          </Text>
        </View>
      ) : (
        <View style={styles.vendorList}>
          {filteredVendors.map((v) => {
            const phone =
              (v.phoneNumber as string) ||
              (v.contactNumber as string) ||
              (v.mobile as string) ||
              (v.phone as string) ||
              '';
            const addressParts = [
              v.branchAddress || v.branchName,
              v.city,
              v.state,
              v.branchPincode,
              v.country,
            ].filter(Boolean);
            const address = addressParts.join(', ');

            const handleCallVendor = () => {
              if (!phone) {
                Alert.alert('Contact unavailable', 'No phone number available for this vendor.');
                return;
              }
              const tel = `tel:${phone.replace(/\\s+/g, '')}`;
              Linking.openURL(tel).catch(() => {
                Alert.alert('Unable to place call', 'Please try again or check your device settings.');
              });
            };

            const handleViewDetails = () => {
              Alert.alert(
                'Coming soon',
                'Vendor detail view will be available in a future update.',
              );
            };

            return (
              <View key={v.id} style={styles.vendorCard}>
                <View style={styles.vendorAvatar}>
                  <Text style={styles.vendorAvatarText}>
                    {v.name?.charAt(0)?.toUpperCase() ?? 'V'}
                  </Text>
                </View>
                <View style={styles.vendorInfo}>
                  <Text style={styles.vendorName} numberOfLines={1}>
                    {v.name}
                  </Text>
                  {v.categoryName ? (
                    <Text style={styles.vendorMeta} numberOfLines={1}>
                      {v.categoryName}
                    </Text>
                  ) : null}
                  {address ? (
                    <Text style={styles.vendorMeta} numberOfLines={2}>
                      {address}
                    </Text>
                  ) : null}
                  {phone ? (
                    <Text style={styles.vendorMeta} numberOfLines={1}>
                      Phone: {phone}
                    </Text>
                  ) : null}
                  {v.description ? (
                    <Text style={styles.vendorDescription} numberOfLines={2}>
                      {v.description}
                    </Text>
                  ) : null}
                  {typeof v.serviceCount === 'number' && (
                    <Text style={styles.vendorMeta}>
                      {v.serviceCount} {v.serviceCount === 1 ? 'service' : 'services'}
                    </Text>
                  )}

                  <View style={styles.vendorActionsRow}>
                    <TouchableOpacity
                      style={[styles.vendorActionButton, !phone && styles.vendorActionButtonDisabled]}
                      onPress={handleCallVendor}
                      disabled={!phone}
                    >
                      <Ionicons
                        name="call-outline"
                        size={16}
                        color={phone ? '#FFF' : '#9CA3AF'}
                      />
                      <Text style={styles.vendorActionButtonText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.vendorActionButton, styles.vendorActionSecondary]}
                      onPress={handleViewDetails}
                    >
                      <Text style={[styles.vendorActionButtonText, styles.vendorActionSecondaryText]}>
                        View Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Pagination controls */}
      <View style={styles.paginationRow}>
        <TouchableOpacity
          style={[styles.pageButton, !canGoPrev && styles.pageButtonDisabled]}
          disabled={!canGoPrev}
          onPress={() => canGoPrev && setPage((p) => Math.max(1, p - 1))}
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={canGoPrev ? Colors.text : Colors.textSecondary}
          />
          <Text
            style={[
              styles.pageButtonText,
              !canGoPrev && styles.pageButtonTextDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.pageButton,
            styles.pageButtonPrimary,
            !canGoNext && styles.pageButtonDisabled,
          ]}
          disabled={!canGoNext}
          onPress={() => canGoNext && setPage((p) => p + 1)}
        >
          <Text
            style={[
              styles.pageButtonText,
              styles.pageButtonPrimaryText,
              !canGoNext && styles.pageButtonTextDisabled,
            ]}
          >
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canGoNext ? '#FFF' : Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundSecondary,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  filtersCard: {
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  searchGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  dropdown: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  categoryRow: {
    paddingVertical: 4,
    paddingRight: 4,
    marginBottom: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#FFF',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  listHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  listHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  listHeaderMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  errorText: {
    marginBottom: 8,
    fontSize: 13,
    color: Colors.error,
  },
  centerRow: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  vendorList: {
    marginTop: 4,
    marginBottom: 12,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  vendorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  vendorAvatarText: {
    color: '#FFF',
    fontWeight: '700',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  vendorMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  vendorDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  vendorActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  vendorActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    gap: 6,
  },
  vendorActionButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  vendorActionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
  vendorActionSecondary: {
    backgroundColor: '#F3F4F6',
  },
  vendorActionSecondaryText: {
    color: Colors.text,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtitle: {
    marginTop: 4,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    gap: 6,
    minWidth: 110,
    justifyContent: 'center',
  },
  pageButtonDisabled: {
    opacity: 0.6,
  },
  pageButtonText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500',
  },
  pageButtonTextDisabled: {
    color: Colors.textSecondary,
  },
  pageButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  pageButtonPrimaryText: {
    color: '#FFF',
  },
});

