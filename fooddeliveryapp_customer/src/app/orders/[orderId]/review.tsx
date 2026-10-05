import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, FormField, Page, ScreenHeader, Surface, showNotice } from '@/components/ui';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function WriteReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { orders, addReview, refreshOrder, isLoading } = usePrototype();
  const order = orders.find((item) => item.id === orderId);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const requestedOrderId = useRef('');
  useEffect(() => {
    if (!orderId || requestedOrderId.current === orderId) return;
    requestedOrderId.current = orderId;
    void refreshOrder(orderId);
  }, [orderId, refreshOrder]);

  async function submit() {
    if (!order || order.status !== 'COMPLETED' || order.reviewed) {
      showNotice('Chưa thể gửi đánh giá', 'Chỉ đơn đã hoàn tất và chưa được đánh giá mới đủ điều kiện.');
      return;
    }
    if (await addReview(order.id, rating, comment.trim())) {
      showNotice('Cảm ơn bạn', 'Đánh giá đã được gửi để kiểm duyệt.');
      router.replace('/reviews');
    }
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Đánh giá đơn hàng"
        subtitle={`Đơn #${orderId ?? ''}`}
        onBack={() =>
          goBackOrReplace({
            pathname: '/orders/[orderId]',
            params: { orderId: orderId ?? '' },
          })
        }
      />
      <Surface style={styles.restaurantCard}>
        <View style={styles.monogram}><Text style={styles.monogramText}>{(order?.restaurantName || 'N').slice(0, 1)}</Text></View>
        <View style={styles.restaurantCopy}><Text style={styles.restaurantName}>{order?.restaurantName || 'Nhà hàng'}</Text><Text style={styles.detail}>Chia sẻ trải nghiệm về đơn hàng của bạn.</Text></View>
      </Surface>
      {order?.status !== 'COMPLETED' ? <Text style={styles.warning}>Bạn chỉ có thể đánh giá sau khi đơn hàng hoàn tất.</Text> : null}
      {order?.reviewed ? <Text style={styles.warning}>Đơn hàng này đã được đánh giá.</Text> : null}
      <Surface style={styles.ratingCard}>
        <Text style={styles.prompt}>Bữa ăn này thế nào?</Text>
        <View style={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(star)} accessibilityLabel={`${star} sao`} accessibilityRole="button">
              <Text style={[styles.star, star <= rating ? styles.starActive : null]}>★</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.ratingLabel}>{['', 'Chưa hài lòng', 'Tạm ổn', 'Bình thường', 'Rất tốt', 'Tuyệt vời'][rating]}</Text>
      </Surface>
      <FormField
        label="Nhận xét (không bắt buộc)"
        value={comment}
        onChangeText={(value) => setComment(value.slice(0, 1000))}
        placeholder="Điều gì khiến bạn hài lòng về đơn hàng?"
        multiline
        maxLength={1000}
      />
      <Text style={styles.counter}>{comment.length}/1000</Text>
      <AppButton label="Gửi đánh giá" onPress={submit} disabled={isLoading || !order || order.status !== 'COMPLETED' || order.reviewed} />
      <Text style={styles.disclaimer}>Đánh giá của bạn sẽ được gửi để kiểm duyệt trước khi hiển thị.</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 15 },
  restaurantCard: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  monogram: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.accentSoft },
  monogramText: { color: colors.accent, fontSize: 17, fontWeight: '700' },
  restaurantCopy: { flex: 1, gap: 4 },
  restaurantName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: 11 },
  warning: { padding: 11, borderRadius: 11, backgroundColor: colors.amberSoft, color: colors.amber, fontSize: 12, lineHeight: 17 },
  ratingCard: { alignItems: 'center', gap: 9, paddingVertical: 21 },
  prompt: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  stars: { flexDirection: 'row', gap: 8, paddingTop: 3 },
  star: { color: '#D7D7D0', fontSize: 34 },
  starActive: { color: '#D1A250' },
  ratingLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  counter: { alignSelf: 'flex-end', marginTop: -10, color: colors.subtle, fontSize: 10 },
  disclaimer: { color: colors.subtle, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
