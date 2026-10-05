import { useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import OpenStreetMapPicker from '@/components/maps/OpenStreetMapPicker';
import { AppButton, Page, ScreenHeader, SearchField } from '@/components/ui';
import { goBackOrReplace } from '@/navigation/back';
import { DEFAULT_MAP_CENTER } from '@/config/maps';
import { usePrototype, type DemoMapLocation } from '@/providers/PrototypeProvider';
import { searchAddresses, type AddressSearchResult } from '@/services/maps/openstreetmap';
import { colors } from '@/theme';

export default function MapPickerScreen() {
  const { addressId } = useLocalSearchParams<{ addressId?: string }>();
  const { addresses, selectedMapLocation, setMapLocation } = usePrototype();
  const savedAddress = addresses.find((item) => item.id === addressId);
  const [userPickedLocation, setUserPickedLocation] = useState<DemoMapLocation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const pickedLocation = userPickedLocation ?? selectedMapLocation ?? (
    savedAddress
      ? {
          latitude: savedAddress.latitude,
          longitude: savedAddress.longitude,
          address: savedAddress.address,
        }
      : null
  );
  const fallback: Href = addressId
    ? { pathname: '/profile/addresses/[addressId]', params: { addressId } }
    : '/profile/addresses/new';
  async function searchAddress() {
    const query = searchQuery.trim();
    if (!query || isSearching) return;
    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);
    try {
      const results = await searchAddresses(query);
      setSearchResults(results);
      if (results.length === 0) {
        setSearchError('Không tìm thấy địa chỉ phù hợp. Thử thêm tên đường, quận hoặc thành phố.');
      }
    } catch (cause) {
      setSearchError(cause instanceof Error ? cause.message : 'Không thể tìm địa chỉ trên OpenStreetMap.');
    } finally {
      setIsSearching(false);
    }
  }

  function chooseSearchResult(result: AddressSearchResult) {
    setUserPickedLocation({
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address,
    });
    setSearchResults([]);
    setSearchError('');
  }

  function confirmLocation() {
    if (!pickedLocation) return;
    setMapLocation(pickedLocation);
    goBackOrReplace(fallback);
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Chọn vị trí"
        subtitle="Tìm địa chỉ hoặc chọn trực tiếp trên bản đồ."
        onBack={() => goBackOrReplace(fallback)}
      />
      <View style={styles.searchSection}>
        <View style={styles.searchRow}>
          <SearchField
            value={searchQuery}
            onChangeText={(value) => {
              setSearchQuery(value);
              setSearchError('');
              setSearchResults([]);
            }}
            placeholder="Nhập số nhà, tên đường, địa điểm…"
            onSubmitEditing={() => { void searchAddress(); }}
            editable={!isSearching}
            accessibilityLabel="Tìm địa chỉ giao hàng"
            containerStyle={styles.searchInput}
          />
          <Pressable
            onPress={() => { void searchAddress(); }}
            disabled={!searchQuery.trim() || isSearching}
            style={({ pressed }) => [
              styles.searchButton,
              (!searchQuery.trim() || isSearching) && styles.searchButtonDisabled,
              pressed && styles.searchButtonPressed,
            ]}
            accessibilityRole="button"
          >
            {isSearching
              ? <ActivityIndicator size="small" color={colors.surface} />
              : <Text style={styles.searchButtonLabel}>Tìm</Text>}
          </Pressable>
        </View>
        {searchError ? <Text style={styles.searchError}>{searchError}</Text> : null}
        {searchResults.length > 0 ? (
          <View style={styles.searchResults}>
            {searchResults.map((result) => (
              <Pressable
                key={result.id}
                onPress={() => chooseSearchResult(result)}
                style={({ pressed }) => [styles.searchResult, pressed && styles.searchResultPressed]}
                accessibilityRole="button"
              >
                <Text style={styles.resultGlyph}>⌖</Text>
                <View style={styles.resultCopy}>
                  <Text style={styles.resultName} numberOfLines={1}>{result.name}</Text>
                  <Text style={styles.resultAddress} numberOfLines={2}>{result.address}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.map}>
        <OpenStreetMapPicker
          initialLatitude={pickedLocation?.latitude ?? DEFAULT_MAP_CENTER.latitude}
          initialLongitude={pickedLocation?.longitude ?? DEFAULT_MAP_CENTER.longitude}
          initialHasSelection={pickedLocation !== null}
          onLocationChange={setUserPickedLocation}
        />
      </View>
      <View style={styles.addressPanel}>
        <Text style={styles.panelEyebrow}>VỊ TRÍ ĐANG CHỌN</Text>
        <Text style={styles.panelTitle}>
          {pickedLocation?.address ||
            (pickedLocation
              ? 'Đã chọn điểm. Nhập địa chỉ đầy đủ trong biểu mẫu nếu cần.'
              : 'Chạm bản đồ để chọn điểm giao hàng')}
        </Text>
        {pickedLocation ? (
          <Text style={styles.coordinates}>
            {pickedLocation.latitude.toFixed(6)}° N  ·  {pickedLocation.longitude.toFixed(6)}° E
          </Text>
        ) : (
          <Text style={styles.panelAddress}>Chọn vị trí thật để gửi tọa độ chính xác cho đơn hàng.</Text>
        )}
      </View>
      <Text style={styles.helper}>
        © OpenStreetMap contributors. Chỉ tìm khi nhấn “Tìm”; truy vấn và tọa độ được gửi đến dịch vụ công cộng.
      </Text>
      <AppButton
        label="Xác nhận vị trí"
        onPress={confirmLocation}
        disabled={!pickedLocation}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, gap: 15, paddingBottom: 18 },
  searchSection: { gap: 8, zIndex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInput: { flex: 1 },
  searchButton: { minWidth: 62, height: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 13, backgroundColor: colors.accent },
  searchButtonDisabled: { opacity: 0.5 },
  searchButtonPressed: { backgroundColor: colors.accentDark },
  searchButtonLabel: { color: colors.surface, fontSize: 12, fontWeight: '700' },
  searchError: { paddingHorizontal: 4, color: colors.rose, fontSize: 11, lineHeight: 16 },
  searchResults: { overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface },
  searchResult: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  searchResultPressed: { backgroundColor: colors.accentSoft },
  resultGlyph: { width: 22, color: colors.accent, fontSize: 20, textAlign: 'center' },
  resultCopy: { flex: 1, gap: 4 },
  resultName: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  resultAddress: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  map: { flex: 1, minHeight: 350, overflow: 'hidden', borderRadius: 20 },
  addressPanel: { gap: 7, padding: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.surface },
  panelEyebrow: { color: colors.accent, fontSize: 9, letterSpacing: 0.9, fontWeight: '800' },
  panelTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  panelAddress: { color: colors.muted, fontSize: 12 },
  coordinates: { marginTop: 2, color: colors.subtle, fontSize: 10 },
  helper: { color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
