import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, ArrowRight, Plus } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { formatCurrency, getCategoryLabel, createPageUrl } from "@/utils";

export default function RecentTransactions({ transactions, isLoading }) {
  const recentTransactions = (transactions || []).slice(0, 7);

  return (
    <Card className="min-w-0 rounded-2xl bg-card border-border">
      <CardHeader className="p-4 sm:p-6 border-b border-border/80 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base sm:text-lg font-semibold text-foreground">Recent Activity</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">Latest household transactions</p>
        </div>
        <Link
          to={createPageUrl("Transactions")}
          className="text-xs font-semibold text-[#B5F13E] hover:underline inline-flex items-center gap-1"
        >
          View all <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 sm:p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : recentTransactions.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground space-y-3">
            <p className="text-sm">No transactions recorded yet</p>
            <Link
              to="/transactions?new=1"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-foreground text-xs font-medium hover:bg-secondary/80 transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#B5F13E]" /> Record first transaction
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {recentTransactions.map((transaction) => {
              const isIncome = transaction.type === 'receita';
              const formattedDate = transaction.date
                ? format(new Date(transaction.date), 'MMM d, yyyy')
                : 'Recent';

              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3.5 sm:px-6 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {isIncome ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {transaction.description || getCategoryLabel(transaction.category)}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{formattedDate}</span>
                        <span className="text-[11px] px-1.5 py-0.2 rounded-md bg-secondary text-muted-foreground">
                          {getCategoryLabel(transaction.category)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-3">
                    <span
                      className={`text-sm font-semibold tabular-nums font-heading ${
                        isIncome ? 'text-emerald-400' : 'text-foreground'
                      }`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </span>
                    {transaction.due_date && (
                      <p className="text-[10px] text-muted-foreground">Due {transaction.due_date}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
