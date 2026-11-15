import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiggyBank, ArrowRight, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl, getCategoryLabel, formatCurrency } from "@/utils";

export default function BudgetsOverview({ budgetsWithSpent, isLoading }) {
  if (isLoading) {
    return (
      <Card className="rounded-2xl bg-card border-border">
        <CardHeader className="p-4 sm:p-6 border-b border-border/80">
          <CardTitle className="text-base font-semibold">Monthly Budgets</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const budgets = budgetsWithSpent || [];

  if (budgets.length === 0) {
    return (
      <Card className="rounded-2xl bg-card border-border">
        <CardHeader className="p-4 sm:p-6 border-b border-border/80">
          <CardTitle className="text-base font-semibold text-foreground">Monthly Budgets</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <PiggyBank className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-60" />
          <p className="text-sm text-muted-foreground mb-4">No budget categories configured</p>
          <Link
            to={createPageUrl("Budgets")}
            className="inline-flex items-center px-3.5 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
          >
            Set up budgets
          </Link>
        </CardContent>
      </Card>
    );
  }

  const topBudgets = [...budgets]
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 4);

  return (
    <Card className="rounded-2xl bg-card border-border">
      <CardHeader className="p-4 sm:p-6 border-b border-border/80 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">Budget Utilization</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Category limits this month</p>
        </div>
        <Link
          to={createPageUrl("Budgets")}
          className="text-xs font-semibold text-[#B5F13E] hover:underline inline-flex items-center gap-1"
        >
          Manage <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {topBudgets.map((budget) => {
          const percent = Math.min(Math.round(budget.percentage || 0), 100);
          const isOver = (budget.percentage || 0) > 100;
          const isWarning = (budget.percentage || 0) >= (budget.alert_threshold || 80);

          return (
            <div key={budget.id || budget.category} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground flex items-center gap-1.5">
                  {getCategoryLabel(budget.category)}
                  {isOver && <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  <span className={isOver ? 'text-rose-400 font-semibold' : 'text-foreground font-medium'}>
                    {formatCurrency(budget.spent)}
                  </span>
                  {' / '}{formatCurrency(budget.amount)}
                </span>
              </div>

              {/* Custom styled progress track */}
              <div className="w-full h-2 rounded-full bg-secondary/80 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isOver ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : 'bg-[#B5F13E]'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
