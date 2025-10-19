import { Expense, Balance, Settlement } from '@/types';

export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  tripId: string
): Balance[] {
  const tripExpenses = expenses.filter(e => e.tripId === tripId);
  const tripSettlements = settlements.filter(s => s.tripId === tripId);

  const balanceMap = new Map<string, Map<string, number>>();

  tripExpenses.forEach(expense => {
    const { paidBy, splitBetween } = expense;
    
    splitBetween.forEach(participant => {
      if (participant.userId === paidBy) return;

      if (!balanceMap.has(participant.userId)) {
        balanceMap.set(participant.userId, new Map());
      }
      
      const userBalances = balanceMap.get(participant.userId)!;
      const currentBalance = userBalances.get(paidBy) || 0;
      userBalances.set(paidBy, currentBalance + participant.amount);
    });
  });

  tripSettlements.forEach(settlement => {
    const { from, to, amount } = settlement;
    
    if (balanceMap.has(from)) {
      const userBalances = balanceMap.get(from)!;
      const currentBalance = userBalances.get(to) || 0;
      const newBalance = currentBalance - amount;
      
      if (Math.abs(newBalance) < 0.01) {
        userBalances.delete(to);
      } else {
        userBalances.set(to, newBalance);
      }
    }
  });

  const balances: Balance[] = [];
  
  balanceMap.forEach((userBalances, from) => {
    userBalances.forEach((amount, to) => {
      if (amount > 0.01) {
        balances.push({
          from,
          to,
          amount: Math.round(amount * 100) / 100,
          currency: tripExpenses[0]?.currency || 'USD',
        });
      }
    });
  });

  return simplifyBalances(balances);
}

function simplifyBalances(balances: Balance[]): Balance[] {
  const netBalances = new Map<string, number>();

  balances.forEach(({ from, to, amount }) => {
    netBalances.set(from, (netBalances.get(from) || 0) - amount);
    netBalances.set(to, (netBalances.get(to) || 0) + amount);
  });

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  netBalances.forEach((balance, id) => {
    if (balance > 0.01) {
      creditors.push({ id, amount: balance });
    } else if (balance < -0.01) {
      debtors.push({ id, amount: -balance });
    }
  });

  const simplified: Balance[] = [];
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.amount, debtor.amount);

    simplified.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(amount * 100) / 100,
      currency: balances[0]?.currency || 'USD',
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return simplified;
}

export function getTotalOwed(balances: Balance[], userId: string): number {
  return balances
    .filter(b => b.from === userId)
    .reduce((sum, b) => sum + b.amount, 0);
}

export function getTotalOwedToYou(balances: Balance[], userId: string): number {
  return balances
    .filter(b => b.to === userId)
    .reduce((sum, b) => sum + b.amount, 0);
}
