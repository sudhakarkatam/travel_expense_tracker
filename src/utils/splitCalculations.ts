import { Expense, Settlement, Balance, SplitParticipant, Participant } from "@/types";

/**
 * SPLITWISE-STYLE CALCULATION ENGINE
 *
 * Mathematical Model:
 * - Each person has: totalPaid (what they paid) and totalOwed (their share)
 * - netBalance = totalPaid - totalOwed
 * - If netBalance > 0: person is owed money (creditor)
 * - If netBalance < 0: person owes money (debtor)
 * - If netBalance = 0: person is settled
 */

export interface ParticipantBalance {
  participantId: string;
  participantName: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface SettlementSuggestion {
  from: string;
  to: string;
  amount: number;
  description: string;
}

/**
 * Calculate split amounts for an expense
 * Ensures cent-perfect distribution
 */
export function calculateSplit(
  amount: number,
  splitType: "equal" | "percentage" | "custom",
  participants: SplitParticipant[],
  customValues?: Record<string, number>,
): SplitParticipant[] {
  if (participants.length === 0) return [];
  if (amount <= 0) return participants.map((p) => ({ ...p, amount: 0 }));

  // Convert to cents to avoid floating point errors
  const amountCents = Math.round(amount * 100);

  switch (splitType) {
    case "equal": {
      const n = participants.length;
      const baseCents = Math.floor(amountCents / n);
      const remainderCents = amountCents - baseCents * n;

      // Distribute remainder to first N participants
      return participants.map((p, idx) => ({
        ...p,
        amount: (baseCents + (idx < remainderCents ? 1 : 0)) / 100,
        percentage: 100 / n,
      }));
    }

    case "percentage": {
      const totalPercentage = participants.reduce(
        (sum, p) => sum + (p.percentage || 0),
        0,
      );

      // Validate percentages
      if (Math.abs(totalPercentage - 100) > 0.5) {
        throw new Error(
          `Percentages must total 100% (currently ${totalPercentage.toFixed(1)}%)`,
        );
      }

      // Calculate amounts in cents
      const amounts = participants.map((p) =>
        Math.round((amountCents * (p.percentage || 0)) / 100),
      );

      // Adjust for rounding differences
      let totalCents = amounts.reduce((sum, val) => sum + val, 0);
      let diff = amountCents - totalCents;

      // Distribute difference to participants with largest percentages
      const sortedIndices = participants
        .map((p, idx) => ({ idx, percentage: p.percentage || 0 }))
        .sort((a, b) => b.percentage - a.percentage)
        .map((x) => x.idx);

      for (let i = 0; i < sortedIndices.length && diff !== 0; i++) {
        const idx = sortedIndices[i];
        if (diff > 0) {
          amounts[idx]++;
          diff--;
        } else if (diff < 0) {
          amounts[idx]--;
          diff++;
        }
      }

      return participants.map((p, idx) => ({
        ...p,
        amount: amounts[idx] / 100,
      }));
    }

    case "custom": {
      if (!customValues) {
        throw new Error("Custom values required for custom split");
      }

      const totalCustom = Object.values(customValues).reduce(
        (sum, val) => sum + val,
        0,
      );

      const diff = Math.abs(totalCustom - amount);
      if (diff > 0.01) {
        throw new Error(
          `Custom amounts must total ${amount.toFixed(2)} (currently ${totalCustom.toFixed(2)}, difference: ${diff.toFixed(2)})`,
        );
      }

      return participants.map((p) => ({
        ...p,
        amount: customValues[p.userId] || 0,
      }));
    }

    default:
      throw new Error("Invalid split type");
  }
}

/**
 * Calculate participant balances from expenses and settlements
 * Core algorithm for determining who owes whom
 */
export function validateSplit(
  amount: number,
  splitType: "equal" | "percentage" | "custom",
  participants: SplitParticipant[],
  customValues?: Record<string, number>,
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (participants.length === 0) {
    errors.push("At least one participant is required");
  }

  if (amount <= 0) {
    errors.push("Amount must be greater than 0");
  }

  if (amount < 0.01) {
    errors.push("Amount too small to split (minimum $0.01)");
  }

  switch (splitType) {
    case "percentage": {
      const totalPercentage = participants.reduce(
        (sum, p) => sum + (p.percentage || 0),
        0,
      );

      if (Math.abs(totalPercentage - 100) > 0.5) {
        errors.push(
          `Percentages must total 100% (currently ${totalPercentage.toFixed(1)}%)`,
        );
      }

      participants.forEach((p) => {
        if ((p.percentage || 0) < 0) {
          errors.push(`${p.userName} has negative percentage`);
        }
        if ((p.percentage || 0) > 100) {
          errors.push(`${p.userName} has percentage over 100%`);
        }
      });
      break;
    }

    case "custom": {
      if (!customValues) {
        errors.push("Custom values are required for custom split");
      } else {
        const totalCustom = Object.values(customValues).reduce(
          (sum, val) => sum + val,
          0,
        );
        const difference = Math.abs(totalCustom - amount);

        if (difference > 0.01) {
          errors.push(
            `Custom amounts must total ${amount.toFixed(2)} (currently ${totalCustom.toFixed(2)}, difference: ${difference.toFixed(2)})`,
          );
        }

        Object.entries(customValues).forEach(([userId, value]) => {
          if (value < 0) {
            const participant = participants.find((p) => p.userId === userId);
            errors.push(
              `${participant?.userName || userId} has negative amount`,
            );
          }
        });
      }
      break;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate balances from expenses and settlements
 * Returns who owes whom
 */
export function calculateBalances(
  expenses: Expense[],
  settlements: Settlement[],
  participants: Participant[],
): Balance[] {
  // Map<Debtor, Map<Creditor, Amount>>
  const balanceMap = new Map<string, Map<string, number>>();

  // Helper to update balance
  const updateBalance = (from: string, to: string, amount: number) => {
    if (!balanceMap.has(from)) {
      balanceMap.set(from, new Map());
    }
    const userBalances = balanceMap.get(from)!;
    const currentBalance = userBalances.get(to) || 0;
    userBalances.set(to, currentBalance + amount);
  };

  expenses.forEach((expense) => {
    const { paidBy, splitBetween } = expense;

    splitBetween.forEach((participant) => {
      if (participant.userId === paidBy) return;
      // participant.userId owes paidBy participant.amount
      updateBalance(participant.userId, paidBy, participant.amount);
    });
  });

  settlements.forEach((settlement) => {
    const { from, to, amount } = settlement;
    // Settlement reduces the amount 'from' owes 'to'
    // Effectively, it's like 'to' owing 'from' the settlement amount, canceling out the debt
    updateBalance(from, to, -amount);
  });

  const balances: Balance[] = [];
  const defaultCurrency = expenses[0]?.currency || "USD";

  // Normalize balances
  // If A owes B -20, it means B owes A 20
  const allUsers = new Set([...balanceMap.keys()]);
  balanceMap.forEach((map) => map.forEach((_, key) => allUsers.add(key)));

  // We need to consolidate. 
  // If A owes B 50 and B owes A 20, net is A owes B 30.
  // If A owes B -20, net is B owes A 20.

  // Let's flatten to a single list of net debts
  // We can use a canonical ordering of IDs to avoid double counting
  const userIds = Array.from(allUsers).sort();

  for (let i = 0; i < userIds.length; i++) {
    for (let j = i + 1; j < userIds.length; j++) {
      const userA = userIds[i];
      const userB = userIds[j];

      const aOwesB = balanceMap.get(userA)?.get(userB) || 0;
      const bOwesA = balanceMap.get(userB)?.get(userA) || 0;

      const netAOwesB = aOwesB - bOwesA;

      if (netAOwesB > 0.01) {
        balances.push({
          from: userA,
          to: userB,
          amount: Math.round(netAOwesB * 100) / 100,
          currency: defaultCurrency,
        });
      } else if (netAOwesB < -0.01) {
        balances.push({
          from: userB,
          to: userA,
          amount: Math.round(-netAOwesB * 100) / 100,
          currency: defaultCurrency,
        });
      }
    }
  }

  return balances;
}

/**
 * Simplify balances by netting out circular debts
 */
export function simplifyBalances(
  balances: Balance[],
  participants?: Participant[],
): Balance[] {
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
  const defaultCurrency = balances[0]?.currency || "USD";

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const amount = Math.min(creditor.amount, debtor.amount);

    simplified.push({
      from: debtor.id,
      to: creditor.id,
      amount: Math.round(amount * 100) / 100,
      currency: defaultCurrency,
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return simplified;
}

/**
 * Get participant spending summary
 */
export function getParticipantSpending(
  expenses: Expense[],
  settlements: Settlement[],
  participants: Participant[],
): ParticipantBalance[] {
  const participantMap = new Map<
    string,
    { totalPaid: number; totalOwed: number; expenseCount: number }
  >();

  // Initialize all participants
  participants.forEach((p) => {
    participantMap.set(p.id, {
      totalPaid: 0,
      totalOwed: 0,
      expenseCount: 0,
    });
  });

  expenses.forEach((expense) => {
    const paidBy = expense.paidBy;
    const participant = participantMap.get(paidBy);
    if (participant) {
      participant.totalPaid += expense.amount;
      participant.expenseCount += 1;
    }

    expense.splitBetween.forEach((split) => {
      const splitParticipant = participantMap.get(split.userId);
      if (splitParticipant) {
        splitParticipant.totalOwed += split.amount;
      }
    });
  });

  // Apply settlements
  settlements.forEach((settlement) => {
    const fromParticipant = participantMap.get(settlement.from);
    const toParticipant = participantMap.get(settlement.to);
    if (fromParticipant) {
      fromParticipant.totalOwed -= settlement.amount;
    }
    if (toParticipant) {
      toParticipant.totalPaid -= settlement.amount;
    }
  });

  return Array.from(participantMap.entries()).map(([participantId, data]) => {
    const participant = participants.find((p) => p.id === participantId);
    return {
      participantId,
      participantName: participant?.name || "Unknown",
      totalPaid: data.totalPaid,
      totalOwed: data.totalOwed,
      netBalance: data.totalPaid - data.totalOwed,
    };
  });
}

/**
 * Suggest optimal settlement transactions
 */
export function suggestSettlements(
  balances: Balance[],
  participants: Participant[],
): SettlementSuggestion[] {
  const simplified = simplifyBalances(balances, participants);
  return simplified.map((balance) => {
    const fromParticipant = participants.find((p) => p.id === balance.from);
    const toParticipant = participants.find((p) => p.id === balance.to);
    return {
      from: balance.from,
      to: balance.to,
      amount: balance.amount,
      description: `${fromParticipant?.name || balance.from} should pay ${toParticipant?.name || balance.to} ${balance.amount.toFixed(2)} ${balance.currency}`,
    };
  });
}
