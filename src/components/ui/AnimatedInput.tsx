import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { TextInput, useTheme } from 'react-native-paper';
import { MotiView } from 'moti';

interface AnimatedInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: boolean;
  errorText?: string;
  mode?: 'flat' | 'outlined';
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  left?: React.ReactNode;
  right?: React.ReactNode;
  disabled?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  style?: ViewStyle;
}

export function AnimatedInput({
  label,
  value,
  onChangeText,
  placeholder,
  error = false,
  errorText,
  mode = 'outlined',
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  left,
  right,
  disabled = false,
  multiline = false,
  numberOfLines = 1,
  style,
}: AnimatedInputProps) {
  const theme = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <MotiView
      animate={{
        scale: isFocused ? 1.01 : 1,
      }}
      transition={{
        type: 'timing',
        duration: 200,
      }}
      style={style}
    >
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        mode={mode}
        error={error}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        left={left}
        right={right}
        disabled={disabled}
        multiline={multiline}
        numberOfLines={numberOfLines}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={styles.input}
        contentStyle={styles.content}
        outlineStyle={[
          styles.outline,
          isFocused && { borderWidth: 2 },
          error && { borderColor: theme.colors.error },
        ]}
      />
      {error && errorText && (
        <MotiView
          from={{ opacity: 0, translateY: -4 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 200 }}
        >
          <TextInput
            mode="flat"
            error
            value={errorText}
            editable={false}
            style={styles.errorText}
          />
        </MotiView>
      )}
    </MotiView>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'transparent',
  },
  content: {
    fontSize: 16,
  },
  outline: {
    borderRadius: 12,
  },
  errorText: {
    marginTop: 4,
    fontSize: 12,
    height: 20,
  },
});

