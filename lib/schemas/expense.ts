import { z } from "zod/v4";

export const expenseTypeSchema = z.enum(["Need", "Want"]);

export const createExpenseSchema = z.object({
  item_name: z.string().min(1).max(200),
  amount: z.number().positive().max(1_000_000),
  category: z.string().min(1).max(50),
  type: expenseTypeSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  emoji: z.string().max(10).nullable().optional(),
});

export const parsedExpenseSchema = z.object({
  is_expense: z.boolean(),
  item_name: z.string(),
  amount: z.number(),
  category: z.string(),
  type: expenseTypeSchema,
  date: z.string(),
  emoji: z.string(),
  funny_comment: z.string(),
});

export const deleteExpenseSchema = z.object({
  id: z.string().uuid(),
});

export const patchExpenseSchema = z.object({
  id: z.string().uuid(),
  item_name: z.string().min(1).max(200).optional(),
  amount: z.number().positive().max(1_000_000).optional(),
  category: z.string().min(1).max(50).optional(),
  type: expenseTypeSchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type ParsedExpense = z.infer<typeof parsedExpenseSchema>;
