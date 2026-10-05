import { StyleSheet, Text, View } from 'react-native';

import { AppButton, Page, ScreenHeader, Surface, showNotice } from '@/components/ui';
import { formatCurrency } from '@/data/demo';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function VoucherScreen() {
  const { selectedVoucherCode, selectVoucher, vouchers, isLoading } = usePrototype();

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Ưu đãi"
        subtitle="Ưu đãi đang khả dụng từ máy chủ."
        onBack={() => goBackOrReplace('/account')}
      />
      {isLoading ? <Text style={styles.noteText}>Đang tải ưu đãi...</Text> : null}
      {vouchers.map((voucher, index) => {
        const selected = voucher.code === selectedVoucherCode;
        return (
          <Surface key={voucher.code} style={styles.voucherCard}>
            <View style={styles.card}>
              <View style={[styles.ticket, index === 1 ? styles.ticketSand : null]}>
                <Text style={[styles.discount, index === 1 ? styles.discountSand : null]}>{formatCurrency(voucher.discount)}</Text>
                <Text style={styles.discountCaption}>GIẢM GIÁ</Text>
              </View>
              <View style={styles.cardCopy}>
                <View style={styles.codeRow}>
                  <Text style={styles.code}>{voucher.code}</Text>
                  {selected ? <Text style={styles.selectedTag}>ĐÃ ÁP DỤNG</Text> : null}
                  {voucher.usedByCustomer ? <Text style={styles.usedTag}>ĐÃ DÙNG</Text> : null}
                </View>
                <Text style={styles.description}>Đơn tối thiểu {formatCurrency(voucher.minimum)}</Text>
                <Text style={styles.usage}>Đã có {voucher.uniqueCustomerCount} tài khoản áp dụng</Text>
                <Text style={styles.expiry}>Có hiệu lực đến {voucher.expiry}</Text>
              </View>
            </View>
            <AppButton
              label={
                voucher.usedByCustomer
                  ? 'Bạn đã sử dụng voucher này'
                  : selected
                    ? 'Bỏ áp dụng'
                    : 'Áp dụng'
              }
              variant={selected ? 'quiet' : 'primary'}
              disabled={voucher.usedByCustomer || isLoading}
              onPress={() => {
                if (selected) {
                  selectVoucher('');
                  showNotice('Đã bỏ voucher', 'Mã ưu đãi đã được gỡ khỏi giỏ hàng hiện tại.');
                  return;
                }
                selectVoucher(voucher.code);
                showNotice('Đã áp dụng voucher', `${voucher.code} sẽ được kiểm tra lại khi bạn đặt hàng.`);
              }}
            />
          </Surface>
        );
      })}
      <View style={styles.note}>
        <Text style={styles.noteTitle}>Lưu ý</Text>
        <Text style={styles.noteText}>Mỗi tài khoản chỉ được dùng từng voucher một lần. Voucher được áp dụng vào giỏ hàng hiện tại; máy chủ xác nhận điều kiện khi báo giá và đặt hàng.</Text>
      </View>
      {vouchers.length === 0 && !isLoading ? (
        <View style={styles.note}><Text style={styles.noteText}>Hiện chưa có ưu đãi khả dụng.</Text></View>
      ) : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13 },
  voucherCard: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13 },
  ticket: { width: 72, height: 68, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.accentSoft },
  ticketSand: { backgroundColor: colors.amberSoft },
  discount: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  discountSand: { color: colors.amber },
  discountCaption: { marginTop: 3, color: colors.muted, fontSize: 7, letterSpacing: 0.8, fontWeight: '800' },
  cardCopy: { flex: 1, gap: 5 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  code: { color: colors.ink, fontSize: 14, fontWeight: '800', letterSpacing: 0.4 },
  selectedTag: { color: colors.accent, fontSize: 8, fontWeight: '800' },
  usedTag: { color: colors.rose, fontSize: 8, fontWeight: '800' },
  description: { color: colors.muted, fontSize: 11 },
  usage: { color: colors.muted, fontSize: 10, fontWeight: '600' },
  expiry: { color: colors.subtle, fontSize: 9 },
  note: { gap: 6, padding: 14, borderRadius: 14, backgroundColor: '#EFEFEA' },
  noteTitle: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  noteText: { color: colors.muted, fontSize: 11, lineHeight: 17 },
});
