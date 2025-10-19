import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Trip, Expense } from '@/types';

interface TripSummary {
  trip: Trip;
  expenses: Expense[];
  totalSpent: number;
  remainingBudget: number;
  categoryBreakdown: Record<string, number>;
  settlements?: any[];
  balances?: any[];
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

  static async generateComprehensiveTripPDF(tripSummary: TripSummary): Promise<string> {
    const html = this.generateComprehensiveTripHTML(tripSummary);
    
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
    const { trip, expenses, totalSpent, remainingBudget, categoryBreakdown, settlements = [], balances = [] } = summary;
    
    const categoryRows = Object.entries(categoryBreakdown)
      .map(([category, amount]) => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${trip.currency || '₹'}${amount.toFixed(2)}</td>
        </tr>
      `).join('');

    const expenseRows = expenses.map(expense => {
      const splitInfo = expense.splitBetween && expense.splitBetween.length > 0 
        ? `<br><small style="color: #666;">Split: ${expense.splitType} (${expense.splitBetween.length} people)</small>`
        : '';
      const receiptInfo = expense.receiptImages && expense.receiptImages.length > 0
        ? `<br><small style="color: #666;">📷 ${expense.receiptImages.length} receipt(s)</small>`
        : '';
      const notesInfo = expense.notes 
        ? `<br><small style="color: #666;">📝 ${expense.notes}</small>`
        : '';
      
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            ${expense.description}
            ${splitInfo}
            ${receiptInfo}
            ${notesInfo}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${expense.category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(expense.date).toLocaleDateString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${expense.currency || trip.currency || '₹'}${expense.amount.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${expense.paidBy || 'Unknown'}</td>
        </tr>
      `;
    }).join('');

