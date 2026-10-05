import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppButton, FormField, Page, ScreenHeader, showNotice } from '@/components/ui';
import { utf8ByteLength } from '@/features/auth/validation';
import { goBackOrReplace } from '@/navigation/back';
import { usePrototype } from '@/providers/PrototypeProvider';
import { colors } from '@/theme';

export default function ChangePasswordScreen() {
  const { changePassword } = usePrototype();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const passwordBytes = utf8ByteLength(newPassword);
  const passwordLengthValid = passwordBytes >= 8 && passwordBytes <= 72;
  const confirmationMatches = confirmation.length > 0 && confirmation === newPassword;

  async function save() {
    if (!currentPassword || !passwordLengthValid || !confirmationMatches) {
      setError('Kiểm tra mật khẩu hiện tại, độ dài mật khẩu mới từ 8 đến 72 byte và phần xác nhận.');
      return;
    }
    if (await changePassword(currentPassword, newPassword)) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmation('');
      showNotice('Đã hoàn tất', 'Mật khẩu của bạn đã được cập nhật.');
      goBackOrReplace('/account');
    }
  }

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader
        title="Đổi mật khẩu"
        subtitle="Tạo mật khẩu mới để bảo vệ tài khoản."
        onBack={() => goBackOrReplace('/account')}
      />
      <Text style={styles.notice}>Mật khẩu hiện tại được xác minh bởi máy chủ trước khi cập nhật.</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FormField label="Mật khẩu hiện tại" value={currentPassword} onChangeText={setCurrentPassword} placeholder="Nhập mật khẩu hiện tại" secureTextEntry passwordToggle autoCapitalize="none" autoComplete="current-password" textContentType="password" />
      <FormField label="Mật khẩu mới" value={newPassword} onChangeText={(value) => { setNewPassword(value); setError(''); }} placeholder="Từ 8 đến 72 byte" secureTextEntry passwordToggle autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
      <View style={styles.passwordChecks}>
        <Text style={[styles.checkItem, passwordLengthValid ? styles.checkPassed : null]}>
          {passwordLengthValid ? '✓' : '○'} 8–72 byte UTF-8 ({passwordBytes}/72)
        </Text>
        <Text style={[styles.checkItem, confirmationMatches ? styles.checkPassed : null]}>
          {confirmationMatches ? '✓' : '○'} Xác nhận mật khẩu trùng khớp
        </Text>
      </View>
      <FormField label="Xác nhận mật khẩu mới" value={confirmation} onChangeText={(value) => { setConfirmation(value); setError(''); }} placeholder="Nhập lại mật khẩu mới" secureTextEntry passwordToggle autoCapitalize="none" autoComplete="new-password" textContentType="newPassword" />
      <Text style={styles.helper}>
        Bảo mật: hãy dùng mật khẩu riêng cho tài khoản Food Delivery, không tái sử dụng mật khẩu từ dịch vụ khác.
      </Text>
      <AppButton label="Cập nhật mật khẩu" onPress={() => void save()} />
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 15 },
  notice: { padding: 12, borderRadius: 12, backgroundColor: '#EEEFE9', color: colors.muted, fontSize: 12, lineHeight: 18 },
  error: { padding: 10, borderRadius: 10, backgroundColor: colors.roseSoft, color: colors.rose, fontSize: 12, lineHeight: 17 },
  helper: { color: colors.muted, fontSize: 11 },
  passwordChecks: { gap: 6 },
  checkItem: { color: colors.muted, fontSize: 11 },
  checkPassed: { color: colors.accent, fontWeight: '700' },
});
