import { useCallback, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, BottomAction, Page, RequestState, showConfirmation, showNotice, StatusPill } from '@/components/ui';
import { QuantityControl } from '@/components/commerce';
import { useApiResource } from '@/hooks/useApiResource';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { useSession } from '@/providers/SessionProvider';
import { getFood, getRestaurant } from '@/services/api/catalog';
import { colors } from '@/theme';

export default function FoodDetailScreen() {
  const { cart, addToCart } = usePrototype();
  const { foodId: foodIdParam } = useLocalSearchParams<{ foodId: string }>();
  const { token } = useSession();
  const foodId = Number(foodIdParam);
  const [isAdding, setIsAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const loadFood = useCallback(async () => {
    if (!token) {
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    if (!Number.isSafeInteger(foodId) || foodId < 1) {
      throw new Error('Mã món ăn không hợp lệ.');
    }
    const food = await getFood(token, foodId);
    const restaurant = await getRestaurant(token, food.restaurantId);
    return { food, restaurant };
  }, [foodId, token]);
  const { data, error, isLoading, retry } = useApiResource(loadFood);

  if (isLoading) {
    return (
      <Page>
        <RequestState loading message="Đang tải thông tin món ăn..." />
      </Page>
    );
  }
  if (error || !data) {
    return (
      <Page>
        <RequestState message={error ?? 'Không tìm thấy món ăn.'} onRetry={retry} />
      </Page>
    );
  }

  const { food, restaurant } = data;

  async function addFood(replaceCart = false) {
    setIsAdding(true);
    try {
      if (await addToCart(food.id, quantity, replaceCart)) {
        showNotice('Đã thêm vào giỏ', `Đã thêm ${quantity} phần ${food.name} vào giỏ hàng.`);
      }
    } finally {
      setIsAdding(false);
    }
  }

  function handleAddToCart() {
    if (!restaurant.open) {
      showNotice('Nhà hàng đang đóng cửa', 'Bạn có thể xem thực đơn nhưng hiện chưa thể đặt món.');
      return;
    }
    const containsOtherRestaurant = cart.some((item) => item.food.restaurantId !== food.restaurantId);
    if (containsOtherRestaurant) {
      showConfirmation(
        'Thay giỏ hàng hiện tại?',
        'Giỏ hàng chỉ có thể chứa món từ một nhà hàng. Các món hiện tại sẽ bị xóa.',
        () => { void addFood(true); },
        'Thay giỏ hàng',
      );
      return;
    }
    void addFood();
  }

  return (
    <>
      <Page contentStyle={styles.content}>
        <View style={styles.hero}>
          <ImageBackground
            source={food.image ? { uri: food.image } : undefined}
            style={styles.heroImage}
          >
            <Pressable
              onPress={() =>
                goBackOrReplace({
                  pathname: '/restaurants/[restaurantId]',
                  params: { restaurantId: String(data.restaurant.id) },
                })
              }
              style={styles.backButton}
            >
              <Text style={styles.backGlyph}>‹</Text>
            </Pressable>
          </ImageBackground>
        </View>
        <View style={styles.restaurantRow}>
          <Text style={styles.category}>{food.category.toLocaleUpperCase('vi')}</Text>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/restaurants/[restaurantId]',
                params: { restaurantId: String(restaurant.id) },
              })
            }
          >
            <Text style={styles.restaurantLink}>{restaurant.name}  ›</Text>
          </Pressable>
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{food.name}</Text>
          <Text style={styles.price}>{Math.round(food.price).toLocaleString('vi-VN')}đ</Text>
        </View>
        {food.description ? <Text style={styles.description}>{food.description}</Text> : null}
        <StatusPill
          label={food.available ? restaurant.open ? 'Đang phục vụ' : 'Nhà hàng đang đóng' : 'Tạm hết món'}
          tone={food.available && restaurant.open ? 'green' : 'grey'}
        />
        <View style={styles.quantityRow}>
          <View>
            <Text style={styles.quantityTitle}>Số lượng</Text>
            <Text style={styles.quantityPrice}>
              Tạm tính · {Math.round(food.price * quantity).toLocaleString('vi-VN')}đ
            </Text>
          </View>
          <QuantityControl value={quantity} onChange={(value) => setQuantity(Math.max(1, value))} />
        </View>
        <View style={styles.rule} />
        <View style={styles.restaurantInfo}>
          <View style={styles.restaurantMonogram}>
            <Text style={styles.monogramText}>{restaurant.name.slice(0, 1)}</Text>
          </View>
          <View style={styles.restaurantInfoCopy}>
            <Text style={styles.restaurantName}>{restaurant.name}</Text>
            <Text style={styles.restaurantMeta}>
              {restaurant.address}
              {restaurant.rating > 0 ? ` · ★ ${restaurant.rating.toFixed(1)}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/restaurants/[restaurantId]',
                params: { restaurantId: String(restaurant.id) },
              })
            }
          >
            <Text style={styles.viewMenu}>Xem menu</Text>
          </Pressable>
        </View>
      </Page>
      <BottomAction>
        <AppButton
          label={isAdding ? 'Đang thêm...' : `Thêm ${quantity} phần · ${Math.round(food.price * quantity).toLocaleString('vi-VN')}đ`}
          disabled={isAdding || !food.available || !restaurant.open}
          onPress={handleAddToCart}
        />
      </BottomAction>
    </>
  );
}

const styles = StyleSheet.create({
  content: { gap: 17, paddingTop: 0 },
  hero: { height: 285, marginHorizontal: -20 },
  heroImage: { flex: 1, padding: 18, backgroundColor: '#E1DED5' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.94)' },
  backGlyph: { color: colors.ink, fontSize: 29, lineHeight: 32 },
  restaurantRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  category: { color: colors.accent, fontSize: 10, letterSpacing: 1, fontWeight: '800' },
  restaurantLink: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  title: { flex: 1, color: colors.ink, fontSize: 23, lineHeight: 29, fontWeight: '700', letterSpacing: -0.4 },
  price: { color: colors.accent, fontSize: 16, fontWeight: '700' },
  description: { color: colors.muted, fontSize: 14, lineHeight: 22 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  quantityTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  quantityPrice: { marginTop: 4, color: colors.muted, fontSize: 11 },
  rule: { height: 1, backgroundColor: colors.line },
  restaurantInfo: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  restaurantMonogram: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.accentSoft },
  monogramText: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  restaurantInfoCopy: { flex: 1, gap: 4 },
  restaurantName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  restaurantMeta: { color: colors.muted, fontSize: 11 },
  viewMenu: { color: colors.accent, fontSize: 12, fontWeight: '700' },
});