    // Generate participant information
    const participantRows = trip.participants.map(participant => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${participant.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${participant.email || 'N/A'}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${participant.phone || 'N/A'}</td>
      </tr>
    `).join('');

    // Generate settlement information
    const settlementRows = settlements.map(settlement => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${settlement.from}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${settlement.to}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${settlement.currency || '₹'}${settlement.amount.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(settlement.settledAt).toLocaleDateString()}</td>
      </tr>
    `).join('');

    // Generate balance information
    const balanceRows = balances.map(balance => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${balance.from}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${balance.to}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${balance.currency || '₹'}${balance.amount.toFixed(2)}</td>
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
            <div class="info-value">${trip.currency || '₹'}${trip.budget.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Spent</div>
            <div class="info-value">${trip.currency || '₹'}${totalSpent.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Remaining</div>
            <div class="info-value">${trip.currency || '₹'}${remainingBudget.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Expenses</div>
            <div class="info-value">${expenses.length}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Participants</div>
            <div class="info-value">${trip.participants.length}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Group Trip</div>
            <div class="info-value">${trip.isGroupTrip ? 'Yes' : 'No'}</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">Trip Participants</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              ${participantRows}
            </tbody>
          </table>
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
                <th>Paid By</th>
              </tr>
            </thead>
            <tbody>
              ${expenseRows}
            </tbody>
          </table>
        </div>

        ${settlements.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Settlements</h2>
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Settled Date</th>
              </tr>
            </thead>
            <tbody>
              ${settlementRows}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${balances.length > 0 ? `
        <div class="section">
          <h2 class="section-title">Outstanding Balances</h2>
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${balanceRows}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Travel Expense Tracker v1.0.0</p>
        </div>
      </body>
      </html>
    `;
  }

  private static generateComprehensiveTripHTML(summary: TripSummary): string {
    const { trip, expenses, totalSpent, remainingBudget, categoryBreakdown, settlements = [], balances = [] } = summary;
    
    // Generate detailed expense rows with split information
    const detailedExpenseRows = expenses.map(expense => {
      const splitDetails = expense.splitBetween && expense.splitBetween.length > 0 
        ? expense.splitBetween.map(split => 
            `<div style="margin-left: 20px; font-size: 12px; color: #666;">
              • ${split.userName}: ${split.percentage ? `${split.percentage}%` : `${expense.currency || trip.currency || '₹'}${split.amount.toFixed(2)}`}
            </div>`
          ).join('')
        : '';
      
      const receiptInfo = expense.receiptImages && expense.receiptImages.length > 0
        ? `<div style="margin-left: 20px; font-size: 12px; color: #666;">📷 ${expense.receiptImages.length} receipt image(s)</div>`
        : '';
      
      const notesInfo = expense.notes 
        ? `<div style="margin-left: 20px; font-size: 12px; color: #666;">📝 ${expense.notes}</div>`
        : '';
      
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">
            <div><strong>${expense.description}</strong></div>
            <div style="font-size: 12px; color: #666;">Paid by: ${expense.paidBy || 'Unknown'}</div>
            <div style="font-size: 12px; color: #666;">Split Type: ${expense.splitType || 'None'}</div>
            ${splitDetails}
            ${receiptInfo}
            ${notesInfo}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${expense.category}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(expense.date).toLocaleDateString()}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;"><strong>${expense.currency || trip.currency || '₹'}${expense.amount.toFixed(2)}</strong></td>
        </tr>
      `;
    }).join('');

    // Generate category breakdown with percentages
    const categoryRows = Object.entries(categoryBreakdown)
      .sort(([,a], [,b]) => b - a)
      .map(([category, amount]) => {
        const percentage = totalSpent > 0 ? ((amount / totalSpent) * 100).toFixed(1) : '0.0';
        return `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${category}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${trip.currency || '₹'}${amount.toFixed(2)}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${percentage}%</td>
          </tr>
        `;
      }).join('');

    // Generate participant information with spending details
    const participantRows = trip.participants.map(participant => {
      const participantExpenses = expenses.filter(e => e.paidBy === participant.id);
      const participantTotal = participantExpenses.reduce((sum, e) => sum + e.amount, 0);
      
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${participant.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${participant.email || 'N/A'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${participant.phone || 'N/A'}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${trip.currency || '₹'}${participantTotal.toFixed(2)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${participantExpenses.length}</td>
        </tr>
      `;
    }).join('');

    // Generate settlement information
    const settlementRows = settlements.map(settlement => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${settlement.from}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${settlement.to}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${settlement.currency || '₹'}${settlement.amount.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(settlement.settledAt).toLocaleDateString()}</td>
      </tr>
    `).join('');

    // Generate balance information
    const balanceRows = balances.map(balance => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${balance.from}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${balance.to}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${balance.currency || '₹'}${balance.amount.toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Comprehensive Trip Report - ${trip.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
            color: #462b77;
            line-height: 1.4;
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
            flex-wrap: wrap;
          }
          .info-item {
            text-align: center;
            min-width: 120px;
            margin: 5px;
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
            margin-bottom: 30px;
            page-break-inside: avoid;
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
            font-size: 14px;
          }
          th {
            background-color: #462b77;
            color: white;
            padding: 12px 8px;
            text-align: left;
            font-weight: bold;
          }
          td {
            padding: 8px;
            border-bottom: 1px solid #eee;
            vertical-align: top;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          .highlight {
            background-color: #f0f9ff;
            padding: 10px;
            border-radius: 5px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 Comprehensive Trip Report</h1>
          <h2>${trip.name}</h2>
          <p>${trip.destination} • ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}</p>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
        </div>

        <div class="trip-info">
          <div class="info-item">
            <div class="info-label">Total Budget</div>
            <div class="info-value">${trip.currency || '₹'}${trip.budget.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Spent</div>
            <div class="info-value">${trip.currency || '₹'}${totalSpent.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Remaining</div>
            <div class="info-value">${trip.currency || '₹'}${remainingBudget.toFixed(2)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Total Expenses</div>
            <div class="info-value">${expenses.length}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Participants</div>
            <div class="info-value">${trip.participants.length}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Group Trip</div>
            <div class="info-value">${trip.isGroupTrip ? 'Yes' : 'No'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Currency</div>
            <div class="info-value">${trip.currency || 'INR'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Trip Duration</div>
            <div class="info-value">${Math.ceil((new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) / (1000 * 60 * 60 * 24))} days</div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">👥 Trip Participants & Spending</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Total Paid</th>
                <th>Expenses</th>
              </tr>
            </thead>
            <tbody>
              ${participantRows}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2 class="section-title">📊 Spending by Category</h2>
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>Amount</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>
        </div>

        <div class="section">
          <h2 class="section-title">💰 Detailed Expense Breakdown</h2>
          <table>
            <thead>
              <tr>
                <th>Description & Details</th>
                <th>Category</th>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${detailedExpenseRows}
            </tbody>
          </table>
        </div>

        ${settlements.length > 0 ? `
        <div class="section">
          <h2 class="section-title">✅ Completed Settlements</h2>
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
                <th>Settled Date</th>
              </tr>
            </thead>
            <tbody>
              ${settlementRows}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${balances.length > 0 ? `
        <div class="section">
          <h2 class="section-title">⚖️ Outstanding Balances</h2>
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>To</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              ${balanceRows}
            </tbody>
          </table>
        </div>
        ` : ''}

        <div class="footer">
          <p>📱 Generated by Travel Expense Tracker v1.0.0</p>
          <p>This comprehensive report includes all trip details, expenses, splits, settlements, and balances.</p>
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
