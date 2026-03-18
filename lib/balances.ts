import { Expense, Balance, Member, Settlement } from './types';

export function computeBalances(expenses: Expense[], members: Member[], settlements: Settlement[] = []): Balance[] {
  // net[memberId] = positive means owed money, negative means owes money
  const net: Record<string, number> = {};
  members.forEach(m => (net[m.id] = 0));

  expenses.forEach(expense => {
    // payer gets credited full amount
    net[expense.paidBy] = (net[expense.paidBy] || 0) + expense.amount;
    // each split member is debited their share
    expense.splits.forEach(split => {
      net[split.memberId] = (net[split.memberId] || 0) - split.amount;
    });
  });

  // Apply settlements: payer's balance increases (they paid), payee's decreases
  settlements.forEach(s => {
    net[s.payerId] = (net[s.payerId] || 0) + s.amount;
    net[s.payeeId] = (net[s.payeeId] || 0) - s.amount;
  });

  // Settle using greedy algorithm (minimize transactions)
  const balances: Balance[] = [];
  const creditors = members
    .filter(m => (net[m.id] || 0) > 0.005)
    .map(m => ({ id: m.id, amount: net[m.id] }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = members
    .filter(m => (net[m.id] || 0) < -0.005)
    .map(m => ({ id: m.id, amount: -net[m.id] }))
    .sort((a, b) => b.amount - a.amount);

  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);
    balances.push({ from: d.id, to: c.id, amount: Math.round(amount * 100) / 100 });
    c.amount -= amount;
    d.amount -= amount;
    if (c.amount < 0.005) ci++;
    if (d.amount < 0.005) di++;
  }

  return balances;
}

export function getMemberName(members: Member[], id: string): string {
  return members.find(m => m.id === id)?.name ?? 'Unknown';
}
