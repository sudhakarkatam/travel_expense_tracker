import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Trip, Expense } from '@/types';

interface TripSummary {
  trip: Trip;
  expenses: Expense[];
  totalSpent: number;
  remainingBudget: number;
  categoryBreakdown: Record<string, number>;
}

export class PDFExportService {
  static async generateTripSummaryPDF(tripSummary: TripSummary): Promise<string> {
    const html = this.generateTripSummaryHTML(tripSummary);
    
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      return uri;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  static async generateAllTripsSummaryPDF(trips: TripSummary[]): Promise<string> {
    const html = this.generateAllTripsSummaryHTML(trips);
    
    try {
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
      });
      return uri;
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF');
    }
  }

  private static generateTripSummaryHTML(summary: TripSummary): string {
    const { trip, expenses, totalSpent, remainingBudget, categoryBreakdown } = summary;
    
    const categoryRows = Object.entries(categoryBreakdown)
      .map(([category, amount]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${amount.toFixed(2)}</td>
        </tr>
      `).join('');

    const expenseRows = expenses.map(expense => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${expense.description}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${expense.category}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(expense.date).toLocaleDateString()}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${expense.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Trip Summary - ${trip.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #462b77;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #462b77, #8b5cf6);
            color: white;
            border-radius: 8px;
          }
          .trip-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            background-color: #f8f9fa;
            border-radius: 8px;
          }
          .info-item {
            text-align: center;
          }
          .info-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 18px;
            font-weight: bold;
            color: #462b77;
          }
          .section {
            margin-bottom: 25px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #462b77;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #462b77;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background-color: #462b77;
            color: white;
            padding: 12px 8px;
            text-align: left;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${trip.name}</h1>
          <p>${trip.destination} • ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}</p>
        </div>

        <div class="trip-info">
          <div class="info-item">
            <div class="info-label">Total Budget</div>
            <div class="info-value">$${trip.budget.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Spent</div>
            <div class="info-value">$${totalSpent.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Remaining</div>
            <div class="info-value">$${remainingBudget.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Expenses</div>
            <div class="info-value">${expenses.length}</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Spending by Category</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2 class="section-title">Expense Details</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRows}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Travel Expense Tracker v1.0.0</p>
        </div>
      </body>
      </html>
    `;
  }

  private static generateAllTripsSummaryHTML(summaries: TripSummary[]): string {
    const totalSpent = summaries.reduce((sum, s) => sum + s.totalSpent, 0);
    const totalBudget = summaries.reduce((sum, s) => sum + s.trip.budget, 0);
    const totalExpenses = summaries.reduce((sum, s) => sum + s.expenses.length, 0);

    const tripRows = summaries.map(summary => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${summary.trip.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${summary.trip.destination}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">$${summary.totalSpent.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">$${summary.trip.budget.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${summary.expenses.length}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>All Trips Summary</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #462b77;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #462b77, #8b5cf6);
            color: white;
            border-radius: 8px;
          }
          .summary-stats {
            display: flex;
            justify-content: space-around;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #f8f9fa;
            border-radius: 8px;
          }
          .stat-item {
            text-align: center;
          }
          .stat-label {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
          }
          .stat-value {
            font-size: 24px;
            font-weight: bold;
            color: #462b77;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #462b77;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #462b77;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background-color: #462b77;
            color: white;
            padding: 12px 8px;
            text-align: left;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #eee;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>All Trips Summary</h1>
          <p>Complete overview of all your travel expenses</p>
        </div>

        <div class="summary-stats">
          <div class="stat-item">
            <div class="stat-label">Total Trips</div>
            <div class="stat-value">${summaries.length}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Spent</div>
            <div class="stat-value">$${totalSpent.toFixed(2)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Budget</div>
            <div class="stat-value">$${totalBudget.toFixed(2)}</div>
          </div>
          <div class="stat-item">
            <div class="stat-label">Total Expenses</div>
            <div class="stat-value">${totalExpenses}</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Trip Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Trip Name</th>
                <th>Destination</th>
                <th>Total Spent</th>
                <th>Budget</th>
                <th>Expenses</th>
              </tr>
            </thead>
            <tbody>
              ${tripRows}
            </tbody>
          </table>
        </div>

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Travel Expense Tracker v1.0.0</p>
        </div>
      </body>
      </html>
    `;
  }
}
