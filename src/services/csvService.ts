import Papa from 'papaparse';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Trip, Expense } from '@/types';

interface CSVRow {
  TripID: string;
  TripName: string;
  Destination: string;
  StartDate: string;
  EndDate: string;
  Budget: number;
  Currency: string;
  CoverImage?: string;
  IsGroup: boolean;
  ExpenseID?: string;
  ExpenseDate?: string;
  Amount?: number;
  Category?: string;
  Description?: string;
  Notes?: string;
  PaidBy?: string;
  SplitType?: string;
  ReceiptImages?: string;
}

export class CSVService {
  static async exportToCSV(trips: Trip[], expenses: Expense[]): Promise<string> {
    const csvData: CSVRow[] = [];

    // Create a map of expenses by trip ID for easier lookup
    const expensesByTrip = expenses.reduce((acc, expense) => {
      if (!acc[expense.tripId]) {
        acc[expense.tripId] = [];
      }
      acc[expense.tripId].push(expense);
      return acc;
    }, {} as Record<string, Expense[]>);

    // Generate CSV rows
    trips.forEach(trip => {
      const tripExpenses = expensesByTrip[trip.id] || [];
      
      if (tripExpenses.length === 0) {
        // Trip with no expenses
        csvData.push({
          TripID: trip.id,
          TripName: trip.name,
          Destination: trip.destination,
          StartDate: trip.startDate,
          EndDate: trip.endDate,
          Budget: trip.budget,
          Currency: trip.currency,
          CoverImage: trip.coverImage || '',
          IsGroup: trip.isGroup || false,
        });
      } else {
        // Trip with expenses
        tripExpenses.forEach(expense => {
          csvData.push({
            TripID: trip.id,
            TripName: trip.name,
            Destination: trip.destination,
            StartDate: trip.startDate,
            EndDate: trip.endDate,
            Budget: trip.budget,
            Currency: trip.currency,
            CoverImage: trip.coverImage || '',
            IsGroup: trip.isGroup || false,
            ExpenseID: expense.id,
            ExpenseDate: expense.date,
            Amount: expense.amount,
            Category: expense.category,
            Description: expense.description,
            Notes: expense.notes || '',
            PaidBy: expense.paidBy,
            SplitType: expense.splitType || 'equal',
            ReceiptImages: expense.receiptImages?.join(';') || '',
          });
        });
      }
    });

    // Convert to CSV string
    const csv = Papa.unparse(csvData, {
      header: true,
      delimiter: ',',
      quotes: true,
      quoteChar: '"',
      escapeChar: '"',
    });

    // Save to file
    const fileName = `travel_expenses_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;
    
    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    return fileUri;
  }

  static async importFromCSV(fileUri: string): Promise<{ trips: Trip[], expenses: Expense[] }> {
    try {
      // Read CSV file
      const csvContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Parse CSV
      const parseResult = Papa.parse<CSVRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      if (parseResult.errors.length > 0) {
        throw new Error(`CSV parsing errors: ${parseResult.errors.map(e => e.message).join(', ')}`);
      }

      const rows = parseResult.data;
      const tripsMap = new Map<string, Trip>();
      const expenses: Expense[] = [];

      // Process each row
      rows.forEach((row, index) => {
        try {
          // Create or update trip
          if (!tripsMap.has(row.TripID)) {
            const trip: Trip = {
              id: row.TripID,
              name: row.TripName,
              destination: row.Destination,
              startDate: row.StartDate,
              endDate: row.EndDate,
              budget: Number(row.Budget),
              currency: row.Currency,
              coverImage: row.CoverImage || undefined,
              isGroup: Boolean(row.IsGroup),
              participants: [],
              createdBy: 'imported_user',
              inviteCode: `TRIP${Date.now().toString().slice(-6)}`,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            tripsMap.set(row.TripID, trip);
          }

          // Create expense if expense data is present
          if (row.ExpenseID && row.Amount && row.Description) {
            const expense: Expense = {
              id: row.ExpenseID,
              tripId: row.TripID,
              amount: Number(row.Amount),
              currency: row.Currency,
              category: row.Category as any || 'other',
              description: row.Description,
              notes: row.Notes || undefined,
              date: row.ExpenseDate || new Date().toISOString().split('T')[0],
              receiptImages: row.ReceiptImages ? row.ReceiptImages.split(';').filter(img => img.trim()) : [],
              paidBy: row.PaidBy || 'unknown',
              splitBetween: [], // Will be populated later if needed
              splitType: (row.SplitType as any) || 'equal',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            expenses.push(expense);
          }
        } catch (error) {
          console.warn(`Error processing row ${index + 1}:`, error);
        }
      });

      const trips = Array.from(tripsMap.values());

      // Validate data
      if (trips.length === 0) {
        throw new Error('No valid trips found in CSV file');
      }

      // Check for required fields
      const invalidTrips = trips.filter(trip => !trip.name || !trip.destination || isNaN(trip.budget));
      if (invalidTrips.length > 0) {
        throw new Error(`Invalid trip data found. Please check trip names, destinations, and budgets.`);
      }

      const invalidExpenses = expenses.filter(expense => 
        !expense.description || isNaN(expense.amount) || expense.amount <= 0
      );
      if (invalidExpenses.length > 0) {
        throw new Error(`Invalid expense data found. Please check expense descriptions and amounts.`);
      }

      return { trips, expenses };
    } catch (error) {
      console.error('CSV import error:', error);
      throw new Error(`Failed to import CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async validateCSVFormat(fileUri: string): Promise<{ isValid: boolean, errors: string[], preview: CSVRow[] }> {
    try {
      const csvContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const parseResult = Papa.parse<CSVRow>(csvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      const errors: string[] = [];
      
      // Check for parsing errors
      if (parseResult.errors.length > 0) {
        errors.push(...parseResult.errors.map(e => e.message));
      }

      // Check for required columns
      const requiredColumns = ['TripID', 'TripName', 'Destination', 'StartDate', 'EndDate', 'Budget', 'Currency'];
      const headers = Object.keys(parseResult.data[0] || {});
      
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Get preview (first 5 rows)
      const preview = parseResult.data.slice(0, 5);

      return {
        isValid: errors.length === 0,
        errors,
        preview,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: [`Failed to read CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        preview: [],
      };
    }
  }
}
