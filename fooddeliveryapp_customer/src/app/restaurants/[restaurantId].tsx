import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ImageBackground, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { FoodRow } from '@/components/commerce';
import { Chip, Page, RequestState, showNotice } from '@/components/ui';
import { useApiResource } from '@/hooks/useApiResource';
import { goBackOrReplace } from '@/navigation/back';
import { useSession } from '@/providers/SessionProvider';
import {
  getRestaurant,
  listFoods,
  listRestaurantCategories,
} from '@/services/api/catalog';
import { colors } from '@/theme';

export default function RestaurantScreen() {
  const { restaurantId: restaurantIdParam } = useLocalSearchParams<{ restaurantId: string }>();
  const { token } = useSession();
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const restaurantId = Number(restaurantIdParam);

  const loadRestaurant = useCallback(async () => {
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    if (!Number.isSafeInteger(restaurantId) || restaurantId < 1) {
      throw new Error('Mã nhà hàng không hợp lệ.');
    }
    const [restaurant, categories, foods] = await Promise.all([
      getRestaurant(token, restaurantId),
      listRestaurantCategories(token, restaurantId),
      listFoods(token, { restaurantId }),
    ]);
    return { restaurant, categories, foods };
  }, [restaurantId, token]);
  const { data, error, isLoading, retry } = useApiResource(loadRestaurant);

  if (isLoading) {
    return (
      <Page>
        <RequestState loading message="Đang tải thông tin nhà hàng..." />
      </Page>
    );
  }
  if (error || !data) {
    return (
      <Page>
        <RequestState message={error ?? 'Không tìm thấy nhà hàng.'} onRetry={retry} />
      </Page>
    );
  }

  const { restaurant, categories, foods } = data;
  const menu = foods.filter(
    (food) =>
      food.available &&
      (categoryId === undefined || food.categoryId === categoryId),
  );

  async function callRestaurant() {
    if (!restaurant.phone) return;
    try {
      const phoneUrl = `tel:${restaurant.phone}`;
      if (!(await Linking.canOpenURL(phoneUrl))) {
        showNotice('Không thể gọi', 'Thiết bị hiện tại không hỗ trợ thực hiện cuộc gọi.');
        return;
      }
      await Linking.openURL(phoneUrl);
    } catch {
      showNotice('Không thể gọi', 'Vui lòng thử lại hoặc gọi trực tiếp theo số điện thoại nhà hàng.');
    }
  }

  return (
    <Page contentStyle={styles.content}>
      <View style={styles.coverWrap}>
        <ImageBackground
          source={restaurant.image ? { uri: restaurant.image } : undefined}
          style={styles.cover}
        >
          <Pressable onPress={() => goBackOrReplace('/home')} style={styles.backButton}>
            <Text style={styles.backGlyph}>‹</Text>
          </Pressable>
          <View style={styles.coverBottom}>
            <Text style={styles.coverEyebrow}>NHÀ HÀNG</Text>
            <Text style={styles.coverTitle}>{restaurant.name}</Text>
          </View>
        </ImageBackground>
      </View>
      <View style={styles.restaurantMeta}>
        <Text style={styles.address} numberOfLines={2}>{restaurant.address}</Text>
        <Text style={styles.rating}>
          {restaurant.rating > 0 ? `★ ${restaurant.rating.toFixed(1)}` : 'Chưa có đánh giá'}
        </Text>
      </View>
      {restaurant.phone ? (
        <Pressable
          onPress={() => void callRestaurant()}
          accessibilityRole="button"
          accessibilityLabel={`Gọi nhà hàng ${restaurant.name}`}
          style={styles.phoneAction}
        >
          <Text style={styles.phoneActionLabel}>☎  Gọi nhà hàng</Text>
          <Text style={styles.phoneNumber}>{restaurant.phone}</Text>
        </Pressable>
      ) : null}
      {restaurant.description ? (
        <Text style={styles.description}>{restaurant.description}</Text>
      ) : null}
      <View style={styles.infoStrip}>
        <Text style={styles.infoValue}>{restaurant.open ? 'Đang mở cửa' : 'Đã đóng cửa'}</Text>
        {restaurant.openAt ? (
          <Text style={styles.infoLabel}>{restaurant.openAt}</Text>
        ) : null}
      </View>
      {!restaurant.open ? (
        <View style={styles.closedNotice}>
          <Text style={styles.closedNoticeText}>
            Nhà hàng đang đóng cửa. Bạn có thể xem thực đơn.
          </Text>
        </View>
      ) : null}
      <View style={styles.menuHead}>
        <Text style={styles.menuTitle}>Thực đơn</Text>
        <Text style={styles.menuSubtitle}>Món ăn hiện có tại nhà hàng</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>
        <Chip
          label="Tất cả"
          selected={categoryId === undefined}
          onPress={() => setCategoryId(undefined)}
        />
        {categories.map((category) => (
          <Chip
            key={category.id}
            label={category.name}
            selected={categoryId === category.id}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </ScrollView>
      {menu.length ? (
        <View style={styles.foodList}>
          {menu.map((food) => (
            <FoodRow
              key={food.id}
              food={food}
              onPress={() =>
                router.push({ pathname: '/foods/[foodId]', params: { foodId: String(food.id) } })
              }
            />
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Chưa có món phù hợp</Text>
          <Text style={styles.emptyCopy}>Thử chọn danh mục khác trong thực đơn.</Text>
        </View>
      )}
      <Text style={styles.integrationNote}>
        Chọn món để xem chi tiết và thêm vào giỏ hàng.
      </Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 14, paddingHorizontal: 0, paddingTop: 0 },
  coverWrap: { height: 234 },
  cover: { flex: 1, justifyContent: 'space-between', padding: 17, backgroundColor: '#D9D6CC' },
  backButton: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.92)' },
  backGlyph: { color: colors.ink, fontSize: 28, lineHeight: 30 },
  coverBottom: { gap: 5 },
  coverEyebrow: { color: '#FFFFFF', fontSize: 9, letterSpacing: 1.3, fontWeight: '800' },
  coverTitle: { color: '#FFFFFF', fontSize: 29, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 7, textShadowOffset: { width: 0, height: 1 } },
  restaurantMeta: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, gap: 8 },
  address: { flex: 1, color: colors.muted, fontSize: 12 },
  rating: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  phoneAction: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 20, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.accentSoft },
  phoneActionLabel: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  phoneNumber: { color: colors.ink, fontSize: 12, fontWeight: '600' },
  description: { paddingHorizontal: 20, color: colors.muted, fontSize: 13, lineHeight: 20 },
  infoStrip: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 20, paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  infoValue: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  infoLabel: { color: colors.muted, fontSize: 11 },
  closedNotice: { marginHorizontal: 20, padding: 12, borderRadius: 12, backgroundColor: colors.amberSoft },
  closedNoticeText: { color: colors.amber, fontSize: 12, lineHeight: 18 },
  menuHead: { paddingHorizontal: 20, gap: 4, paddingTop: 4 },
  menuTitle: { color: colors.ink, fontSize: 21, fontWeight: '700' },
  menuSubtitle: { color: colors.muted, fontSize: 12 },
  categories: { gap: 8, paddingHorizontal: 20 },
  foodList: { paddingHorizontal: 20 },
  empty: { alignItems: 'center', paddingVertical: 30, gap: 7 },
  emptyTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  emptyCopy: { color: colors.muted, fontSize: 12 },
  integrationNote: { paddingHorizontal: 20, color: colors.subtle, fontSize: 10, textAlign: 'center' },
});
