import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton, Page, ScreenHeader, Surface } from '@/components/ui';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function CheckoutAddressScreen() {
  const { addresses, selectedAddressId, selectAddress, isLoading } = usePrototype();

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Địa chỉ giao hàng"
        subtitle="Chọn nơi bạn muốn nhận đơn."
        onBack={() => goBackOrReplace('/cart')}
      />
      {isLoading ? <Text style={styles.emptyText}>Đang tải địa chỉ đã lưu...</Text> : null}
      <View style={styles.addressList}>
        {addresses.map((address) => {
          const selected = selectedAddressId === address.id;
          return (
            <Pressable
              key={address.id}
              onPress={() => selectAddress(address.id)}
              style={({ pressed }) => [pressed ? styles.pressed : null]}
            >
              <Surface style={[styles.addressCard, selected ? styles.addressSelected : null]}>
                <View style={styles.addressCardTop}>
                  <View style={[styles.radio, selected ? styles.radioSelected : null]}>
                    {selected ? <View style={styles.radioDot} /> : null}
                  </View>
                  <View style={styles.addressCopy}>
                    <View style={styles.addressTitleRow}>
                      <Text style={styles.addressName}>{address.name}</Text>
                      {address.isDefault ? <Text style={styles.defaultTag}>MẶC ĐỊNH</Text> : null}
                    </View>
                    <Text style={styles.receiver}>{address.receiver} · {address.phone}</Text>
                    <Text style={styles.addressText}>{address.address}</Text>
                    {address.note ? <Text style={styles.note}>Ghi chú: {address.note}</Text> : null}
                  </View>
                </View>
                <Pressable
                  onPress={() => router.push({ pathname: '/profile/addresses/[addressId]', params: { addressId: address.id } })}
                  style={styles.editLink}
                >
                  <Text style={styles.editLabel}>Chỉnh sửa</Text>
                </Pressable>
              </Surface>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => router.push('/profile/addresses/new')} style={styles.addAddress}>
        <Text style={styles.addMark}>＋</Text>
        <Text style={styles.addLabel}>Thêm địa chỉ mới</Text>
      </Pressable>
      {addresses.length === 0 && !isLoading ? (
        <View style={styles.empty}><Text style={styles.emptyText}>Bạn chưa lưu địa chỉ nào.</Text></View>
      ) : null}
      <View style={styles.bottom}>
        <AppButton
          label="Tiếp tục"
          onPress={() => router.push('/checkout')}
          disabled={!selectedAddressId || addresses.length === 0}
        />
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 15 },
  addressList: { gap: 11 },
  pressed: { opacity: 0.88 },
  addressCard: { gap: 14 },
  addressSelected: { borderColor: colors.accent, borderWidth: 1.5 },
  addressCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  radio: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginTop: 1, borderWidth: 1.5, borderColor: '#C9C9C0', borderRadius: 10 },
  radioSelected: { borderColor: colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent },
  addressCopy: { flex: 1, gap: 6 },
  addressTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  addressName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  defaultTag: { color: colors.accent, fontSize: 8, letterSpacing: 0.6, fontWeight: '800' },
  receiver: { color: colors.ink, fontSize: 12, fontWeight: '500' },
  addressText: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  note: { color: colors.muted, fontSize: 11, fontStyle: 'italic' },
  editLink: { alignSelf: 'flex-end' },
  editLabel: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  addAddress: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1, borderStyle: 'dashed', borderColor: '#BBC9BE', borderRadius: 14 },
  addMark: { color: colors.accent, fontSize: 20 },
  addLabel: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 16 },
  emptyText: { color: colors.muted, fontSize: 13 },
  bottom: { marginTop: 'auto', paddingTop: 10 },
});
