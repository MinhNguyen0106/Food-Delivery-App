import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

interface AuthFieldProps extends TextInputProps {
  label: string;
  error?: string;
  passwordToggle?: boolean;
}

export function AuthField({
  label,
  error,
  passwordToggle = false,
  secureTextEntry,
  ...inputProps
}: AuthFieldProps) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const isSecure = passwordToggle ? !isPasswordVisible : secureTextEntry;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputFrame, error ? styles.inputFrameError : null]}>
        <TextInput
          {...inputProps}
          secureTextEntry={isSecure}
          style={styles.input}
          placeholderTextColor="#A79A91"
          accessibilityLabel={label}
          accessibilityHint={error}
        />
        {passwordToggle ? (
          <Pressable
            onPress={() => setIsPasswordVisible((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            hitSlop={8}
          >
            <Text style={styles.toggle}>{isPasswordVisible ? 'Ẩn' : 'Hiện'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: '#45372E', fontSize: 14, fontWeight: '600' },
  inputFrame: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E9DDD4',
    borderRadius: 14,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  inputFrameError: { borderColor: '#C7392F' },
  input: {
    flex: 1,
    minHeight: 52,
    paddingVertical: 12,
    color: '#281C16',
    fontSize: 16,
  },
  toggle: { paddingLeft: 10, color: '#D94F31', fontSize: 14, fontWeight: '700' },
  error: { color: '#B42318', fontSize: 13 },
});
