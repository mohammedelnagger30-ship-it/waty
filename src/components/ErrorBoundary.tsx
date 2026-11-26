import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { spacing, typography, radius, iconSize } from '@/src/theme';
import { useTheme } from '@/src/context';
import { useI18n } from '@/src/i18n';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

function ErrorFallback({ message, onReset }: { message?: string; onReset: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={[styles.iconWrap, { backgroundColor: `${theme.error}1C` }]}>
        <AlertTriangle size={iconSize.hero} color={theme.error} />
      </View>
      <Text
        style={[styles.title, { color: theme.text.primary, fontFamily: typography.fontFamilyBold }]}
      >
        {t('common.error')}
      </Text>
      {message ? (
        <Text
          style={[styles.message, { color: theme.text.tertiary, fontFamily: typography.fontFamily }]}
          numberOfLines={4}
        >
          {message}
        </Text>
      ) : null}
      <Button onPress={onReset}>{t('common.retry')}</Button>
    </View>
  );
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info?.componentStack);
  }

  reset = () => this.setState({ hasError: false, message: undefined });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback message={this.state.message} onReset={this.reset} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.sizes.xl,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
  },
});
