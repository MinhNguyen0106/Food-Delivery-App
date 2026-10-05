import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AuthLayoutProps extends PropsWithChildren {
  eyebrow: string;
  title: string;
  subtitle: string;
  footer?: ReactNode;
}

export function AuthLayout({ eyebrow, title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandMark} accessibilityLabel="Food Delivery">
            <Text style={styles.brandInitial}>F</Text>
          </View>
          <Text style={styles.brandName}>Food Delivery</Text>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.form}>{children}</View>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1, backgroundColor: '#FFF9F5' },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brandMark: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderRadius: 20,
    backgroundColor: '#E65E3F',
  },
  brandInitial: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  brandName: {
    marginTop: 10,
    color: '#E65E3F',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  eyebrow: {
    marginTop: 34,
    color: '#D94F31',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    marginTop: 8,
    color: '#281C16',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.7,
  },
  subtitle: {
    marginTop: 8,
    color: '#75675D',
    fontSize: 15,
    lineHeight: 22,
  },
  form: { gap: 16, marginTop: 28 },
  footer: { marginTop: 24 },
});
