import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoodRow, RestaurantCard } from '@/components/commerce';
import { AppButton, Chip, FormField, Page, RequestState, ScreenHeader, SearchField, Surface } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { useSession } from '@/providers/SessionProvider';
import { listCategories, listFoods, listRestaurants } from '@/services/api/catalog';
import { colors } from '@/theme';
import type { Food, Restaurant } from '@/data/demo';

type SearchResultData =
  | { kind: 'restaurants'; items: Restaurant[] }
  | { kind: 'foods'; items: Food[] };

interface SearchFilters {
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  maxDistanceKm?: number;
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const { token } = useSession();
  const { addresses, selectedAddressId } = usePrototype();
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [type, setType] = useState<'Nhà hàng' | 'Món ăn'>('Nhà hàng');
  const [categoryId, setCategoryId] = useState(
    typeof params.categoryId === 'string' ? params.categoryId : '',
  );
  const [openOnly, setOpenOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [minRatingInput, setMinRatingInput] = useState('');
  const [maxDistanceInput, setMaxDistanceInput] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [filterError, setFilterError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const loadCategories = useCallback(() => {
    if (!token) {
      return Promise.reject(new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'));
    }
    return listCategories(token);
  }, [token]);
  const categoryResource = useApiResource(loadCategories);

  const loadResults = useCallback(async () => {
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    const parsedCategoryId = categoryId ? Number(categoryId) : undefined;
    if (type === 'Nhà hàng') {
      const restaurants = await listRestaurants(token, {
        q: debouncedQuery || undefined,
        categoryId: parsedCategoryId,
        isOpen: openOnly ? true : undefined,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        minRating: filters.minRating,
        ...(selectedAddress
          ? {
              latitude: selectedAddress.latitude,
              longitude: selectedAddress.longitude,
              maxDistanceKm: filters.maxDistanceKm,
            }
          : {}),
      });
      return { kind: 'restaurants', items: restaurants } satisfies SearchResultData;
    }
    const foods = await listFoods(token, {
      q: debouncedQuery || undefined,
      categoryId: parsedCategoryId,
      minPrice: filters.minPrice,
      maxPrice: filters.maxPrice,
    });
    return { kind: 'foods', items: foods } satisfies SearchResultData;
  }, [categoryId, debouncedQuery, filters, openOnly, selectedAddress, token, type]);
  const { data, error, isLoading, retry } = useApiResource(loadResults);

  function applyFilters() {
    setFilterError('');
    const minPrice = minPriceInput.trim() ? Number(minPriceInput) : undefined;
    const maxPrice = maxPriceInput.trim() ? Number(maxPriceInput) : undefined;
    const minRating = type === 'Nhà hàng' && minRatingInput ? Number(minRatingInput) : undefined;
    const maxDistanceKm = type === 'Nhà hàng' && selectedAddress && maxDistanceInput.trim()
        ? Number(maxDistanceInput)
        : undefined;

    if (
        (minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0))
        || (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0))
        || (maxDistanceKm !== undefined
          && (!Number.isFinite(maxDistanceKm) || maxDistanceKm < 0.01 || maxDistanceKm > 1000))
    ) {
        setFilterError('Giá phải từ 0 trở lên; khoảng cách phải từ 0,01 đến 1.000 km.');
        return;
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
        setFilterError('Giá tối thiểu không được lớn hơn giá tối đa.');
        return;
    }

    setFilters({ minPrice, maxPrice, minRating, maxDistanceKm });
    setFiltersOpen(false);
  }

  function resetFilters() {
    setMinPriceInput('');
    setMaxPriceInput('');
    setMinRatingInput('');
    setMaxDistanceInput('');
    setFilters({});
    setOpenOnly(false);
    setFilterError('');
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Tìm kiếm"
        subtitle="Tìm nhà hàng hoặc món ăn."
        onBack={() => goBackOrReplace('/home')}
      />
      <SearchField
        value={query}
        onChangeText={setQuery}
        autoFocus
        placeholder="Tên món hoặc nhà hàng"
      />
      <View style={styles.segment}>
        {(['Nhà hàng', 'Món ăn'] as const).map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: type === item }}
            onPress={() => setType(item)}
          >
            <Text style={[styles.segmentLabel, type === item ? styles.segmentSelected : null]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        <Chip
          label="Tất cả"
          selected={!categoryId}
          onPress={() => setCategoryId('')}
        />
        {(categoryResource.data ?? []).map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === String(category.id)}
            onPress={() => setCategoryId(String(category.id))}
          />
        ))}
        {type === 'Nhà hàng' ? (
          <Chip
            label={openOnly ? 'Đang mở ✓' : 'Đang mở'}
            selected={openOnly}
            onPress={() => setOpenOnly((value) => !value)}
          />
        ) : null}
      </ScrollView>
      <View style={styles.filterActions}>
        <Chip
          label={filtersOpen ? 'Ẩn bộ lọc' : `Bộ lọc${Object.values(filters).some((value) => value !== undefined) ? ' ✓' : ''}`}
          selected={filtersOpen}
          onPress={() => setFiltersOpen((open) => !open)}
        />
        <Text style={styles.filterHint}>
          {selectedAddress ? `Gần ${selectedAddress.name}` : 'Chọn địa chỉ để lọc khoảng cách'}
        </Text>
      </View>
      {filtersOpen ? (
        <Surface style={styles.filterPanel}>
          <Text style={styles.filterTitle}>Lọc kết quả</Text>
          <View style={styles.priceRow}>
            <FormField
              label="Giá từ"
              value={minPriceInput}
              onChangeText={setMinPriceInput}
              placeholder="0"
              keyboardType="numeric"
              style={styles.priceField}
            />
            <FormField
              label="Đến"
              value={maxPriceInput}
              onChangeText={setMaxPriceInput}
              placeholder="Không giới hạn"
              keyboardType="numeric"
              style={styles.priceField}
            />
          </View>
          {type === 'Nhà hàng' ? (
            <>
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Đánh giá tối thiểu</Text>
                <View style={styles.ratingFilters}>
                  {[
                    { label: 'Bất kỳ', value: '' },
                    { label: '4+', value: '4' },
                    { label: '4,5+', value: '4.5' },
                  ].map((option) => (
                    <Chip
                      key={option.value || 'any'}
                      label={option.label}
                      selected={minRatingInput === option.value}
                      onPress={() => setMinRatingInput(option.value)}
                    />
                  ))}
                </View>
              </View>
              {selectedAddress ? (
                <FormField
                  label="Trong bán kính (km)"
                  value={maxDistanceInput}
                  onChangeText={setMaxDistanceInput}
                  placeholder="Ví dụ: 5"
                  keyboardType="decimal-pad"
                />
              ) : null}
            </>
          ) : null}
          {filterError ? <Text style={styles.filterError}>{filterError}</Text> : null}
          <View style={styles.filterButtons}>
            <AppButton label="Đặt lại" variant="quiet" onPress={resetFilters} style={styles.filterButton} />
            <AppButton label="Áp dụng" onPress={applyFilters} style={styles.filterButton} />
          </View>
        </Surface>
      ) : null}

      {categoryResource.error && !error ? (
        <RequestState
          message={categoryResource.error}
          onRetry={categoryResource.retry}
        />
      ) : null}
      {isLoading ? (
        <RequestState loading message="Đang tìm trong danh mục..." />
      ) : error ? (
        <RequestState message={error} onRetry={retry} />
      ) : !data || data.items.length === 0 ? (
        <EmptyResults query={debouncedQuery} />
      ) : data.kind === 'restaurants' ? (
        <View style={styles.results}>
          {data.items.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </View>
      ) : (
        <Surface style={styles.foodResults}>
          {data.items.map((food) => (
            <FoodRow key={food.id} food={food} />
          ))}
        </Surface>
      )}
    </Page>
  );
}

