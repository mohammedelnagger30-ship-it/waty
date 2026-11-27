import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  AlertCircle,
  CheckCircle2,
  Cloud,
  Info,
  Lock,
  LogOut,
  Mail,
  RefreshCw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth, useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { spacing, typography, radius, iconSize } from '@/src/theme';
import { Button, Card, Input, ScreenHeader, SectionHeader } from '@/src/components';
import { useKeyboardInset } from '@/src/hooks/useKeyboardInset';

export default function AccountScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const keyboardInset = useKeyboardInset();
  const {
    configured,
    configError,
    user,
    busy,
    error,
    notice,
    syncStatus,
    lastSyncedAt,
    signIn,
    signUp,
    signOut,
    syncNow,
    clearError,
    clearNotice,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const statusText = syncStatus === 'syncing'
    ? t('account.syncing')
    : syncStatus === 'error'
      ? t('account.syncError')
      : lastSyncedAt
        ? `${t('account.synced')} · ${t('account.lastSync')}: ${new Date(lastSyncedAt).toLocaleString(language === 'ar' ? 'ar' : 'en')}`
        : t('account.offline');

  const handleSignOut = () => {
    Alert.alert(t('account.title'), t('account.signOut'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.signOut'), style: 'destructive', onPress: () => void signOut() },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader
        title={t('account.title')}
        subtitle={t('account.subtitle')}
        onBack={() => router.back()}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl + keyboardInset }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.section}>
          <SectionHeader
            icon={<Cloud size={iconSize.lg} color={theme.primary[500]} />}
            title={user ? t('account.signedInAs') : t('account.guest')}
            color={theme.primary[500]}
          />
          {user ? (
            <>
              <Text style={[styles.email, { color: theme.text.primary, fontFamily: typography.fontFamilySemiBold }]}>
                {user.email}
              </Text>
              <Text style={[styles.desc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
                {statusText}
              </Text>
            </>
          ) : (
            <Text style={[styles.desc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('account.guestDesc')}
            </Text>
          )}
        </Card>

        {!configured ? (
          <Card style={styles.section}>
            <View style={styles.noticeRow}>
              <AlertCircle size={iconSize.md} color={theme.warning} />
              <Text style={[styles.noticeText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                {`${t('account.notConfigured')}${configError ? ` ${configError}` : ''}`}
              </Text>
            </View>
          </Card>
        ) : user ? (
          <Card style={styles.section}>
            <Button
              variant="outline"
              loading={syncStatus === 'syncing'}
              onPress={() => void syncNow()}
              icon={<RefreshCw size={18} color={theme.primary[600]} />}
            >
              {t('account.syncNow')}
            </Button>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Button
              variant="danger"
              loading={busy}
              onPress={handleSignOut}
              icon={<LogOut size={18} color="#FFFFFF" />}
            >
              {t('account.signOut')}
            </Button>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <Text style={[styles.desc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('account.mergeDesc')}
            </Text>
          </Card>
        ) : (
          <Card style={styles.section}>
            <Input
              label={t('account.email')}
              value={email}
              onChangeText={(value) => { setEmail(value); clearError(); }}
              placeholder="name@example.com"
              leftIcon={<Mail size={iconSize.md} color={theme.text.tertiary} />}
              secureTextEntry={false}
            />
            <Input
              label={t('account.password')}
              value={password}
              onChangeText={(value) => { setPassword(value); clearError(); }}
              placeholder="••••••••"
              secureTextEntry
              leftIcon={<Lock size={iconSize.md} color={theme.text.tertiary} />}
            />
            <View style={styles.buttonRow}>
              <Button
                style={styles.button}
                loading={busy}
                disabled={!email.trim() || !password}
                onPress={() => void signIn(email, password)}
              >
                {t('account.signIn')}
              </Button>
              <Button
                style={styles.button}
                variant="secondary"
                loading={busy}
                disabled={!email.trim() || password.length < 6}
                onPress={() => void signUp(email, password)}
              >
                {t('account.signUp')}
              </Button>
            </View>
            <Text style={[styles.desc, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('account.mergeDesc')}
            </Text>
          </Card>
        )}

        {notice ? (
          <Card style={{ ...styles.section, backgroundColor: theme.success + '14' }}>
            <View style={styles.noticeRow}>
              <CheckCircle2 size={iconSize.md} color={theme.success} />
              <Text style={[styles.noticeText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                {notice === 'confirm-email' ? t('account.confirmEmail') : notice}
              </Text>
            </View>
            <Button variant="ghost" size="sm" onPress={clearNotice}>
              {t('update.ok')}
            </Button>
          </Card>
        ) : null}

        {error ? (
          <Card style={{ ...styles.section, backgroundColor: theme.error + '12' }}>
            <View style={styles.noticeRow}>
              <AlertCircle size={iconSize.md} color={theme.error} />
              <Text style={[styles.noticeText, { color: theme.text.secondary, fontFamily: typography.fontFamily }]}>
                {`${t('account.error')} ${error}`}
              </Text>
            </View>
            <Button variant="ghost" size="sm" onPress={clearError}>
              {t('update.ok')}
            </Button>
          </Card>
        ) : null}

        <Card style={styles.section}>
          <View style={styles.noticeRow}>
            <Info size={iconSize.md} color={theme.info} />
            <Text style={[styles.noticeText, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}>
              {t('account.secureNote')}
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg },
  section: { marginBottom: spacing.md, gap: spacing.sm },
  desc: { fontSize: typography.sizes.xs, lineHeight: 18 },
  email: { fontSize: typography.sizes.md },
  buttonRow: { flexDirection: 'row', gap: spacing.sm },
  button: { flex: 1 },
  divider: { height: 1, marginVertical: spacing.xs },
  noticeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  noticeText: { flex: 1, fontSize: typography.sizes.sm, lineHeight: 19 },
});
