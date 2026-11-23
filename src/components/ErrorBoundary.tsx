import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { spacing, typography, radius } from '@/src/theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
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
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={[styles.title, { fontFamily: typography.fontFamilyBold }]}>
          حدث خطأ غير متوقع
        </Text>
        {this.state.message ? (
          <Text style={[styles.message, { fontFamily: typography.fontFamily }]} numberOfLines={4}>
            {this.state.message}
          </Text>
        ) : null}
        <Pressable onPress={this.reset} style={styles.button}>
          <Text style={[styles.buttonText, { fontFamily: typography.fontFamilySemiBold }]}>
            إعادة المحاولة
          </Text>
        </Pressable>
      </View>
    );
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
  title: {
    fontSize: typography.sizes.xl,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.sizes.sm,
    textAlign: 'center',
    opacity: 0.7,
  },
  button: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: '#4338CA',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: typography.sizes.md,
  },
});
