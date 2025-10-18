import { Platform, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Trip, Expense } from '@/types';
import { getCategoryInfo } from '@/constants/categories';

export function generateCSV(trip: Trip, expenses: Expense[]): string {
  const headers = ['Date', 'Category', 'Description', 'Amount', 'Currency', 'Paid By', 'Split Between'];
  
  const rows = expenses.map(expense => {
    const category = getCategoryInfo(expense.category).label;
    const splitNames = expense.splitBetween.map(p => p.userName).join('; ');
    
    return [
      new Date(expense.date).toLocaleDateString(),
      category,
      expense.description,
      expense.amount.toFixed(2),
      expense.currency,
      expense.paidBy,
      splitNames,
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

export function getTripSummary(trip: Trip, expenses: Expense[]): string {
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory: Record<string, number> = {};

  expenses.forEach(expense => {
    const category = getCategoryInfo(expense.category).label;
    byCategory[category] = (byCategory[category] || 0) + expense.amount;
  });

  let summary = `Trip: ${trip.name}\n`;
  summary += `Destination: ${trip.destination}\n`;
  summary += `Dates: ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}\n`;
  summary += `Budget: ${trip.currency} ${trip.budget.toFixed(2)}\n`;
  summary += `Total Spent: ${trip.currency} ${total.toFixed(2)}\n`;
  summary += `Remaining: ${trip.currency} ${(trip.budget - total).toFixed(2)}\n\n`;
  summary += `Spending by Category:\n`;
  
  Object.entries(byCategory)
    .sort(([, a], [, b]) => b - a)
    .forEach(([category, amount]) => {
      const percentage = ((amount / total) * 100).toFixed(1);
      summary += `  ${category}: ${trip.currency} ${amount.toFixed(2)} (${percentage}%)\n`;
    });

  return summary;
}

export async function exportToCSV(trip: Trip, expenses: Expense[]): Promise<void> {
  try {
    const csvContent = generateCSV(trip, expenses);
    const fileName = `${trip.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.csv`;

    if (Platform.OS === 'web') {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert('Success', 'CSV file downloaded successfully');
    } else {
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export Trip Data',
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Success', `File saved to: ${fileUri}`);
      }
    }
  } catch (error) {
    console.error('CSV export error:', error);
    Alert.alert('Export Error', 'Failed to export CSV file. Please try again.');
  }
}

export async function exportSummary(trip: Trip, expenses: Expense[]): Promise<void> {
  try {
    const summary = getTripSummary(trip, expenses);
    const fileName = `${trip.name.replace(/[^a-z0-9]/gi, '_')}_summary_${Date.now()}.txt`;

    if (Platform.OS === 'web') {
      const blob = new Blob([summary], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert('Success', 'Summary downloaded successfully');
    } else {
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, summary, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/plain',
          dialogTitle: 'Export Trip Summary',
        });
      } else {
        Alert.alert('Success', `File saved to: ${fileUri}`);
      }
    }
  } catch (error) {
    console.error('Export error:', error);
    Alert.alert('Export Error', 'Failed to export summary. Please try again.');
  }
}
