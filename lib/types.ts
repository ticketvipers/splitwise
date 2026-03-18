export interface Member {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  members: Member[];
  createdAt: string;
}

export interface Split {
  memberId: string;
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string; // member id
  splits: Split[];
  createdAt: string;
  settled: boolean;
}

export interface Balance {
  from: string; // member id
  to: string;   // member id
  amount: number;
}
