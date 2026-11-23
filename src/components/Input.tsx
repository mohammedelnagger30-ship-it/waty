import { TextInput, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { useTheme } from '@/src/context';
import { spacing, radius, typography } from '@/src/theme';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  multiline?: boolean;
  numberOfLines?: number;
  secureTextEntry?: boolean;
  leftIcon?: ReactNode;
  style?: ViewStyle;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  multiline,
  numberOfLines,
  secureTextEntry,
  leftIcon,
  style,
}: InputProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.text.secondary, fontFamily: typography.fontFamilySemiBold }]}>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor: theme.surfaceSecondary,
            borderColor: error ? theme.error : theme.border,
            borderRadius: radius.md,
          },
          style,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.text.tertiary}
          multiline={multiline}
          numberOfLines={numberOfLines}
          secureTextEntry={secureTextEntry}
          style={[
            styles.input,
            {
              color: theme.text.primary,
              fontFamily: typography.fontFamily,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />
      </View>
      {error && (
        <Text style={[styles.error, { color: theme.error, fontFamily: typography.fontFamily }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.sizes.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  leftIcon: {
    marginEnd: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.sizes.md,
    paddingVertical: spacing.sm,
  },
  error: {
    fontSize: typography.sizes.xs,
  },
});
