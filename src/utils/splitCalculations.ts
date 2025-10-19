import { Expense, Settlement, Balance, SplitParticipant } from '@/types';

export interface ParticipantBalance {
  participantId: string;
  participantName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number; // Positive = owed money, Negative = owes money
}

export interface SettlementSuggestion {
  from: string;
  to: string;
  amount: number;
  description: string;
}

export function calculateSplit(
  amount: number,
  splitType: 'equal' | 'percentage' | 'custom',
  participants: SplitParticipant[],
  customValues?: Record<string, number>
): SplitParticipant[] {
  if (participants.length === 0) return [];

  switch (splitType) {
    case 'equal':
      const equalAmount = amount / participants.length;
      return participants.map(p => ({
        ...p,
        amount: equalAmount,
        percentage: 100 / participants.length,
      }));

    case 'percentage':
      const totalPercentage = participants.reduce((sum, p) => sum + (p.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error('Percentages must total 100%');
      }
      return participants.map(p => ({
        ...p,
        amount: (amount * (p.percentage || 0)) / 100,
      }));

    case 'custom':
      if (!customValues) {
        throw new Error('Custom values required for custom split');
      }
      const totalCustom = Object.values(customValues).reduce((sum, val) => sum + val, 0);
      if (Math.abs(totalCustom - amount) > 0.01) {
        throw new Error('Custom amounts must total the expense amount');
      }
      return participants.map(p => ({
        ...p,
        amount: customValues[p.userId] || 0,
      }));

    default:
      throw new Error('Invalid split type');
  }
}

export function calculateBalances(expenses: Expense[], settlements: Settlement[]): Balance[] {
  const participantBalances: Record<string, ParticipantBalance> = {};

  // Initialize participant balances
  (expenses || []).forEach(expense => {
    if (!participantBalances[expense.paidBy]) {
      participantBalances[expense.paidBy] = {
        participantId: expense.paidBy,
        participantName: 'Unknown', // Will be populated from participants
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
      };
    }

    (expense.splitBetween || []).forEach(split => {
      if (!participantBalances[split.userId]) {
        participantBalances[split.userId] = {
          participantId: split.userId,
          participantName: split.userName,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
        };
      }
    });
  });

  // Calculate total paid and owed
  (expenses || []).forEach(expense => {
    participantBalances[expense.paidBy].totalPaid += expense.amount;
    
    (expense.splitBetween || []).forEach(split => {
      participantBalances[split.userId].totalOwed += split.amount;
    });
  });

  // Apply settlements - CORRECTED VERSION
  (settlements || []).forEach(settlement => {
    // When someone settles (pays), they owe less
    if (participantBalances[settlement.from]) {
      participantBalances[settlement.from].totalOwed -= settlement.amount;
    }
    // When someone receives settlement, they are owed less (their totalOwed decreases)
    if (participantBalances[settlement.to]) {
      participantBalances[settlement.to].totalOwed -= settlement.amount;
    }
  });

  // Calculate net balances
  Object.values(participantBalances).forEach(balance => {
    balance.netBalance = balance.totalPaid - balance.totalOwed;
    // Positive = owed money TO this person (they paid more than they owe)
    // Negative = owes money FROM this person (they owe more than they paid)
  });

  // Convert to Balance array - create balances for all participants
  const balances: Balance[] = [];
  const participants = Object.values(participantBalances);
  
  // Find debtors and creditors
  const debtors = participants.filter(p => p.netBalance < -0.01);
  const creditors = participants.filter(p => p.netBalance > 0.01);
  
  // Create balance pairs between debtors and creditors
  debtors.forEach(debtor => {
    creditors.forEach(creditor => {
      const debtorDebt = Math.abs(debtor.netBalance);
      const creditorCredit = creditor.netBalance;
      const amount = Math.min(debtorDebt, creditorCredit);
      
      if (amount > 0.01) {
        balances.push({
          from: debtor.participantId,
          to: creditor.participantId,
          amount: amount,
          currency: 'INR', // Use INR as default
        });
      }
    });
  });

  return balances;
}

export function simplifyBalances(balances: Balance[]): Balance[] {
  if (balances.length <= 1) return balances;

  // Group by currency
  const currencyGroups: Record<string, Balance[]> = {};
  (balances || []).forEach(balance => {
    if (!currencyGroups[balance.currency]) {
      currencyGroups[balance.currency] = [];
    }
    currencyGroups[balance.currency].push(balance);
  });

  const simplifiedBalances: Balance[] = [];

  Object.values(currencyGroups).forEach(currencyBalances => {
    // Create a graph of who owes whom
    const graph: Record<string, Record<string, number>> = {};
    
    (currencyBalances || []).forEach(balance => {
      if (!graph[balance.from]) {
        graph[balance.from] = {};
      }
      graph[balance.from][balance.to] = balance.amount;
    });

    // Find optimal settlement paths using a simple algorithm
    const participants = new Set<string>();
    (currencyBalances || []).forEach(balance => {
      participants.add(balance.from);
      participants.add(balance.to);
    });

    const participantArray = Array.from(participants);
    
    // Calculate net amounts for each participant
    const netAmounts: Record<string, number> = {};
    (participantArray || []).forEach(participant => {
      netAmounts[participant] = 0;
    });

    (currencyBalances || []).forEach(balance => {
      netAmounts[balance.from] -= balance.amount;
      netAmounts[balance.to] += balance.amount;
    });

    // Create simplified balances
    const debtors = participantArray.filter(p => netAmounts[p] < -0.01);
    const creditors = participantArray.filter(p => netAmounts[p] > 0.01);

    let debtorIndex = 0;
    let creditorIndex = 0;

    while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
      const debtor = debtors[debtorIndex];
      const creditor = creditors[creditorIndex];
      const debtorDebt = Math.abs(netAmounts[debtor]);
      const creditorCredit = netAmounts[creditor];

      const settlementAmount = Math.min(debtorDebt, creditorCredit);

      if (settlementAmount > 0.01) {
        simplifiedBalances.push({
          from: debtor,
          to: creditor,
          amount: settlementAmount,
          currency: currencyBalances[0].currency,
        });
      }

      netAmounts[debtor] += settlementAmount;
      netAmounts[creditor] -= settlementAmount;

      if (Math.abs(netAmounts[debtor]) < 0.01) {
        debtorIndex++;
      }
      if (Math.abs(netAmounts[creditor]) < 0.01) {
        creditorIndex++;
      }
    }
  });

  return simplifiedBalances;
}

