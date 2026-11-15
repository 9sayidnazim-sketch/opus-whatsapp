import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUpCircle, ArrowDownCircle, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const categoryLabels = {
  salario: "Salary",
  freelance: "Freelance",
  investimentos: "Investments",
  outras_receitas: "Other Income",
  alimentacao: "Food",
  transporte: "Transport",
  moradia: "Housing",
  contas: "Bills",
  saude: "Health",
  educacao: "Education",
  lazer: "Leisure",
  compras: "Shopping",
  outros_gastos: "Other Expenses"
};

const paymentLabels = {
  dinheiro: "Cash",
  cartao_credito: "Credit Card",
  cartao_debito: "Debit Card",
  pix: "PIX",
  transferencia: "Bank Transfer"
};

export default function TransactionList({ transactions, isLoading, onEdit, onDelete }) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          No transactions found
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {transactions.map((transaction) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full ${
                    transaction.type === 'receita' 
                      ? 'bg-[hsl(151_20%_19%)]' 
                      : 'bg-[hsl(354_22%_21%)]'
                  }`}>
                    {transaction.type === 'receita' ? (
                      <ArrowUpCircle className="w-6 h-6 text-[hsl(151_31%_73%)]" />
                    ) : (
                      <ArrowDownCircle className="w-6 h-6 text-[hsl(354_42%_74%)]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground mb-1">
                      {transaction.description || "No description"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {categoryLabels[transaction.category]}
                      </Badge>
                      {transaction.payment_method && (
                        <Badge variant="outline" className="text-xs">
                          {paymentLabels[transaction.payment_method]}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(transaction.date), "MMMM d, yyyy", { locale: enUS })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`text-xl font-bold ${
                      transaction.type === 'receita' 
                        ? 'text-[hsl(151_31%_73%)]' 
                        : 'text-[hsl(354_42%_74%)]'
                    }`}>
                      {transaction.type === 'receita' ? '+' : '-'}{transaction.amount.toFixed(2)}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(transaction)}
                      >
                        <Pencil className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(transaction.id)}
                      >
                        <Trash2 className="w-4 h-4 text-[hsl(354_42%_74%)]" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}