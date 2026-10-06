import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

export function ListPagination({
  page,
  pageSize,
  total,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <View style={styles.container}>
      <Text style={styles.summary}>{start}–{end} / {total}</Text>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trang trước"
          disabled={page <= 1}
          onPress={() => onPageChange(page - 1)}
          style={[styles.button, page <= 1 ? styles.disabled : null]}
        >
          <Text style={styles.buttonText}>Trước</Text>
        </Pressable>
        <Text style={styles.pageLabel}>{page} / {pageCount}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Trang sau"
          disabled={page >= pageCount}
          onPress={() => onPageChange(page + 1)}
          style={[styles.button, page >= pageCount ? styles.disabled : null]}
        >
          <Text style={styles.buttonText}>Sau</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  summary: { color: colors.muted, fontSize: 11 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  button: { minWidth: 58, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 10 },
  buttonText: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pageLabel: { color: colors.ink, fontSize: 11, fontWeight: '700' },
});
