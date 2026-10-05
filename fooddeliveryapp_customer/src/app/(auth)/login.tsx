import { useState } from 'react';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { AuthButton } from '@/components/auth/AuthButton';
import { AuthField } from '@/components/auth/AuthField';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { login } from '@/services/api/auth';
import { getErrorMessage } from '@/services/api/client';
import { useSession } from '@/providers/SessionProvider';
import { validateLogin, type LoginErrors } from '@/features/auth/validation';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string; registered?: string }>();
  const { signIn } = useSession();
  const [email, setEmail] = useState(typeof params.email === 'string' ? params.email : '');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const notice =
    params.registered === '1'
      ? 'Tạo tài khoản thành công. Đăng nhập để bắt đầu đặt món nhé.'
      : '';
  const [requestError, setRequestError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin() {
    const validationErrors = validateLogin(email, password);
    setErrors(validationErrors);
    setRequestError('');

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      await signIn(result.token, result.expiresIn);
      router.replace('/home');
    } catch (error) {
      setRequestError(getErrorMessage(error, 'login'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout
      eyebrow="Chào mừng trở lại"
      title="Đăng nhập"
      subtitle="Đăng nhập để khám phá nhà hàng và đặt món yêu thích."
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Chưa có tài khoản? </Text>
          <Link href="/register" style={styles.link}>
            Đăng ký ngay
          </Link>
        </View>
      }
    >
      {notice ? <Text style={styles.successNotice}>{notice}</Text> : null}
      {requestError ? <Text accessibilityRole="alert" style={styles.errorNotice}>{requestError}</Text> : null}
      <AuthField
        label="Email"
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          setErrors((current) => ({ ...current, email: undefined }));
        }}
        placeholder="ban@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        error={errors.email}
      />
      <AuthField
        label="Mật khẩu"
        value={password}
        onChangeText={(value) => {
          setPassword(value);
          setErrors((current) => ({ ...current, password: undefined }));
        }}
        placeholder="Nhập mật khẩu"
        passwordToggle
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="done"
        onSubmitEditing={() => void handleLogin()}
        error={errors.password}
      />
      <AuthButton label="Đăng nhập" isLoading={isSubmitting} onPress={() => void handleLogin()} />
      <Text style={styles.demoCopy}>
        Đăng nhập bằng tài khoản khách hàng đã đăng ký.
      </Text>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  footerRow: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap' },
  footerText: { color: '#75675D', fontSize: 14 },
  link: { color: '#D94F31', fontSize: 14, fontWeight: '700' },
  successNotice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#EAF7ED',
    color: '#236338',
    fontSize: 14,
    lineHeight: 20,
  },
  errorNotice: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FDEDEA',
    color: '#9F2D24',
    fontSize: 14,
    lineHeight: 20,
  },
  demoCopy: { color: '#8D8178', fontSize: 11, lineHeight: 17, textAlign: 'center' },
});
