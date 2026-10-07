import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { RestaurantCard } from '@/components/commerce';
import { ListPagination } from '@/components/ListPagination';
import { Page, RequestState, SearchField, SectionHeading, Surface } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { listCategories, listRestaurants } from '@/services/api/catalog';
import { usePrototype } from '@/providers/PrototypeProvider';
import { useSession } from '@/providers/SessionProvider';
import { colors } from '@/theme';

const RESTAURANTS_PER_PAGE = 6;

export default function HomeScreen() {
  const [restaurantPageState, setRestaurantPageState] = useState({ addressId: '', page: 1 });
  const { token } = useSession();
  const {
    addresses,
    selectedAddressId,
    isLoading: isLoadingCustomerData,
  } = usePrototype();
  const selectedAddress = addresses.find((address) => address.id === selectedAddressId);
  const homeAddress = addresses.find((address) => address.isDefault) ?? selectedAddress;
  const loadHome = useCallback(async () => {
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    const [categories, restaurants] = await Promise.all([
      listCategories(token),
      listRestaurants(token, {
        isOpen: true,
        ...(homeAddress
          ? { latitude: homeAddress.latitude, longitude: homeAddress.longitude }
          : {}),
      }),
    ]);
    return { categories, restaurants };
  }, [homeAddress, token]);
  const { data, error, isLoading, retry } = useApiResource(loadHome);
  const addressId = homeAddress?.id ?? '';
  const restaurantCount = data?.restaurants.length ?? 0;
  const restaurantPageCount = Math.max(1, Math.ceil(restaurantCount / RESTAURANTS_PER_PAGE));
  const restaurantPage = Math.min(
    restaurantPageState.addressId === addressId ? restaurantPageState.page : 1,
    restaurantPageCount,
  );
  const visibleRestaurants = data?.restaurants.slice(
    (restaurantPage - 1) * RESTAURANTS_PER_PAGE,
    restaurantPage * RESTAURANTS_PER_PAGE,
  ) ?? [];

  return (
    <Page contentStyle={styles.content}>
      <View style={styles.locationHeader}>
        <View style={styles.locationSection}>
          <Text style={styles.locationEyebrow}>GIAO ĐẾN</Text>
          <Pressable
            onPress={() => router.push('/checkout/address')}
            style={({ pressed }) => [
              styles.locationButton,
              pressed ? styles.locationButtonPressed : null,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              homeAddress
                ? `Địa chỉ giao hàng: ${homeAddress.name}, ${homeAddress.address}. Nhấn để thay đổi.`
                : 'Chọn địa chỉ giao hàng'
            }
          >
            <View style={styles.locationIcon}>
              <Text style={styles.locationIconText}>⌖</Text>
            </View>
            <View style={styles.locationCopy}>
              <Text style={styles.locationName} numberOfLines={1}>
                {homeAddress?.name
                  ?? (isLoadingCustomerData ? 'Đang tải địa chỉ...' : 'Chọn địa chỉ giao hàng')}
              </Text>
              <Text style={styles.locationAddress} numberOfLines={1}>
                {homeAddress?.address
                  ?? (isLoadingCustomerData
                    ? 'Đang đồng bộ sổ địa chỉ'
                    : 'Thêm địa chỉ để bắt đầu đặt món')}
              </Text>
            </View>
            <View style={styles.locationChevronWrap}>
              <Text style={styles.locationChevron}>⌄</Text>
            </View>
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => router.push('/search')}>
        <SearchField value="" onChangeText={() => undefined} editable={false} />
      </Pressable>

      <Surface style={styles.editorialCard}>
        <View style={styles.editorialCopy}>
          <Text style={styles.editorialEyebrow}>BỮA TRƯA GỌN GÀNG</Text>
          <Text style={styles.editorialTitle}>Món ngon,{'\n'}đúng lúc.</Text>
          <Text style={styles.editorialBody}>Những địa chỉ thân quen quanh bạn.</Text>
          <Pressable onPress={() => router.push('/search')} style={styles.editorialLink}>
            <Text style={styles.editorialLinkText}>Khám phá ngay  →</Text>
          </Pressable>
        </View>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=750&q=85' }}
          style={styles.editorialImage}
        />
      </Surface>

      <View style={styles.categorySection}>
        <SectionHeading title="Bạn muốn ăn gì?" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
          {(data?.categories ?? []).map((category) => (
            <Pressable
              key={category.id}
              onPress={() =>
                router.push({
                  pathname: '/search',
                  params: { categoryId: String(category.id) },
                })
              }
              style={styles.categoryItem}
            >
              <View style={styles.categoryIcon}>
                <Text style={styles.categorySymbol}>{category.name.slice(0, 2).toLocaleUpperCase('vi')}</Text>
              </View>
              <Text style={styles.categoryLabel} numberOfLines={1}>{category.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <View style={styles.restaurantsSection}>
        <SectionHeading
          title="Quanh khu vực của bạn"
          subtitle="Nhà hàng đang mở cửa"
          action="Xem tất cả"
          onAction={() => router.push('/search')}
        />
        {isLoading ? (
          <RequestState loading message="Đang tải nhà hàng và danh mục..." />
        ) : error ? (
          <RequestState message={error} onRetry={retry} />
        ) : data?.restaurants.length ? (
          <>
            {visibleRestaurants.map((restaurant) => (
              <RestaurantCard restaurant={restaurant} key={restaurant.id} showDistance={false} />
            ))}
            <ListPagination
              page={restaurantPage}
              pageSize={RESTAURANTS_PER_PAGE}
              total={restaurantCount}
              onPageChange={(page) => setRestaurantPageState({ addressId, page })}
            />
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Chưa có nhà hàng đang mở</Text>
            <Text style={styles.emptyCopy}>Hãy quay lại sau để xem thêm lựa chọn.</Text>
          </View>
        )}
      </View>

    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 22, paddingTop: 8 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  locationSection: { flex: 1, gap: 6 },
  locationEyebrow: { color: colors.muted, fontSize: 9, letterSpacing: 1.1, fontWeight: '800' },
  locationButton: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, paddingVertical: 9, borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: colors.surface },
  locationButtonPressed: { backgroundColor: '#F1F3EF', borderColor: '#C9D4CC' },
  locationIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: colors.accentSoft },
  locationIconText: { color: colors.accent, fontSize: 21, fontWeight: '700' },
  locationCopy: { flex: 1, gap: 4 },
  locationName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  locationAddress: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  locationChevronWrap: { width: 27, height: 27, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#F4F4F0' },
  locationChevron: { marginTop: -3, color: colors.accent, fontSize: 18, fontWeight: '700' },
  editorialCard: { minHeight: 190, flexDirection: 'row', overflow: 'hidden', padding: 0, borderColor: '#E8E4D8', backgroundColor: '#EFEEE5' },
  editorialCopy: { flex: 1.05, justifyContent: 'center', padding: 18 },
  editorialEyebrow: { color: colors.accent, fontSize: 9, letterSpacing: 1.2, fontWeight: '800' },
  editorialTitle: { marginTop: 9, color: colors.ink, fontSize: 26, lineHeight: 29, fontWeight: '700', letterSpacing: -0.7 },
  editorialBody: { maxWidth: 175, marginTop: 8, color: colors.muted, fontSize: 11, lineHeight: 16 },
  editorialLink: { alignSelf: 'flex-start', marginTop: 14 },
  editorialLinkText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  editorialImage: { flex: 0.95, height: 190, backgroundColor: '#D4D0C4' },
  categorySection: { gap: 13 },
  categoryRow: { gap: 17, paddingRight: 8 },
  categoryItem: { minWidth: 61, alignItems: 'center', gap: 8 },
  categoryIcon: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: '#EEEFE9' },
  categorySymbol: { color: colors.accent, fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  categoryLabel: { color: colors.ink, fontSize: 11, fontWeight: '600' },
  restaurantsSection: { gap: 13 },
  empty: { alignItems: 'center', paddingVertical: 34, gap: 7 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  emptyCopy: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
