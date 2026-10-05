import { useState, useSyncExternalStore, type PropsWithChildren, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

export function Page({
  children,
  scroll = true,
  contentStyle,
}: PropsWithChildren<{ scroll?: boolean; contentStyle?: ViewStyle }>) {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.pageContent, contentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.pageContent, styles.flex, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function RequestState({
  message,
  loading = false,
  onRetry,
}: {
  message: string;
  loading?: boolean;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.requestState}>
      {loading ? <ActivityIndicator color={colors.accent} /> : null}
      <Text style={styles.requestMessage}>{message}</Text>
      {!loading && onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button">
          <Text style={styles.requestRetry}>Thử lại</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={10} accessibilityRole="button">
            <Text style={styles.backText}>‹</Text>
          </Pressable>
        ) : null}
        <View>
          <Text style={styles.pageTitle}>{title}</Text>
          {subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

export function SectionHeading({
  title,
  action,
  onAction,
  subtitle,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <View style={styles.flex}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <Text style={styles.textAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? styles.buttonSecondary : null,
        variant === 'quiet' ? styles.buttonQuiet : null,
        variant === 'danger' ? styles.buttonDanger : null,
        disabled ? styles.buttonDisabled : null,
        pressed && !disabled ? styles.buttonPressed : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.buttonLabel,
          variant === 'secondary' || variant === 'quiet' ? styles.buttonLabelSecondary : null,
          variant === 'danger' ? styles.buttonLabelDanger : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PressableRow({
  children,
  onPress,
  style,
}: PropsWithChildren<{ onPress?: () => void; style?: ViewStyle }>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [pressed && onPress ? styles.rowPressed : null, style]}
    >
      {children}
    </Pressable>
  );
}

export function Surface({ children, style }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function Chip({
  label,
  selected = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipSelected : null]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[styles.chipText, selected ? styles.chipTextSelected : null]}>{label}</Text>
    </Pressable>
  );
}

export function SearchField({
  value,
  onChangeText,
  placeholder = 'Tìm món ăn, nhà hàng…',
  containerStyle,
  ...props
}: TextInputProps & {
  value: string;
  onChangeText: (value: string) => void;
  containerStyle?: ViewStyle;
}) {
  return (
    <View style={[styles.searchField, containerStyle]}>
      <Text style={styles.searchIcon}>⌕</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.subtle}
        style={styles.searchInput}
        returnKeyType="search"
        {...props}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Xóa tìm kiếm">
          <Text style={styles.clearSearch}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  error,
  passwordToggle,
  secureTextEntry,
  ...props
}: TextInputProps & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  passwordToggle?: boolean;
}) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const showToggle = passwordToggle && secureTextEntry;
  return (
    <View style={styles.formField}>
      <Text style={styles.formLabel}>{label}</Text>
      <View style={showToggle ? styles.passwordField : undefined}>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.subtle}
          multiline={multiline}
          secureTextEntry={showToggle ? !passwordVisible : secureTextEntry}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.formInput, showToggle ? styles.passwordInput : null, multiline ? styles.formInputMultiline : null, error ? styles.formInputError : null]}
          {...props}
        />
        {showToggle ? (
          <Pressable
            onPress={() => setPasswordVisible((visible) => !visible)}
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>{passwordVisible ? 'Ẩn' : 'Hiện'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.formError}>{error}</Text> : null}
    </View>
  );
}

export function FoodImage({
  uri,
  style,
  resizeMode = 'cover',
}: {
  uri: string;
  style?: ImageStyle;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}) {
  return (
    <Image
      source={uri ? { uri } : undefined}
      style={[styles.image, style]}
      resizeMode={resizeMode}
      accessibilityIgnoresInvertColors
    />
  );
}

export function CoverImage({
  uri,
  children,
  style,
}: PropsWithChildren<{ uri: string; style?: ViewStyle }>) {
  return (
    <ImageBackground source={uri ? { uri } as ImageSourcePropType : undefined} imageStyle={styles.coverImage} style={style}>
      {children}
    </ImageBackground>
  );
}

