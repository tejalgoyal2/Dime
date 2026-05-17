export type ExpenseRow = {
  id: string;
  user_id: string;
  item_name: string;
  amount: number;
  category: string;
  type: "Need" | "Want";
  date: string;
  emoji: string | null;
  created_at: string;
};

export type ExpenseInsert = Omit<ExpenseRow, "id" | "created_at">;
