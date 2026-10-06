import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ListPagination } from '@/components/ListPagination';
import { Page, ScreenHeader, StatusPill, Surface } from '@/components/ui';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

const REVIEWS_PER_PAGE = 6;

export default function MyReviewsScreen() {
  const { reviews, isLoading } = usePrototype();
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(reviews.length / REVIEWS_PER_PAGE));
  const currentPage = Math.min(page, pageCount);
  const visibleReviews = reviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE,
  );

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Đánh giá của tôi"
        subtitle="Những chia sẻ về trải nghiệm đặt món."
        onBack={() => goBackOrReplace('/account')}
      />
      {isLoading ? <Text style={styles.demoNote}>Đang tải đánh giá...</Text> : null}
      {reviews.length > 0 ? visibleReviews.map((review) => {
        return (
          <Surface key={review.id} style={styles.card}>
            <View style={styles.topRow}>
              <View style={styles.restaurantCopy}>
                <Text style={styles.restaurantName}>{review.restaurantName || `Đơn hàng #${review.orderId}`}</Text>
                <Text style={styles.date}>Đơn #{review.orderId} · {review.createdAt}</Text>
              </View>
              <StatusPill
                label={review.status === 'HIDDEN' ? 'ĐÃ ẨN' : 'ĐANG HIỂN THỊ'}
                tone={review.status === 'HIDDEN' ? 'sand' : 'green'}
              />
            </View>
            <Text style={styles.stars}>{'★'.repeat(review.rating)}<Text style={styles.starMuted}>{'★'.repeat(5 - review.rating)}</Text></Text>
            <Text style={styles.comment}>{review.comment || 'Không có nhận xét.'}</Text>
          </Surface>
        );
      }      ) : !isLoading ? (
        <View style={styles.empty}>
          <Text style={styles.emptyMark}>☆</Text>
          <Text style={styles.emptyTitle}>Chưa có đánh giá</Text>
          <Text style={styles.emptyCopy}>Sau khi đơn hàng hoàn tất, bạn có thể chia sẻ cảm nhận ở đây.</Text>
        </View>
      ) : null}
      <ListPagination
        page={currentPage}
        pageSize={REVIEWS_PER_PAGE}
        total={reviews.length}
        onPageChange={setPage}
      />
      <Text style={styles.demoNote}>Đánh giá mới hiển thị ngay. Quản trị viên chỉ ẩn nội dung vi phạm quy định cộng đồng.</Text>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13 },
  card: { gap: 11 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  restaurantCopy: { flex: 1, gap: 4 },
  restaurantName: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  date: { color: colors.muted, fontSize: 10 },
  stars: { color: '#D1A250', fontSize: 17, letterSpacing: 2 },
  starMuted: { color: '#D7D7D0' },
  comment: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  empty: { alignItems: 'center', paddingVertical: 51, gap: 9 },
  emptyMark: { color: colors.accent, fontSize: 39 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emptyCopy: { maxWidth: 270, color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  demoNote: { color: colors.subtle, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});