export function StatusPill({
  label,
  tone = 'green',
}: {
  label: string;
  tone?: 'green' | 'sand' | 'rose' | 'blue' | 'grey';
}) {
  return (
    <View
      style={[
        styles.statusPill,
        tone === 'green' ? styles.pillGreen : null,
        tone === 'sand' ? styles.pillSand : null,
        tone === 'rose' ? styles.pillRose : null,
        tone === 'blue' ? styles.pillBlue : null,
        tone === 'grey' ? styles.pillGrey : null,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          tone === 'green' ? styles.statusTextGreen : null,
          tone === 'sand' ? styles.statusTextSand : null,
          tone === 'rose' ? styles.statusTextRose : null,
          tone === 'blue' ? styles.statusTextBlue : null,
          tone === 'grey' ? styles.statusTextGrey : null,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export function Price({ amount, emphasis = false }: { amount: number; emphasis?: boolean }) {
  return (
    <Text style={[styles.price, emphasis ? styles.priceEmphasis : null]}>
      {Math.round(amount).toLocaleString('vi-VN')}đ
    </Text>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function BottomAction({
  children,
}: PropsWithChildren) {
  return <View style={styles.bottomAction}>{children}</View>;
}

export function showConfirmation(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Xác nhận',
) {
  dialog = { type: 'confirmation', title, message, onConfirm, confirmLabel };
  notifyDialogSubscribers();
}

export function showNotice(title: string, message: string) {
  dialog = { type: 'notice', title, message };
  notifyDialogSubscribers();
}

interface NoticeDialogState {
  type: 'notice';
  title: string;
  message: string;
}

interface ConfirmationDialogState {
  type: 'confirmation';
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

type DialogState = NoticeDialogState | ConfirmationDialogState;

let dialog: DialogState | null = null;
const dialogSubscribers = new Set<() => void>();

function notifyDialogSubscribers() {
  dialogSubscribers.forEach((subscriber) => subscriber());
}

function subscribeToDialog(subscriber: () => void) {
  dialogSubscribers.add(subscriber);
  return () => dialogSubscribers.delete(subscriber);
}

function getDialogSnapshot() {
  return dialog;
}

export function NoticeDialog() {
  const currentDialog = useSyncExternalStore(subscribeToDialog, getDialogSnapshot, () => null);

  function dismiss() {
    dialog = null;
    notifyDialogSubscribers();
  }

  function confirm() {
    if (currentDialog?.type !== 'confirmation') return;
    const onConfirm = currentDialog.onConfirm;
    dismiss();
    onConfirm();
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={currentDialog !== null}
      onRequestClose={dismiss}
      statusBarTranslucent
    >
      <View style={styles.noticeOverlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityLabel="Đóng thông báo"
        />
        {currentDialog ? (
          <View
            style={styles.noticeCard}
            accessibilityRole={currentDialog.type === 'notice' ? 'alert' : 'none'}
            accessibilityViewIsModal
          >
            <View style={styles.noticeIcon}>
              <Text style={styles.noticeIconText}>i</Text>
            </View>
            <Text style={styles.noticeTitle}>{currentDialog.title}</Text>
            <Text style={styles.noticeMessage}>{currentDialog.message}</Text>
            {currentDialog.type === 'confirmation' ? (
              <View style={styles.confirmationActions}>
                <Pressable
                  onPress={dismiss}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.noticeButton,
                    styles.cancelButton,
                    pressed && styles.noticeButtonPressed,
                  ]}
                >
                  <Text style={styles.cancelButtonLabel}>Để sau</Text>
                </Pressable>
                <Pressable
                  onPress={confirm}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.noticeButton,
                    styles.confirmButton,
                    pressed && styles.noticeButtonPressed,
                  ]}
                >
                  <Text style={styles.noticeButtonLabel}>{currentDialog.confirmLabel}</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={dismiss}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.noticeButton,
                  pressed && styles.noticeButtonPressed,
                ]}
              >
                <Text style={styles.noticeButtonLabel}>Đóng</Text>
              </Pressable>
            )}
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  flex: { flex: 1 },
  pageContent: {
    paddingHorizontal: spacing.page,
    paddingTop: 14,
    paddingBottom: 34,
    gap: 20,
  },
  requestState: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 12 },
  requestMessage: { maxWidth: 300, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  requestRetry: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  noticeOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(25, 31, 27, 0.48)',
  },
  noticeCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 26,
    paddingBottom: 20,
    borderRadius: 24,
    backgroundColor: colors.surface,
    shadowColor: '#17231B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  noticeIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
  },
  noticeIconText: { color: colors.accent, fontSize: 25, fontWeight: '700' },
  noticeTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, textAlign: 'center', fontWeight: '700' },
  noticeMessage: { marginTop: 8, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  noticeButton: {
    minWidth: 120,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  confirmationActions: { width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 20 },
  cancelButton: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  cancelButtonLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  confirmButton: { backgroundColor: colors.rose },
  noticeButtonPressed: { opacity: 0.85 },
  noticeButtonLabel: { color: colors.surface, fontSize: 13, fontWeight: '700' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerCopy: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  backText: { color: colors.ink, fontSize: 34, lineHeight: 36, fontWeight: '300' },
  pageTitle: { color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  pageSubtitle: { marginTop: 3, color: colors.muted, fontSize: 13, lineHeight: 19 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  sectionTitle: { color: colors.ink, fontSize: 19, fontWeight: '700', letterSpacing: -0.25 },
  sectionSubtitle: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 18 },
  textAction: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  surface: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.surface,
  },
  rowPressed: { opacity: 0.86 },
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: colors.accent,
  },
  buttonSecondary: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
  buttonQuiet: { backgroundColor: colors.accentSoft },
  buttonDanger: { backgroundColor: colors.roseSoft },
  buttonDisabled: { opacity: 0.45 },
  buttonPressed: { opacity: 0.82 },
  buttonLabel: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  buttonLabelSecondary: { color: colors.ink },
  buttonLabelDanger: { color: colors.rose },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 20,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.accent, backgroundColor: colors.accent },
  chipText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  chipTextSelected: { color: colors.surface },
  searchField: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 15,
    backgroundColor: colors.surface,
  },
  searchIcon: { color: colors.muted, fontSize: 24, lineHeight: 27 },
  searchInput: { flex: 1, minHeight: 48, color: colors.ink, fontSize: 14 },
  clearSearch: { color: colors.muted, fontSize: 22 },
  formField: { gap: 7 },
  formLabel: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  formInput: {
    minHeight: 48,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 12,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontSize: 14,
  },
  passwordField: { position: 'relative', justifyContent: 'center' },
  passwordInput: { paddingRight: 62 },
  passwordToggle: { position: 'absolute', right: 12, minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  passwordToggleText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  formInputMultiline: { minHeight: 94, paddingTop: 12 },
  formInputError: { borderColor: colors.rose },
  formError: { color: colors.rose, fontSize: 12 },
  image: { backgroundColor: '#E8E7E0' },
  coverImage: { borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 },
  pillGreen: { backgroundColor: colors.accentSoft },
  pillSand: { backgroundColor: colors.amberSoft },
  pillRose: { backgroundColor: colors.roseSoft },
  pillBlue: { backgroundColor: colors.blueSoft },
  pillGrey: { backgroundColor: '#EFEEE9' },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextGreen: { color: colors.accent },
  statusTextSand: { color: colors.amber },
  statusTextRose: { color: colors.rose },
  statusTextBlue: { color: colors.blue },
  statusTextGrey: { color: colors.muted },
  price: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  priceEmphasis: { color: colors.accent, fontSize: 17 },
  divider: { height: 1, backgroundColor: colors.line },
  bottomAction: {
    paddingHorizontal: spacing.page,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.surface,
  },
});
