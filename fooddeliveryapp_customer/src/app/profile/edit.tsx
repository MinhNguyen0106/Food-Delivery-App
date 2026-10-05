import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { DatePickerField } from '@/components/DatePickerField';
import { AppButton, FormField, Page, ScreenHeader, showNotice } from '@/components/ui';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function EditProfileScreen() {
  const { profile, updateProfile } = usePrototype();
  const [fullName, setFullName] = useState(profile.fullName);
  const [email, setEmail] = useState(profile.email);
  const [phone, setPhone] = useState(profile.phone);
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth);
  const [error, setError] = useState('');

  async function save() {
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError('Vui lòng điền họ tên, email và số điện thoại.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Vui lòng nhập email hợp lệ.');
      return;
    }
    const saved = await updateProfile({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      dateOfBirth: dateOfBirth.trim(),
    });
    if (saved) {
      showNotice('Đã lưu thay đổi', 'Thông tin hồ sơ đã được cập nhật.');
      goBackOrReplace('/account');
    }
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Thông tin cá nhân"
        subtitle="Cập nhật cách chúng tôi liên hệ với bạn."
        onBack={() => goBackOrReplace('/account')}
      />
      <Text style={styles.initials}>{profile.fullName.slice(0, 1)}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Họ và tên" value={fullName} onChangeText={setFullName} placeholder="Tên của bạn" autoCapitalize="words" />
      <FormField label="Email" value={email} onChangeText={setEmail} placeholder="ban@example.com" keyboardType="email-address" autoCapitalize="none" />
      <FormField label="Số điện thoại" value={phone} onChangeText={setPhone} placeholder="Số liên hệ" keyboardType="phone-pad" />
      <DatePickerField value={dateOfBirth} onChange={setDateOfBirth} />
      <Text style={styles.note}>Thông tin được cập nhật vào hồ sơ tài khoản của bạn.</Text>
      <AppButton label="Lưu thay đổi" onPress={() => { void save(); }} />
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 15 },
  initials: { width: 64, height: 64, overflow: 'hidden', alignSelf: 'center', borderRadius: 23, backgroundColor: '#E5EAE5', color: colors.accent, fontSize: 28, lineHeight: 64, textAlign: 'center', fontWeight: '700' },
  error: { padding: 10, borderRadius: 10, backgroundColor: colors.roseSoft, color: colors.rose, fontSize: 12 },
  note: { color: colors.muted, fontSize: 10, lineHeight: 16 },
});
