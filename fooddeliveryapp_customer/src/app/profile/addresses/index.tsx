import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, Page, ScreenHeader, Surface, showConfirmation, showNotice } from '@/components/ui';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function AddressBookScreen() {
  const { addresses, setDefaultAddress, deleteAddress, isLoading } = usePrototype();

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Sổ địa chỉ"
        subtitle="Quản lý địa chỉ giao hàng đã lưu."
        onBack={() => goBackOrReplace('/account')}
      />
      {isLoading ? <Text style={styles.emptyCopy}>Đang tải địa chỉ đã lưu...</Text> : null}
      {addresses.length ? addresses.map((address) => (
        <Surface key={address.id} style={styles.card}>
          <View style={styles.cardHead}>
            <View style={styles.addressIcon}><Text style={styles.addressIconText}>{address.name === 'Nhà riêng' ? 'N' : 'V'}</Text></View>
            <View style={styles.cardCopy}>
              <View style={styles.titleRow}>
                <Text style={styles.name}>{address.name}</Text>
                {address.isDefault ? <Text style={styles.defaultLabel}>MẶC ĐỊNH</Text> : null}
              </View>
              <Text style={styles.receiver}>{address.receiver} · {address.phone}</Text>
              <Text style={styles.address}>{address.address}</Text>
              {address.note ? <Text style={styles.note}>{address.note}</Text> : null}
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable onPress={() => router.push({ pathname: '/profile/addresses/[addressId]', params: { addressId: address.id } })}>
              <Text style={styles.action}>Sửa địa chỉ</Text>
            </Pressable>
            <Text style={styles.separator}>·</Text>
            <Pressable
              onPress={async () => {
                if (await setDefaultAddress(address.id)) {
                  showNotice('Đã cập nhật', 'Địa chỉ mặc định đã được cập nhật.');
                }
              }}
            >
              <Text style={styles.action}>Đặt mặc định</Text>
            </Pressable>
            <Text style={styles.separator}>·</Text>
            <Pressable onPress={() => showConfirmation('Xóa địa chỉ?', 'Địa chỉ đang được đơn hàng sử dụng có thể không xóa được.', () => { void deleteAddress(address.id); }, 'Xóa')}>
              <Text style={styles.deleteAction}>Xóa</Text>
            </Pressable>
          </View>
        </Surface>
      )      ) : !isLoading ? (
        <View style={styles.empty}><Text style={styles.emptyTitle}>Chưa có địa chỉ</Text><Text style={styles.emptyCopy}>Thêm địa chỉ để chọn nhanh khi đặt món.</Text></View>
      ) : null}
      <AppButton label="＋  Thêm địa chỉ mới" variant="secondary" onPress={() => router.push('/profile/addresses/new')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 13 },
  card: { gap: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  addressIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: colors.accentSoft },
  addressIconText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  cardCopy: { flex: 1, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  defaultLabel: { color: colors.accent, fontSize: 8, fontWeight: '800', letterSpacing: 0.6 },
  receiver: { color: colors.ink, fontSize: 12 },
  address: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  note: { color: colors.muted, fontSize: 11, fontStyle: 'italic' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.line },
  action: { color: colors.accent, fontSize: 11, fontWeight: '700' },
  deleteAction: { color: colors.rose, fontSize: 11, fontWeight: '700' },
  separator: { color: colors.subtle, fontSize: 12 },
  empty: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  emptyCopy: { color: colors.muted, fontSize: 12 },
});
