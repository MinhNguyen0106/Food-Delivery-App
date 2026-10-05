import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Page, ScreenHeader, Surface, showConfirmation } from '@/components/ui';
import { usePrototype } from '@/providers/PrototypeProvider';
import { useSession } from '@/providers/SessionProvider';
import { colors } from '@/theme';

const links = [
  { title: 'Thông tin cá nhân', detail: 'Tên, email và số điện thoại', path: '/profile/edit', symbol: '01' },
  { title: 'Sổ địa chỉ', detail: 'Quản lý nơi nhận hàng', path: '/profile/addresses', symbol: '02' },
  { title: 'Voucher', detail: 'Ưu đãi đang khả dụng', path: '/vouchers', symbol: '03' },
  { title: 'Đánh giá của tôi', detail: 'Những chia sẻ sau bữa ăn', path: '/reviews', symbol: '04' },
  { title: 'Đổi mật khẩu', detail: 'Bảo mật tài khoản', path: '/profile/change-password', symbol: '05' },
] as const;

export default function AccountScreen() {
  const { profile } = usePrototype();
  const { signOut } = useSession();
  const { signOutFromApi } = usePrototype();

  return (
    <Page contentStyle={styles.content}>
      <ScreenHeader title="Tài khoản" subtitle="Thông tin và tùy chọn cá nhân." />
      <Surface style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{profile.fullName.slice(0, 1)}</Text></View>
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{profile.fullName}</Text>
          <Text style={styles.profileEmail}>{profile.email}</Text>
          {profile.phone ? <Text style={styles.profilePhone}>{profile.phone}</Text> : null}
          <Text style={styles.memberLabel}>KHÁCH HÀNG</Text>
        </View>
      </Surface>
      <View style={styles.links}>
        {links.map((item) => (
          <Pressable
            key={item.path}
            onPress={() => router.push(item.path)}
            style={({ pressed }) => [styles.linkRow, pressed ? styles.pressed : null]}
          >
            <View style={styles.linkNumber}><Text style={styles.linkNumberText}>{item.symbol}</Text></View>
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>{item.title}</Text>
              <Text style={styles.linkDetail}>{item.detail}</Text>
            </View>
            <Text style={styles.linkChevron}>›</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.signOutWrap}>
        <Pressable
          onPress={() => showConfirmation('Đăng xuất?', 'Bạn có thể đăng nhập lại để tiếp tục.', async () => {
            await signOutFromApi();
            await signOut();
            router.replace('/login');
          }, 'Đăng xuất')}
          style={styles.signOut}
        >
          <Text style={styles.signOutText}>Đăng xuất</Text>
        </Pressable>
        <Text style={styles.version}>Food Delivery · Customer</Text>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  content: { gap: 21 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 17 },
  avatar: { width: 55, height: 55, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#E5EAE5' },
  avatarText: { color: colors.accent, fontSize: 23, fontWeight: '700' },
  profileCopy: { flex: 1, gap: 4 },
  profileName: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  profileEmail: { color: colors.muted, fontSize: 12 },
  profilePhone: { color: colors.muted, fontSize: 12 },
  memberLabel: { marginTop: 3, color: colors.accent, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  links: { overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: 17, backgroundColor: colors.surface },
  linkRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  pressed: { backgroundColor: '#F3F3EF' },
  linkNumber: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: '#F0F0EB' },
  linkNumberText: { color: colors.accent, fontSize: 10, fontWeight: '800' },
  linkCopy: { flex: 1, gap: 4 },
  linkTitle: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  linkDetail: { color: colors.muted, fontSize: 11 },
  linkChevron: { color: colors.subtle, fontSize: 24 },
  signOutWrap: { alignItems: 'center', gap: 13, paddingTop: 3 },
  signOut: { width: '100%', minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EAD5D2', borderRadius: 14 },
  signOutText: { color: colors.rose, fontSize: 14, fontWeight: '700' },
  version: { color: colors.subtle, fontSize: 10 },
});
