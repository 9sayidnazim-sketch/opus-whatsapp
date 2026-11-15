import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { formatCurrency, getCategoryLabel } from "@/utils";

export default function BudgetAlerts({ budgetsWithSpent = [] }) {
  const exceeded = budgetsWithSpent.filter(a => a.isExceeded);
  const warnings = budgetsWithSpent.filter(a => a.isWarning && !a.isExceeded);

  if (exceeded.length === 0 && warnings.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 space-y-3"
    >
      {exceeded.length > 0 && (
        <Card className="border-red-900/40 bg-red-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-400 mb-2">
                  Exceeded Budgets ({exceeded.length})
                </h3>
                <div className="space-y-1">
                  {exceeded.map((alert) => (
                    <p key={alert.id} className="text-sm text-red-300">
                      <strong>{getCategoryLabel(alert.category)}:</strong>{" "}
                      {formatCurrency(alert.spent)} spent of {formatCurrency(alert.amount)}{" "}
                      <span className="ml-1 opacity-70">({alert.percentage?.toFixed(0)}%)</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {warnings.length > 0 && (
        <Card className="border-amber-900/40 bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-400 mb-2">
                  Budget Warnings ({warnings.length})
                </h3>
                <div className="space-y-1">
                  {warnings.map((alert) => (
                    <p key={alert.id} className="text-sm text-amber-300">
                      <strong>{getCategoryLabel(alert.category)}:</strong>{" "}
                      {formatCurrency(alert.spent)} spent of {formatCurrency(alert.amount)}
                      <span className="ml-1 opacity-70">({alert.percentage?.toFixed(0)}%)</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
