import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

interface AuthButtonProps {
  label: string;
  isLoading: boolean;
  onPress: () => void;
}

export function AuthButton({ label, isLoading, onPress }: AuthButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isLoading}
      accessibilityRole="button"
      accessibilityState={{ disabled: isLoading, busy: isLoading }}
      style={({ pressed }) => [
        styles.button,
        pressed && !isLoading ? styles.pressed : null,
        isLoading ? styles.disabled : null,
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    borderRadius: 15,
    backgroundColor: '#E65E3F',
  },
  pressed: { backgroundColor: '#CE5034' },
  disabled: { opacity: 0.65 },
  label: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
