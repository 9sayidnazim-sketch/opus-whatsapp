import { db } from "@/api/client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, PiggyBank, AlertTriangle, CheckCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { startOfMonth, format } from "date-fns";
import toast from "react-hot-toast";
import { formatCurrency } from "@/utils";

import BudgetForm from "../components/budgets/BudgetForm";
import BudgetCard from "../components/budgets/BudgetCard";
import BudgetAlerts from "../components/budgets/BudgetAlerts";

export default function BudgetsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  
  const queryClient = useQueryClient();
  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => db.entities.Budget.list("-created_date"),
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Budget.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowForm(false);
      setEditingBudget(null);
      toast.success("Budget created");
    },
    onError: () => toast.error("Could not create budget"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Budget.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowForm(false);
      setEditingBudget(null);
      toast.success("Budget updated");
    },
    onError: () => toast.error("Could not update budget"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Budget.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success("Budget deleted");
    },
    onError: () => toast.error("Could not delete budget"),
  });

  const handleSubmit = (data) => {
    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const budgetsWithSpent = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const activeBudgets = budgets.filter(b => (!b.month || b.month === currentMonth) && b.active !== false);

    return activeBudgets.map(budget => {
      const spent = transactions
        .filter(t => {
          const tDate = new Date(t.date);
          return t.type === 'despesa' && 
                 t.category === budget.category && 
                 tDate >= monthStart;
        })
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
      const isWarning = percentage >= (budget.alert_threshold || 80);
      const isExceeded = percentage > 100;

      return {
        ...budget,
        spent,
        remaining: budget.amount - spent,
        percentage,
        isWarning,
        isExceeded
      };
    });
  }, [budgets, transactions, currentMonth]);

  const stats = useMemo(() => {
    const totalBudget = budgetsWithSpent.reduce((sum, b) => sum + (b.amount || 0), 0);
    const totalSpent = budgetsWithSpent.reduce((sum, b) => sum + (b.spent || 0), 0);
    const totalRemaining = totalBudget - totalSpent;
    const alertCount = budgetsWithSpent.filter(b => b.isWarning || b.isExceeded).length;

    return {
      totalBudget,
      totalSpent,
      totalRemaining,
      alertCount
    };
  }, [budgetsWithSpent]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Monthly Budgets
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Set and track household expense limits in AED
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBudget(null);
            setShowForm(!showForm);
          }}
          className="fuloozi-btn-primary inline-flex h-10 items-center gap-2 px-4 text-xs sm:text-sm font-semibold shadow-lime"
        >
          <Plus className="w-4 h-4" /> Create Budget
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Total Allocated</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1 tabular-nums">
            {formatCurrency(stats.totalBudget)}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Total Spent</p>
          <p className="text-2xl font-bold font-heading text-rose-400 mt-1 tabular-nums">
            {formatCurrency(stats.totalSpent)}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Remaining Cushion</p>
          <p className="text-2xl font-bold font-heading text-[#B5F13E] mt-1 tabular-nums">
            {formatCurrency(stats.totalRemaining)}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Warning / Exceeded</p>
          <p className={`text-2xl font-bold font-heading mt-1 tabular-nums ${stats.alertCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {stats.alertCount} categories
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <BudgetForm
            budget={editingBudget}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingBudget(null);
            }}
            currentMonth={currentMonth}
          />
        )}
      </AnimatePresence>

      <BudgetAlerts budgetsWithSpent={budgetsWithSpent} />

      {/* Budgets Grid */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-foreground">Categories ({budgetsWithSpent.length})</h2>
        {loadingBudgets ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading budgets...</div>
        ) : budgetsWithSpent.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-border bg-card">
            <PiggyBank className="w-12 h-12 text-[#B5F13E] mx-auto mb-3 opacity-80" />
            <p className="text-sm font-medium text-foreground">No budgets configured yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add spending limits for groceries, bills, and dining to stay on track.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {budgetsWithSpent.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
