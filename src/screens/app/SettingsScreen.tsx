import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, Surface, List, Divider, ActivityIndicator } from 'react-native-paper';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { PDFExportService } from '@/services/pdfExport';
import { CSVService } from '@/services/csvService';
import { useApp } from '@/contexts/AppContext';
import { AnimatedCard } from '@/components/ui/AnimatedCard';

export default function SettingsScreen({ navigation }: any) {
  const theme = useTheme();
  const { trips, expenses, addTrip, addExpense, settlements, getTripBalances } = useApp();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportComprehensiveTrip = async () => {
    if (trips.length === 0) {
      Alert.alert('No Data', 'You don\'t have any trips to export yet.');
      return;
    }

    const tripOptions = trips.map(trip => trip.name);
    
    Alert.alert(
      'Select Trip',
      'Choose which trip to export comprehensive details for:',
      [
        ...tripOptions.map((tripName, index) => ({
          text: tripName,
          onPress: () => exportSelectedTrip(trips[index]),
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const exportSelectedTrip = async (selectedTrip: any) => {
    setIsExporting(true);
    try {
      const tripExpenses = expenses.filter(expense => expense.tripId === selectedTrip.id);
      const tripSettlements = settlements.filter(settlement => settlement.tripId === selectedTrip.id);
      const tripBalances = getTripBalances(selectedTrip.id);
      
      const totalSpent = tripExpenses.reduce((sum, expense) => sum + expense.amount, 0);
      const remainingBudget = selectedTrip.budget - totalSpent;
      
      const categoryBreakdown = tripExpenses.reduce((breakdown, expense) => {
        breakdown[expense.category] = (breakdown[expense.category] || 0) + expense.amount;
        return breakdown;
      }, {} as Record<string, number>);

      const tripSummary = {
        trip: selectedTrip,
        expenses: tripExpenses,
        totalSpent,
        remainingBudget,
        categoryBreakdown,
        settlements: tripSettlements,
        balances: tripBalances,
      };

      const pdfUri = await PDFExportService.generateComprehensiveTripPDF(tripSummary);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${selectedTrip.name} - Comprehensive Report`,
        });
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Success', 'Comprehensive trip PDF generated successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export comprehensive trip PDF. Please try again.');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportCSV = async () => {
    if (trips.length === 0) {
      Alert.alert('No Data', 'You don\'t have any trips to export yet.');
      return;
    }

    setIsExporting(true);
    try {
      const csvUri = await CSVService.exportToCSV(trips, expenses);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(csvUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Share CSV Export',
        });
        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        Alert.alert('Success', 'CSV exported successfully!');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to export CSV. Please try again.');
      console.error('CSV export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const fileUri = result.assets[0].uri;
      
      const validation = await CSVService.validateCSVFormat(fileUri);
      
      if (!validation.isValid) {
        Alert.alert(
          'Invalid CSV Format',
          `Please fix the following errors:\n\n${validation.errors.join('\n')}`,
          [{ text: 'OK' }]
        );
        return;
      }

      const previewText = validation.preview.length > 0 
        ? `Found ${validation.preview.length} sample records.\n\nDo you want to import this data?`
        : 'No data found in the CSV file.';

      Alert.alert(
        'Import CSV',
        previewText,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              setIsExporting(true);
              try {
                const { trips: importedTrips, expenses: importedExpenses } = await CSVService.importFromCSV(fileUri);
                
                for (const trip of importedTrips) {
                  await addTrip(trip);
                }
                
                for (const expense of importedExpenses) {
                  await addExpense(expense);
                }
                
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
                Alert.alert(
                  'Import Successful',
                  `Successfully imported ${importedTrips.length} trips and ${importedExpenses.length} expenses.`
                );
              } catch (error) {
                Alert.alert('Import Error', `Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
              } finally {
                setIsExporting(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to select CSV file. Please try again.');
      console.error('CSV import error:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Surface style={styles.header} elevation={1}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Settings</Text>
      </Surface>
      
      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
        >
          <AnimatedCard variant="elevated" elevation={2} style={styles.settingsCard}>
            <List.Section>
              <List.Item
                title="Profile"
                left={(props) => <List.Icon {...props} icon="account-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  navigation.navigate('Profile');
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                titleStyle={{ color: theme.colors.onSurface }}
              />

              <List.Item
                title="Notifications"
                left={(props) => <List.Icon {...props} icon="bell-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  navigation.navigate('NotificationSettings');
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                titleStyle={{ color: theme.colors.onSurface }}
              />

              <List.Item
                title="Privacy"
                left={(props) => <List.Icon {...props} icon="shield-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                titleStyle={{ color: theme.colors.onSurface }}
              />

              <List.Item
                title="Help & Support"
                left={(props) => <List.Icon {...props} icon="help-circle-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                titleStyle={{ color: theme.colors.onSurface }}
              />

              <List.Item
                title="About"
                left={(props) => <List.Icon {...props} icon="information-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                titleStyle={{ color: theme.colors.onSurface }}
              />
            </List.Section>
          </AnimatedCard>

          <AnimatedCard variant="elevated" elevation={2} style={styles.settingsCard}>
            <List.Section>
              <List.Subheader style={{ color: theme.colors.onSurface }}>Data & Export</List.Subheader>
              
              <List.Item
                title="Manage Categories"
                left={(props) => <List.Icon {...props} icon="tag-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  navigation.navigate('ManageCategories');
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                titleStyle={{ color: theme.colors.onSurface }}
              />
              
              <List.Item
                title="History & Audit Log"
                left={(props) => <List.Icon {...props} icon="time-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  navigation.navigate('History');
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                titleStyle={{ color: theme.colors.onSurface }}
              />
              
              <List.Item
                title="Export Trip Report"
                description="Generate comprehensive PDF report"
                left={(props) => <List.Icon {...props} icon="document-text-outline" color={theme.colors.primary} />}
                right={() => isExporting ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <List.Icon icon="chevron-right" />
                )}
                onPress={handleExportComprehensiveTrip}
                disabled={isExporting}
                titleStyle={{ color: theme.colors.primary }}
                descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              />

              <List.Item
                title="Export to CSV"
                left={(props) => <List.Icon {...props} icon="download-outline" />}
                right={() => isExporting ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <List.Icon icon="chevron-right" />
                )}
                onPress={handleExportCSV}
                disabled={isExporting}
                titleStyle={{ color: theme.colors.onSurface }}
              />

              <List.Item
                title="Import from CSV"
                left={(props) => <List.Icon {...props} icon="cloud-upload-outline" />}
                right={() => isExporting ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                  <List.Icon icon="chevron-right" />
                )}
                onPress={handleImportCSV}
                disabled={isExporting}
                titleStyle={{ color: theme.colors.onSurface }}
              />
            </List.Section>
          </AnimatedCard>

          <AnimatedCard variant="elevated" elevation={2} style={styles.settingsCard}>
            <List.Section>
              <List.Subheader style={{ color: theme.colors.onSurface }}>Statistics</List.Subheader>
              <List.Item
                title="Total Trips"
                right={() => (
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                    {trips.length}
                  </Text>
                )}
                titleStyle={{ color: theme.colors.onSurface }}
              />
              <List.Item
                title="Total Expenses"
                right={() => (
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                    {expenses.length}
                  </Text>
                )}
                titleStyle={{ color: theme.colors.onSurface }}
              />
            </List.Section>
          </AnimatedCard>

          <AnimatedCard variant="elevated" elevation={2} style={[styles.settingsCard, styles.dangerCard]}>
            <List.Section>
              <List.Subheader style={{ color: theme.colors.error }}>Danger Zone</List.Subheader>
              <List.Item
                title="Clear All Data"
                left={(props) => <List.Icon {...props} icon="delete-outline" color={theme.colors.error} />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                }}
                titleStyle={{ color: theme.colors.error }}
              />
            </List.Section>
          </AnimatedCard>

          <View style={styles.versionInfo}>
            <Text style={[styles.versionText, { color: theme.colors.onSurfaceVariant }]}>
              Travel Expense Tracker v1.0.0
            </Text>
            <Text style={[styles.versionText, { color: theme.colors.onSurfaceVariant }]}>
              Built with ❤️ for travelers
            </Text>
          </View>
        </MotiView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  settingsCard: {
    marginBottom: 16,
  },
  dangerCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    marginBottom: 4,
  },
});
