import { Link } from "react-router-dom";
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { db } from "@/api/client";
import { useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { enUS } from "date-fns/locale";
import { formatCurrency } from "@/utils";
import { checkAndTriggerDueAlerts } from "@/utils/notifications";

import StatsCard from "../components/dashboard/StatsCard";
import RecentTransactions from "../components/dashboard/RecentTransactions";
import CategoryChart from "../components/dashboard/CategoryChart";
import MonthlyTrend from "../components/dashboard/MonthlyTrend";
import BudgetsOverview from "../components/dashboard/BudgetsOverview";
import GoalsOverview from "../components/dashboard/GoalsOverview";
import NotificationsBanner from "../components/dashboard/NotificationsBanner";

export default function Dashboard() {
  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list("-date"),
  });

  const { data: budgets = [], isLoading: loadingBudgets } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => db.entities.Budget.list(),
  });

  const { data: goals = [], isLoading: loadingGoals } = useQuery({
    queryKey: ['goals'],
    queryFn: () => db.entities.Goal.list(),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: () => db.entities.NotificationSettings.list(),
  });

  const settings = settingsList[0];

  useEffect(() => {
    if (transactions.length > 0) {
      checkAndTriggerDueAlerts({ transactions, budgets, goals, settings });
    }
  }, [transactions, budgets, goals, settings]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const thisMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= monthStart && tDate <= monthEnd;
    });

    const totalReceitas = thisMonthTransactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalDespesas = thisMonthTransactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const saldo = totalReceitas - totalDespesas;
    const savingsRate = totalReceitas > 0 ? Math.round((saldo / totalReceitas) * 100) : 0;

    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    
    const lastMonthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate >= lastMonthStart && tDate <= lastMonthEnd;
    });

    const lastMonthDespesas = lastMonthTransactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const despesasChange = lastMonthDespesas > 0 
      ? ((totalDespesas - lastMonthDespesas) / lastMonthDespesas * 100).toFixed(0)
      : '0';

    return {
      totalReceitas,
      totalDespesas,
      saldo,
      savingsRate,
      despesasChange,
      transactionsCount: thisMonthTransactions.length
    };
  }, [transactions]);

  const categoryData = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    
    const thisMonthDespesas = transactions.filter(t => {
      const tDate = new Date(t.date);
      return t.type === 'despesa' && tDate >= monthStart;
    });

    const categories = {};
    thisMonthDespesas.forEach(t => {
      categories[t.category] = (categories[t.category] || 0) + (t.amount || 0);
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const currentMonth = format(startOfMonth(new Date()), "yyyy-MM-dd");
  
  const budgetsWithSpent = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    // Match budgets for this month or general active budgets
    const currentMonthBudgets = budgets.filter(b => (!b.month || b.month === currentMonth) && b.active !== false);
    
    return currentMonthBudgets.map(budget => {
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

  return (
    <section className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Household Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {format(new Date(), "MMMM yyyy", { locale: enUS })} · Overview of balances, spending & milestones
          </p>
        </div>
        <Link
          to="/transactions?new=1"
          className="fuloozi-btn-primary inline-flex h-10 items-center gap-2 px-4 text-xs sm:text-sm font-semibold shadow-lime"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </Link>
      </header>

      {/* Dynamic Notifications Banner */}
      <NotificationsBanner
        budgetsWithSpent={budgetsWithSpent}
        goals={goals}
        transactions={transactions}
        settings={settings}
      />

      {/* Summary KPI Cards */}
      {loadingTransactions ? (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="rounded-2xl border-border bg-card">
              <CardHeader className="p-4 sm:p-5 pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatsCard
            title="Monthly Net Savings"
            value={formatCurrency(stats.saldo, { showSign: true })}
            featured
            icon={Wallet}
            trend={`${stats.savingsRate}% saved this month`}
            trendType={stats.saldo >= 0 ? "positive" : "negative"}
          />
          <StatsCard
            title="Total Inflow"
            value={formatCurrency(stats.totalReceitas)}
            icon={TrendingUp}
            trend={`${stats.transactionsCount} entries recorded`}
            trendType="positive"
          />
          <StatsCard
            title="Total Expenses"
            value={formatCurrency(stats.totalDespesas)}
            icon={TrendingDown}
            trend={Number(stats.despesasChange) > 0 ? `+${stats.despesasChange}% vs last mo.` : `${stats.despesasChange}% vs last mo.`}
            trendType={Number(stats.despesasChange) > 0 ? "negative" : "positive"}
          />
          <StatsCard
            title="Savings Rate"
            value={`${stats.savingsRate}%`}
            icon={PiggyBank}
            trend={stats.savingsRate >= 20 ? "On track for goals" : "Below 20% target"}
            trendType={stats.savingsRate >= 20 ? "positive" : "neutral"}
          />
        </div>
      )}

      {/* Main Grid: Charts & Modules */}
      <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-6">
        <div className="grid min-w-0 content-start gap-4 lg:gap-6">
          <MonthlyTrend transactions={transactions} isLoading={loadingTransactions} />
          <RecentTransactions transactions={transactions} isLoading={loadingTransactions} />
        </div>

        <div className="grid min-w-0 content-start gap-4 lg:gap-6">
          <CategoryChart data={categoryData} isLoading={loadingTransactions} />
          <BudgetsOverview 
            budgetsWithSpent={budgetsWithSpent} 
            isLoading={loadingBudgets || loadingTransactions} 
          />
          <GoalsOverview 
            goals={goals} 
            isLoading={loadingGoals} 
          />
        </div>
      </div>
    </section>
  );
}
