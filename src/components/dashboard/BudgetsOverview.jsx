import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingDown, AlertTriangle, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const categoryLabels = {
  alimentacao: "Food",
  transporte: "Transport",
  moradia: "Housing",
  contas: "Bills",
  saude: "Health",
  educacao: "Education",
  lazer: "Leisure",
  compras: "Shopping",
  outros_gastos: "Other"
};

export default function BudgetsOverview({ budgetsWithSpent, isLoading }) {
  if (isLoading) {
    return (
      <Card className="shadow-none">
        <CardHeader className="border-b">
          <CardTitle>Monthly Budgets</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (budgetsWithSpent.length === 0) {
    return (
      <Card className="shadow-none">
        <CardHeader className="border-b">
          <CardTitle>Monthly Budgets</CardTitle>
        </CardHeader>
        <CardContent className="p-8 text-center">
          <TrendingDown className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">No budgets set</p>
          <Link to={createPageUrl("Budgets")}>
            <Button variant="outline" size="sm">
              Create Budgets
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const topBudgets = budgetsWithSpent
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 5);

  return (
    <Card className="shadow-none">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle>Monthly Budgets</CardTitle>
          <Link to={createPageUrl("Budgets")}>
            <Button variant="ghost" size="sm">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {topBudgets.map((budget) => (
            <div key={budget.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">
                    {categoryLabels[budget.category]}
                  </span>
                  {(budget.isExceeded || budget.isWarning) && (
                    <AlertTriangle className={`w-3 h-3 ${
                      budget.isExceeded ? 'text-[hsl(354_42%_74%)]' : 'text-[hsl(26_53%_72%)]'
                    }`} />
                  )}
                </div>
                <span className={`text-sm font-semibold ${
                  budget.isExceeded ? 'text-[hsl(354_42%_74%)]' : 
                  budget.isWarning ? 'text-[hsl(26_53%_72%)]' : 
                  'text-muted-foreground'
                }`}>
                  {budget.percentage.toFixed(0)}%
                </span>
              </div>
              <Progress 
                value={Math.min(budget.percentage, 100)} 
                className="h-2"
                indicatorClassName={
                  budget.isExceeded ? 'bg-[hsl(354_22%_30%)]' : 
                  budget.isWarning ? 'bg-[hsl(26_24%_30%)]' : 
                  'bg-[hsl(216_24%_30%)]'
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>-{budget.spent.toFixed(2)}</span>
                <span>of {budget.amount.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}