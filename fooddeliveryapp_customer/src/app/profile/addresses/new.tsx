import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FormField, Page, ScreenHeader, showNotice } from '@/components/ui';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function AddressFormScreen() {
  const [name, setName] = useState('Nhà riêng');
  const [receiver, setReceiver] = useState('Nguyễn Minh Anh');
  const [phone, setPhone] = useState('090 123 4567');
  const [addressOverride, setAddressOverride] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState('');
  const { saveAddress, selectedMapLocation, setMapLocation } = usePrototype();
  const address = addressOverride ?? selectedMapLocation?.address ?? '';

  async function save() {
    if (!name.trim() || !receiver.trim() || !phone.trim() || !address.trim()) {
      setError('Vui lòng điền tên địa chỉ, người nhận, số điện thoại và địa chỉ đầy đủ.');
      return;
    }
    if (!/^\+?[\d\s-]{8,18}$/.test(phone.trim())) {
      setError('Vui lòng nhập số điện thoại hợp lệ.');
      return;
    }
    if (!selectedMapLocation) {
      setError('Hãy chọn vị trí giao hàng trên bản đồ trước khi lưu địa chỉ.');
      return;
    }
    const saved = await saveAddress({
      name: name.trim(),
      receiver: receiver.trim(),
      phone: phone.trim(),
      address: address.trim(),
      note: note.trim(),
      isDefault,
      latitude: selectedMapLocation.latitude,
      longitude: selectedMapLocation.longitude,
    });
    if (saved) {
      setMapLocation(null);
      goBackOrReplace('/profile/addresses');
      showNotice('Đã lưu địa chỉ', 'Địa chỉ đã được lưu vào tài khoản của bạn.');
    }
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Thêm địa chỉ"
        subtitle="Thông tin người nhận và vị trí giao hàng."
        onBack={() => goBackOrReplace('/profile/addresses')}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Tên gợi nhớ" value={name} onChangeText={setName} placeholder="Nhà riêng, Văn phòng…" />
      <View style={styles.formRow}>
        <FormField label="Người nhận" value={receiver} onChangeText={setReceiver} placeholder="Họ và tên" style={styles.flexField} />
        <FormField label="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="Số liên hệ" keyboardType="phone-pad" style={styles.flexField} />
      </View>
      <FormField label="Địa chỉ đầy đủ" value={address} onChangeText={setAddressOverride} placeholder="Số nhà, đường, phường, quận, thành phố" multiline />
      <Pressable onPress={() => router.push('/profile/addresses/map-picker')} style={styles.mapLink}>
        <Text style={styles.mapGlyph}>⌖</Text>
        <View style={styles.mapCopy}>
          <Text style={styles.mapTitle}>Chọn vị trí trên bản đồ</Text>
          <Text style={styles.mapDescription}>Định vị giúp người giao hàng tìm bạn dễ hơn.</Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
      <FormField label="Ghi chú giao hàng (không bắt buộc)" value={note} onChangeText={setNote} placeholder="Ví dụ: gọi trước khi đến" multiline />
      <Pressable onPress={() => setIsDefault((value) => !value)} style={styles.defaultToggle}>
        <View style={[styles.checkbox, isDefault ? styles.checkboxSelected : null]}>{isDefault ? <Text style={styles.check}>✓</Text> : null}</View>
        <Text style={styles.defaultText}>Đặt làm địa chỉ mặc định</Text>
      </Pressable>
      <Pressable onPress={save} style={styles.saveButton}>
        <Text style={styles.saveLabel}>Lưu địa chỉ</Text>
      </Pressable>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 15 },
  error: { padding: 11, borderRadius: 10, backgroundColor: colors.roseSoft, color: colors.rose, fontSize: 12, lineHeight: 18 },
  formRow: { flexDirection: 'row', gap: 10 },
  flexField: { flex: 1 },
  mapLink: { minHeight: 67, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.surface },
  mapGlyph: { color: colors.accent, fontSize: 23 },
  mapCopy: { flex: 1, gap: 4 },
  mapTitle: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  mapDescription: { color: colors.muted, fontSize: 10 },
  chevron: { color: colors.subtle, fontSize: 24 },
  defaultToggle: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkbox: { width: 19, height: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C9C9C0', borderRadius: 5 },
  checkboxSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  check: { color: colors.surface, fontSize: 13, fontWeight: '800' },
  defaultText: { color: colors.ink, fontSize: 13 },
  saveButton: { minHeight: 51, alignItems: 'center', justifyContent: 'center', marginTop: 6, borderRadius: 14, backgroundColor: colors.accent },
  saveLabel: { color: colors.surface, fontSize: 14, fontWeight: '700' },
});
