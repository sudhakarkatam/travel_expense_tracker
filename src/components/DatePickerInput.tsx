import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from 'react-native-paper';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerInputProps {
  value: string;
  onChange: (date: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  mode?: 'date' | 'time' | 'datetime';
  disabled?: boolean;
}

export default function DatePickerInput({
  value,
  onChange,
  placeholder = 'Select date',
  minimumDate,
  maximumDate,
  mode = 'date',
  disabled = false,
}: DatePickerInputProps) {
  const theme = useTheme();
  const [showPicker, setShowPicker] = useState(false);

  const safeTheme = {
    colors: {
      surface: theme?.colors?.surface || '#FFFFFF',
      surfaceVariant: theme?.colors?.surfaceVariant || '#F5F5F5',
      onSurface: theme?.colors?.onSurface || '#000000',
      onSurfaceVariant: theme?.colors?.onSurfaceVariant || '#666666',
      outline: theme?.colors?.outline || '#E5E5E5',
      outlineVariant: theme?.colors?.outlineVariant || '#E5E5E5',
    },
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);

    if (mode === 'time') {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }

    const datePart = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    if (mode === 'datetime') {
      const timePart = date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${datePart} at ${timePart}`;
    }

    return datePart;
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowPicker(Platform.OS === 'ios');

    if (selectedDate) {
      if (mode === 'date') {
        // Keep existing behavior for date-only mode
        const isoString = selectedDate.toISOString();
        const dateOnly = isoString.split('T')[0];
        onChange(dateOnly);
      } else {
        // Return full ISO string for datetime/time modes
        onChange(selectedDate.toISOString());
      }
    }
  };

  const openPicker = () => {
    if (!disabled) {
      setShowPicker(true);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.input,
          {
            backgroundColor: safeTheme.colors.surfaceVariant,
            borderColor: safeTheme.colors.outline,
          },
          disabled && {
            backgroundColor: safeTheme.colors.surfaceVariant,
            borderColor: safeTheme.colors.outlineVariant,
          },
        ]}
        onPress={openPicker}
        disabled={disabled}
      >
        <Text
          style={[
            styles.text,
            {
              color: disabled
                ? safeTheme.colors.onSurfaceVariant
                : safeTheme.colors.onSurface,
            },
            !value && { color: safeTheme.colors.onSurfaceVariant },
          ]}
        >
          {value ? formatDate(value) : placeholder}
        </Text>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={
            disabled
              ? safeTheme.colors.onSurfaceVariant
              : safeTheme.colors.onSurfaceVariant
          }
        />
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={value ? new Date(value) : new Date()}
          mode={mode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    minHeight: 48,
  },
  text: {
    fontSize: 16,
    flex: 1,
  },
});
