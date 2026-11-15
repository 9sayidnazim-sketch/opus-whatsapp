import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpRight, ArrowDownRight, Pencil, Trash2, Calendar, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { formatCurrency, getCategoryLabel } from "@/utils";

const paymentLabels = {
  card: "Card",
  bank_transfer: "Bank Wire",
  apple_pay: "Apple Pay",
  dinheiro: "Cash",
  cartao_credito: "Credit Card",
  cartao_debito: "Debit Card",
  transferencia: "Bank Transfer",
};

export default function TransactionList({ transactions, isLoading, onEdit, onDelete }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="rounded-2xl border-border bg-card">
            <CardContent className="p-4 flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="h-5 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items = transactions || [];

  if (items.length === 0) {
    return (
      <Card className="rounded-2xl border-border bg-card p-12 text-center text-muted-foreground">
        <p className="text-base font-medium text-foreground mb-1">No matching transactions</p>
        <p className="text-xs text-muted-foreground">Adjust your filters or add a new transaction above.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((t) => {
        const isIncome = t.type === 'receita';
        const formattedDate = t.date ? format(new Date(t.date), 'MMM d, yyyy') : 'No date';
        const paymentMethod = paymentLabels[t.payment_method] || 'Card';

        return (
          <div
            key={t.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-card border border-border/80 hover:border-border transition-all duration-150 gap-3"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                }`}
              >
                {isIncome ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground truncate">
                    {t.description || getCategoryLabel(t.category)}
                  </p>
                  {t.payment_status === 'pendente' && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Pending
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {formattedDate}
                  </span>
                  <span>·</span>
                  <span className="px-2 py-0.5 rounded-md bg-secondary text-foreground text-[11px] font-medium">
                    {getCategoryLabel(t.category)}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1 text-[11px]">
                    <CreditCard className="w-3 h-3" /> {paymentMethod}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
              <span
                className={`text-base font-bold tabular-nums font-heading ${
                  isIncome ? 'text-emerald-400' : 'text-foreground'
                }`}
              >
                {isIncome ? '+' : '-'}{formatCurrency(t.amount)}
              </span>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(t)}
                  className="w-8 h-8 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(t.id)}
                  className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
