import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { PDFExportService } from '@/services/pdfExport';
import { CSVService } from '@/services/csvService';
import { useApp } from '@/contexts/AppContext';

export default function SettingsScreen({ navigation }: any) {
  const { trips, expenses, addTrip, addExpense, settlements, getTripBalances } = useApp();
  const [isExporting, setIsExporting] = useState(false);


  const handleExportComprehensiveTrip = async () => {
    if (trips.length === 0) {
      Alert.alert('No Data', 'You don\'t have any trips to export yet.');
      return;
    }

    // Show trip selection dialog
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
      
      // Validate CSV format first
      const validation = await CSVService.validateCSVFormat(fileUri);
      
      if (!validation.isValid) {
        Alert.alert(
          'Invalid CSV Format',
          `Please fix the following errors:\n\n${validation.errors.join('\n')}`,
          [{ text: 'OK' }]
        );
        return;
      }

      // Show preview and confirm import
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
                
                // Add imported trips and expenses
                for (const trip of importedTrips) {
                  await addTrip(trip);
                }
                
                for (const expense of importedExpenses) {
                  await addExpense(expense);
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        <Text style={styles.title}>Settings</Text>
        
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="person-outline" size={24} color="#333" />
            <Text style={styles.settingText}>Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="notifications-outline" size={24} color="#333" />
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="shield-outline" size={24} color="#333" />
            <Text style={styles.settingText}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="help-circle-outline" size={24} color="#333" />
            <Text style={styles.settingText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <Ionicons name="information-circle-outline" size={24} color="#333" />
            <Text style={styles.settingText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Data & Export</Text>
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => navigation.navigate('ManageCategories')}
          >
            <Ionicons name="pricetag-outline" size={24} color="#333" />
            <Text style={styles.settingText}>Manage Categories</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => navigation.navigate('History')}
          >
            <Ionicons name="time-outline" size={24} color="#333" />
            <Text style={styles.settingText}>History & Audit Log</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleExportComprehensiveTrip}
            disabled={isExporting}
          >
            <Ionicons name="document-attach-outline" size={24} color="#8b5cf6" />
            <Text style={[styles.settingText, { color: '#8b5cf6' }]}>Export Trip Report</Text>
            <Ionicons name="chevron-forward" size={20} color="#8b5cf6" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleExportCSV}
            disabled={isExporting}
          >
            <Ionicons name="document-text-outline" size={24} color="#333" />
            <Text style={styles.settingText}>Export to CSV</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={handleImportCSV}
            disabled={isExporting}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="#333" />
            <Text style={styles.settingText}>Import from CSV</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Statistics</Text>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Trips</Text>
            <Text style={styles.statValue}>{trips.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Total Expenses</Text>
            <Text style={styles.statValue}>{expenses.length}</Text>
          </View>
        </View>

        <View style={styles.settingsGroup}>
          <Text style={styles.groupTitle}>Danger Zone</Text>
          <TouchableOpacity style={[styles.settingItem, styles.dangerItem]}>
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
            <Text style={[styles.settingText, styles.dangerText]}>Clear All Data</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        </View>

        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>Travel Expense Tracker v1.0.0</Text>
          <Text style={styles.versionText}>Built with ❤️ for travelers</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  settingsGroup: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutButton: {
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    padding: 16,
    paddingBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  statLabel: {
    fontSize: 16,
    color: '#333',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#462b77',
  },
  dangerItem: {
    backgroundColor: '#fef2f2',
  },
  dangerText: {
    color: '#ef4444',
  },
  versionInfo: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
});
