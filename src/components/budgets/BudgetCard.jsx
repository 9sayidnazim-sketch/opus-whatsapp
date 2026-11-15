import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Pencil, Trash2, AlertTriangle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const categoryLabels = {
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

export default function BudgetCard({ budget, onEdit, onDelete }) {
  const getStatusColor = () => {
    if (budget.isExceeded) return "text-[hsl(354_42%_74%)]";
    if (budget.isWarning) return "text-[hsl(26_53%_72%)]";
    return "text-[hsl(151_31%_73%)]";
  };

  const getProgressColor = () => {
    if (budget.isExceeded) return "bg-[hsl(354_22%_30%)]";
    if (budget.isWarning) return "bg-[hsl(26_24%_30%)]";
    return "bg-[hsl(216_24%_30%)]";
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className="hover:shadow-none transition-shadow relative overflow-hidden">
        {budget.isExceeded && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(354_22%_30%)] opacity-5 rounded-full transform translate-x-16 -translate-y-16" />
        )}
        {budget.isWarning && !budget.isExceeded && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(26_24%_30%)] opacity-5 rounded-full transform translate-x-16 -translate-y-16" />
        )}
        
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-lg text-foreground">
                {categoryLabels[budget.category]}
              </h3>
              {budget.isExceeded ? (
                <Badge className="mt-1 bg-[hsl(354_22%_21%)] text-[hsl(354_42%_74%)] border-[hsl(354_22%_21%)]">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Limit Exceeded
                </Badge>
              ) : budget.isWarning ? (
                <Badge className="mt-1 bg-[hsl(26_24%_20%)] text-[hsl(26_53%_72%)] border-[hsl(26_24%_20%)]">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Warning
                </Badge>
              ) : (
                <Badge className="mt-1 bg-[hsl(151_20%_19%)] text-[hsl(151_31%_73%)] border-[hsl(151_20%_19%)]">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  On Track
                </Badge>
              )}
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(budget)}
              >
                <Pencil className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(budget.id)}
              >
                <Trash2 className="w-4 h-4 text-[hsl(354_42%_74%)]" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-muted-foreground">Spent</span>
                <span className={`text-2xl font-bold ${getStatusColor()}`}>
                  -{budget.spent.toFixed(2)}
                </span>
              </div>
              <Progress 
                value={Math.min(budget.percentage, 100)} 
                className="h-3"
                indicatorClassName={getProgressColor()}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  {budget.percentage.toFixed(1)}% of budget
                </span>
                <span className="text-xs font-medium text-foreground">
                  Limit: {budget.amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className={`text-lg font-semibold ${
                budget.remaining < 0 ? 'text-[hsl(354_42%_74%)]' : 'text-[hsl(151_31%_73%)]'
              }`}>
                {budget.remaining.toFixed(2)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}