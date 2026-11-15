import { db } from "@/api/client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Receipt, CheckCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { differenceInDays, isBefore, startOfDay } from "date-fns";
import toast from "react-hot-toast";
import { formatCurrency } from "@/utils";

import TransactionForm from "../components/transactions/TransactionForm";
import BillCard from "../components/bills/BillCard";
import BillsCalendar from "../components/bills/BillsCalendar";

export default function BillsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list("-due_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setEditingBill(null);
      toast.success("Bill added to schedule");
    },
    onError: () => toast.error("Could not save bill"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setEditingBill(null);
      toast.success("Bill updated");
    },
    onError: () => toast.error("Could not update bill"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success("Bill removed");
    },
    onError: () => toast.error("Could not delete bill"),
  });

  const handleSubmit = (data) => {
    if (editingBill) {
      updateMutation.mutate({ id: editingBill.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (bill) => {
    setEditingBill(bill);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const handleMarkAsPaid = (bill) => {
    updateMutation.mutate({
      id: bill.id,
      data: {
        payment_status: 'pago'
      }
    });
  };

  const bills = useMemo(() => {
    return transactions.filter(t => t.type === 'despesa' && t.due_date);
  }, [transactions]);

  const { pending, overdue, paid } = useMemo(() => {
    const today = startOfDay(new Date());
    const pendingList = [];
    const overdueList = [];
    const paidList = [];

    bills.forEach(bill => {
      if (bill.payment_status === 'pago') {
        paidList.push(bill);
      } else {
        const dueDate = startOfDay(new Date(bill.due_date));
        if (isBefore(dueDate, today)) {
          overdueList.push(bill);
        } else {
          pendingList.push(bill);
        }
      }
    });

    return {
      pending: pendingList,
      overdue: overdueList,
      paid: paidList
    };
  }, [bills]);

  const stats = useMemo(() => {
    const totalAmount = pending.reduce((sum, b) => sum + (b.amount || 0), 0) +
                        overdue.reduce((sum, b) => sum + (b.amount || 0), 0);
    const upcomingCount = pending.filter(b => {
      const days = differenceInDays(new Date(b.due_date), startOfDay(new Date()));
      return days <= 7 && days >= 0;
    }).length;

    return {
      total: pending.length + overdue.length,
      overdue: overdue.length,
      upcoming: upcomingCount,
      totalAmount
    };
  }, [pending, overdue]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Bills & Subscriptions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Track utilities (DEWA, telecom, rent) and recurring payments
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBill(null);
            setShowForm(!showForm);
          }}
          className="fuloozi-btn-primary inline-flex h-10 items-center gap-2 px-4 text-xs sm:text-sm font-semibold shadow-lime"
        >
          <Plus className="w-4 h-4" /> Add Bill
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Unpaid Bills</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1 tabular-nums">
            {stats.total}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-rose-500/30 bg-rose-500/5">
          <p className="text-xs text-rose-400 font-medium">Overdue</p>
          <p className="text-2xl font-bold font-heading text-rose-400 mt-1 tabular-nums">
            {stats.overdue}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-amber-500/30 bg-amber-500/5">
          <p className="text-xs text-amber-400 font-medium">Due in 7 Days</p>
          <p className="text-2xl font-bold font-heading text-amber-400 mt-1 tabular-nums">
            {stats.upcoming}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Total Unpaid Amount</p>
          <p className="text-2xl font-bold font-heading text-[#B5F13E] mt-1 tabular-nums">
            {formatCurrency(stats.totalAmount)}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <TransactionForm
            transaction={editingBill}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingBill(null);
            }}
            isBillMode={true}
          />
        )}
      </AnimatePresence>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border p-1 rounded-xl flex flex-wrap h-auto gap-1">
          <TabsTrigger
            value="pending"
            className="rounded-lg data-[state=active]:bg-[#B5F13E]/15 data-[state=active]:text-[#B5F13E] text-xs font-semibold py-1.5 px-3"
          >
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger
            value="overdue"
            className="rounded-lg data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400 text-xs font-semibold py-1.5 px-3"
          >
            Overdue ({overdue.length})
          </TabsTrigger>
          <TabsTrigger
            value="paid"
            className="rounded-lg data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400 text-xs font-semibold py-1.5 px-3"
          >
            Paid ({paid.length})
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="rounded-lg data-[state=active]:bg-secondary data-[state=active]:text-foreground text-xs font-semibold py-1.5 px-3"
          >
            Calendar View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">Loading bills...</div>
          ) : pending.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-border bg-card">
              <CheckCircle className="w-12 h-12 text-[#B5F13E] mx-auto mb-3 opacity-80" />
              <p className="text-sm font-medium text-foreground">No pending bills</p>
              <p className="text-xs text-muted-foreground mt-1">All upcoming household bills are settled.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {pending.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="overdue" className="space-y-3">
          {overdue.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-border bg-card">
              <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <p className="text-sm font-medium text-foreground">No overdue bills</p>
              <p className="text-xs text-muted-foreground mt-1">Your ledger has zero delinquent bills.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {overdue.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  isOverdue={true}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paid" className="space-y-3">
          {paid.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-border bg-card">
              <Receipt className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-sm text-muted-foreground">No paid bills recorded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {paid.map((bill) => (
                <BillCard
                  key={bill.id}
                  bill={bill}
                  isPaid={true}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onMarkAsPaid={handleMarkAsPaid}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <BillsCalendar bills={bills} onEdit={handleEdit} onMarkAsPaid={handleMarkAsPaid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
