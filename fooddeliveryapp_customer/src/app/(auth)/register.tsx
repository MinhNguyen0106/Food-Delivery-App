import { useState } from 'react';
import { Link, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth/AuthButton';
import { AuthField } from '@/components/auth/AuthField';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { DatePickerField } from '@/components/DatePickerField';
import { type RegisterErrors, validateRegistration } from '@/features/auth/validation';
import { getErrorMessage } from '@/services/api/client';
import { register } from '@/services/api/auth';
import type { RegisterInput } from '@/types/auth';

const initialInput: RegisterInput = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
};

export default function RegisterScreen() {
  const [input, setInput] = useState<RegisterInput>(initialInput);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof RegisterInput>(field: K, value: RegisterInput[K]) {
    setInput((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError('');
  }

  async function handleRegister() {
    const normalizedInput: RegisterInput = {
      ...input,
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      phone: input.phone.trim(),
      dateOfBirth: input.dateOfBirth?.trim() || undefined,
    };
    const validationErrors = validateRegistration(normalizedInput, confirmPassword);
    setErrors(validationErrors);
    setRequestError('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(normalizedInput);
      router.replace({
        pathname: '/login',
        params: { email: normalizedInput.email, registered: '1' },
      });
    } catch (error) {
      setRequestError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Bắt đầu đặt món"
      title="Tạo tài khoản"
      subtitle="Điền thông tin để tạo tài khoản khách hàng."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Đã có tài khoản? </Text>
          <Link href="/login" style={styles.link}>
            Đăng nhập
          </Link>
        </View>
      }
    >
      {requestError ? <Text accessibilityRole="alert" style={styles.errorNotice}>{requestError}</Text> : null}
      <AuthField
        label="Họ và tên"
        value={input.fullName}
        onChangeText={(value) => updateField('fullName', value)}
        placeholder="Nguyễn Văn An"
        autoComplete="name"
        textContentType="name"
        autoCapitalize="words"
        returnKeyType="next"
        error={errors.fullName}
      />
      <AuthField
        label="Email"
        value={input.email}
        onChangeText={(value) => updateField('email', value)}
        placeholder="ban@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        error={errors.email}
      />
      <AuthField
        label="Số điện thoại"
        value={input.phone}
        onChangeText={(value) => updateField('phone', value)}
        placeholder="+84901234567"
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        returnKeyType="next"
        error={errors.phone}
      />
      <AuthField
        label="Mật khẩu"
        value={input.password}
        onChangeText={(value) => updateField('password', value)}
        placeholder="Tối thiểu 8 ký tự"
        passwordToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        error={errors.password}
      />
      <AuthField
        label="Xác nhận mật khẩu"
        value={confirmPassword}
        onChangeText={(value) => {
          setConfirmPassword(value);
          setErrors((current) => ({ ...current, confirmPassword: undefined }));
        }}
        placeholder="Nhập lại mật khẩu"
        passwordToggle
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        error={errors.confirmPassword}
      />
      <View style={styles.dateField}>
        <DatePickerField
          label="Ngày sinh (không bắt buộc)"
          value={input.dateOfBirth ?? ''}
          onChange={(value) => updateField('dateOfBirth', value || undefined)}
        />
        {errors.dateOfBirth ? <Text style={styles.dateError}>{errors.dateOfBirth}</Text> : null}
      </View>
      <Text style={styles.helperText}>
        Thông tin của bạn sẽ được gửi đến máy chủ để tạo tài khoản khách hàng.
      </Text>
      <AuthButton
        label="Tạo tài khoản"
        isLoading={isSubmitting}
        onPress={() => void handleRegister()}
      />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { color: '#75675D', fontSize: 14 },
  link: { color: '#D94F31', fontSize: 14, fontWeight: '700' },
  helperText: { marginTop: -6, color: '#75675D', fontSize: 13, lineHeight: 19 },
  dateField: { gap: 8 },
  dateError: { color: '#B63E32', fontSize: 12 },
  errorNotice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FDEDEA',
    color: '#9F2D24',
    fontSize: 14,
    lineHeight: 20,
  },
});
