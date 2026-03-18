import { Expense, Balance, Member } from './types';

export function computeBalances(expenses: Expense[], members: Member[]): Balance[] {
  // net[memberId] = positive means owed money, negative means owes money
  const net: Record<string, number> = {};
  members.forEach(m => (net[m.id] = 0));

  expenses
    .filter(e => !e.settled)
    .forEach(expense => {
      // payer gets credited full amount
      net[expense.paidBy] = (net[expense.paidBy] || 0) + expense.amount;
      // each split member is debited their share
      expense.splits.forEach(split => {
        net[split.memberId] = (net[split.memberId] || 0) - split.amount;
      });
    });

  // Settle using greedy algorithm
  const balances: Balance[] = [];
  const creditors = members
    .filter(m => (net[m.id] || 0) > 0.005)
    .map(m => ({ id: m.id, amount: net[m.id] }));
  const debtors = members
    .filter(m => (net[m.id] || 0) < -0.005)
    .map(m => ({ id: m.id, amount: -net[m.id] }));

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
