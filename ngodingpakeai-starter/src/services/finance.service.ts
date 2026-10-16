import "server-only";
import { and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { financeEntries } from "@/db/schema";
import type { FinanceSummaryQueryInput } from "@/validators/finance";

const iso = (date: Date) => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return copy.toISOString().slice(0, 10);
};

const rangeFor = (period: FinanceSummaryQueryInput["period"]) => {
  const now = new Date();
  if (period === "week") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    return { from: iso(start), to: iso(now) };
  }
  if (period === "year") {
    return {
      from: `${now.getFullYear()}-01-01`,
      to: `${now.getFullYear()}-12-31`,
    };
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: iso(start), to: iso(end) };
};

type EntryRow = { type: string; category: string; total: string };

export async function summarizeFinance(input: FinanceSummaryQueryInput) {
  const { from, to } = rangeFor(input.period);

  const rows = await db
    .select({
      type: financeEntries.type,
      category: financeEntries.category,
      total: sql<string>`sum(${financeEntries.amount})`,
    })
    .from(financeEntries)
    .where(and(gte(financeEntries.date, from), lte(financeEntries.date, to)))
    .groupBy(financeEntries.type, financeEntries.category);

  const grouped: EntryRow[] = rows.map((row) => ({
    type: row.type,
    category: row.category,
    total: row.total ?? "0",
  }));

  const toEntries = (type: "income" | "expense") =>
    grouped
      .filter((row) => row.type === type)
      .map((row) => ({ label: row.category, amount: Number(row.total) }))
      .filter((row) => Number.isFinite(row.amount))
      .sort((a, b) => b.amount - a.amount);

  const income = toEntries("income");
  const expense = toEntries("expense");
  const incomeTotal = income.reduce((sum, row) => sum + row.amount, 0);
  const expenseTotal = expense.reduce((sum, row) => sum + row.amount, 0);
  const net = incomeTotal - expenseTotal;
  const margin =
    incomeTotal === 0 ? 0 : Math.round((net / incomeTotal) * 100);

  return {
    data: {
      period: input.period,
      from,
      to,
      income,
      expense,
      incomeTotal,
      expenseTotal,
      net,
      margin,
    },
  };
}