export function suggestSettlements(balances: Balance[]): SettlementSuggestion[] {
  const simplified = simplifyBalances(balances);
  
  return simplified.map(balance => ({
    from: balance.from,
    to: balance.to,
    amount: balance.amount,
    description: `${balance.from} owes ${balance.to} ${balance.currency} ${balance.amount.toFixed(2)}`,
  }));
}

export function getParticipantSpending(expenses: Expense[], settlements: Settlement[] = []): ParticipantBalance[] {
  const participantBalances: Record<string, ParticipantBalance> = {};

  // Initialize and calculate balances from expenses
  (expenses || []).forEach(expense => {
    if (!participantBalances[expense.paidBy]) {
      participantBalances[expense.paidBy] = {
        participantId: expense.paidBy,
        participantName: 'Unknown',
        totalPaid: 0,
        totalOwed: 0,
        netBalance: 0,
      };
    }

    participantBalances[expense.paidBy].totalPaid += expense.amount;

    (expense.splitBetween || []).forEach(split => {
      if (!participantBalances[split.userId]) {
        participantBalances[split.userId] = {
          participantId: split.userId,
          participantName: split.userName,
          totalPaid: 0,
          totalOwed: 0,
          netBalance: 0,
        };
      }
      participantBalances[split.userId].totalOwed += split.amount;
    });
  });

  // Apply settlements (SAME LOGIC AS calculateBalances)
  (settlements || []).forEach(settlement => {
    if (participantBalances[settlement.from]) {
      participantBalances[settlement.from].totalOwed -= settlement.amount;
    }
    if (participantBalances[settlement.to]) {
      participantBalances[settlement.to].totalOwed -= settlement.amount;
    }
  });

  // Calculate net balances
  Object.values(participantBalances).forEach(balance => {
    balance.netBalance = balance.totalPaid - balance.totalOwed;
    // Positive = owed money TO this person (they paid more than they owe)
    // Negative = owes money FROM this person (they owe more than they paid)
  });

  return Object.values(participantBalances).sort((a, b) => b.netBalance - a.netBalance);
}

export function validateSplit(
  amount: number,
  splitType: 'equal' | 'percentage' | 'custom',
  participants: SplitParticipant[],
  customValues?: Record<string, number>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (participants.length === 0) {
    errors.push('At least one participant is required');
  }

  if (amount <= 0) {
    errors.push('Amount must be greater than 0');
  }

  switch (splitType) {
    case 'percentage':
      const totalPercentage = participants.reduce((sum, p) => sum + (p.percentage || 0), 0);
      if (Math.abs(totalPercentage - 100) > 0.01) {
        errors.push('Percentages must total 100%');
      }
      break;

    case 'custom':
      if (!customValues) {
        errors.push('Custom values are required for custom split');
      } else {
        const totalCustom = Object.values(customValues).reduce((sum, val) => sum + val, 0);
        if (Math.abs(totalCustom - amount) > 0.01) {
          errors.push('Custom amounts must total the expense amount');
        }
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