function EmptyResults({ query }: { query: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Chưa tìm thấy kết quả</Text>
      <Text style={styles.emptyCopy}>
        {query
          ? 'Thử một từ khóa khác hoặc bỏ bớt bộ lọc.'
          : 'Chọn một danh mục hoặc nhập món bạn đang muốn ăn.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  segment: { flexDirection: 'row', gap: 25, borderBottomWidth: 1, borderColor: colors.line },
  segmentLabel: { paddingBottom: 11, color: colors.muted, fontSize: 13, fontWeight: '600' },
  segmentSelected: { borderBottomWidth: 2, borderColor: colors.accent, color: colors.accent },
  filters: { gap: 8, paddingRight: 8 },
  filterActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  filterHint: { flex: 1, color: colors.muted, fontSize: 10, textAlign: 'right' },
  filterPanel: { gap: 13 },
  filterTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  priceRow: { flexDirection: 'row', gap: 10 },
  priceField: { flex: 1 },
  filterGroup: { gap: 8 },
  filterLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  ratingFilters: { flexDirection: 'row', gap: 8 },
  filterButtons: { flexDirection: 'row', gap: 10 },
  filterButton: { flex: 1, minHeight: 44 },
  filterError: { color: colors.rose, fontSize: 11 },
  results: { gap: 13 },
  foodResults: { paddingTop: 0, paddingBottom: 0 },
  empty: { alignItems: 'center', paddingVertical: 52, gap: 8 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emptyCopy: { maxWidth: 270, color: colors.muted, fontSize: 12, lineHeight: 19, textAlign: 'center' },
});
