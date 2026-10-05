import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField, Page, RequestState, ScreenHeader, showConfirmation } from '@/components/ui';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function EditAddressScreen() {
  const { addressId } = useLocalSearchParams<{ addressId: string }>();
  const { addresses, saveAddress, deleteAddress, selectedMapLocation, setMapLocation, isLoading } = usePrototype();
  const address = addresses.find((item) => item.id === addressId);
  const [name, setName] = useState(address?.name ?? '');
  const [receiver, setReceiver] = useState(address?.receiver ?? '');
  const [phone, setPhone] = useState(address?.phone ?? '');
  const [addressOverride, setAddressOverride] = useState<string | null>(null);
  const [note, setNote] = useState(address?.note ?? '');
  const [isDefault, setIsDefault] = useState(address?.isDefault ?? false);

  if (!address) {
    return (
      <Page>
        {isLoading
          ? <RequestState loading message="Đang tải địa chỉ..." />
          : <>
              <ScreenHeader title="Địa chỉ không tồn tại" onBack={() => goBackOrReplace('/profile/addresses')} />
              <Text style={styles.notFound}>Địa chỉ không tồn tại hoặc không thuộc tài khoản của bạn.</Text>
            </>}
      </Page>
    );
  }

  const currentAddress = address;
  const fullAddress = addressOverride ?? selectedMapLocation?.address ?? currentAddress.address;

  async function save() {
    if (!name.trim() || !receiver.trim() || !phone.trim() || !fullAddress.trim()) return;
    const saved = await saveAddress(
      {
        name: name.trim(),
        receiver: receiver.trim(),
        phone: phone.trim(),
        address: fullAddress.trim(),
        note: note.trim(),
        isDefault,
        latitude: selectedMapLocation?.latitude ?? currentAddress.latitude,
        longitude: selectedMapLocation?.longitude ?? currentAddress.longitude,
      },
      currentAddress.id,
    );
    if (saved) {
      setMapLocation(null);
      goBackOrReplace('/profile/addresses');
    }
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Chỉnh sửa địa chỉ"
        subtitle="Cập nhật thông tin giao hàng."
        onBack={() => goBackOrReplace('/profile/addresses')}
      />
      <FormField label="Tên gợi nhớ" value={name} onChangeText={setName} placeholder="Nhà riêng, Văn phòng…" />
      <FormField label="Người nhận" value={receiver} onChangeText={setReceiver} placeholder="Họ và tên" />
      <FormField label="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="Số liên hệ" keyboardType="phone-pad" />
      <FormField label="Địa chỉ đầy đủ" value={fullAddress} onChangeText={setAddressOverride} placeholder="Số nhà, đường, phường, quận" multiline />
      <Pressable onPress={() => router.push({ pathname: '/profile/addresses/map-picker', params: { addressId: currentAddress.id } })} style={styles.mapLink}>
        <Text style={styles.mapTitle}>⌖  Chỉnh vị trí trên bản đồ</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <FormField label="Ghi chú giao hàng" value={note} onChangeText={setNote} placeholder="Không bắt buộc" multiline />
      <Pressable onPress={() => setIsDefault((value) => !value)} style={styles.defaultToggle}>
        <View style={[styles.checkbox, isDefault ? styles.checkboxSelected : null]}>{isDefault ? <Text style={styles.check}>✓</Text> : null}</View>
        <Text style={styles.defaultText}>Đặt làm địa chỉ mặc định</Text>
      </Pressable>
      <Pressable onPress={save} style={styles.saveButton}><Text style={styles.saveLabel}>Lưu thay đổi</Text></Pressable>
      <Pressable onPress={() => showConfirmation('Xóa địa chỉ?', 'Địa chỉ sẽ bị xóa khỏi sổ địa chỉ của bạn. Địa chỉ đang được đơn hàng sử dụng có thể không xóa được.', () => {
        void deleteAddress(currentAddress.id).then((deleted) => {
          if (deleted) goBackOrReplace('/profile/addresses');
        });
      }, 'Xóa địa chỉ')} style={styles.deleteButton}>
        <Text style={styles.deleteLabel}>Xóa địa chỉ</Text>
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 15 },
  notFound: { color: colors.muted, fontSize: 13 },
  mapLink: { minHeight: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  mapTitle: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  chevron: { color: colors.subtle, fontSize: 23 },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 19, height: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C9C9C0', borderRadius: 5 },
  checkboxSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  check: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  defaultText: { color: colors.ink, fontSize: 13 },
  saveButton: { minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: colors.accent },
  saveLabel: { color: colors.surface, fontSize: 14, fontWeight: '700' },
  deleteButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  deleteLabel: { color: colors.rose, fontSize: 13, fontWeight: '700' },
});
