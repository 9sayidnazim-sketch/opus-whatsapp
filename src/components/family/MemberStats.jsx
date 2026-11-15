import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/utils";

export default function MemberStats({ members = [], transactions = [] }) {
  const stats = useMemo(() => {
    return members.map((member, index) => {
      // Split transactions across members or by created_by if specified
      const memberTransactions = transactions.filter(
        t => t.created_by === member.email || (!t.created_by && index === 0)
      );

      const income = memberTransactions
        .filter(t => t.type === 'receita')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const expense = memberTransactions
        .filter(t => t.type === 'despesa')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      return {
        ...member,
        income,
        expense,
        net: income - expense,
        count: memberTransactions.length,
      };
    });
  }, [members, transactions]);

  return (
    <Card className="rounded-2xl border-border bg-card">
      <CardHeader className="p-5 border-b border-border/80">
        <CardTitle className="text-base font-semibold text-foreground">
          Member Contributions
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-0.5">
          Income and expenses recorded per household member
        </p>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        {stats.map((m) => (
          <div key={m.id} className="p-3.5 rounded-xl bg-secondary/30 border border-border/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm text-foreground">{m.name}</span>
              <span className="text-xs font-bold tabular-nums font-heading text-[#B5F13E]">
                {formatCurrency(m.net, { showSign: true })}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
              <span className="flex items-center gap-1 text-emerald-400">
                <ArrowUpRight className="w-3.5 h-3.5" /> Inflow: {formatCurrency(m.income)}
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <ArrowDownRight className="w-3.5 h-3.5" /> Outflow: {formatCurrency(m.expense)}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
