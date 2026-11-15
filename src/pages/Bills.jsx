import { db } from "@/api/client";

import { useState, useMemo } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Receipt, AlertCircle, CheckCircle } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { differenceInDays, isBefore, startOfDay } from "date-fns";

import TransactionForm from "../components/transactions/TransactionForm";
import BillCard from "../components/bills/BillCard";
import BillsCalendar from "../components/bills/BillsCalendar";

export default function BillsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  
  const queryClient = useQueryClient();

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list("-due_date"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setEditingBill(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setShowForm(false);
      setEditingBill(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
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
    if (confirm("Are you sure you want to delete this bill?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleMarkAsPaid = (bill) => {
    updateMutation.mutate({
      id: bill.id,
      data: {
        ...bill,
        payment_status: 'pago',
        paid_date: new Date().toISOString().split('T')[0]
      }
    });
  };

  const bills = useMemo(() => {
    return transactions.filter(t => t.type === 'despesa' && t.due_date);
  }, [transactions]);

  const { pending, overdue, paid, upcoming } = useMemo(() => {
    const today = startOfDay(new Date());
    
    const pending = bills.filter(b => 
      b.payment_status === 'a_pagar' && 
      !isBefore(new Date(b.due_date), today)
    );
    
    const overdue = bills.filter(b => 
      b.payment_status === 'a_pagar' && 
      isBefore(new Date(b.due_date), today)
    );
    
    const paid = bills.filter(b => b.payment_status === 'pago');
    
    const upcoming = pending.filter(b => {
      const daysUntilDue = differenceInDays(new Date(b.due_date), today);
      return daysUntilDue <= 7 && daysUntilDue >= 0;
    });

    return { pending, overdue, paid, upcoming };
  }, [bills]);

  const stats = {
    total: pending.length + overdue.length,
    overdue: overdue.length,
    upcoming: upcoming.length,
    totalAmount: [...pending, ...overdue].reduce((sum, b) => sum + b.amount, 0)
  };

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-heading text-[32px] leading-tight font-semibold tracking-[-0.03em] text-foreground">Bills</h1>
            <p className="text-muted-foreground mt-1">Manage your payments and due dates</p>
          </div>
          <Button
            onClick={() => {
              setEditingBill(null);
              setShowForm(!showForm);
            }}
            className="bg-[hsl(216_24%_36%)] hover:bg-[hsl(216_24%_36%)]"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Bill
          </Button>
        </div>

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stats.total}
                </p>
              </div>
              <Receipt className="w-10 h-10 text-[hsl(216_49%_76%)] opacity-20" />
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-[hsl(354_42%_74%)] mt-1">
                  {stats.overdue}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-[hsl(354_42%_74%)] opacity-20" />
            </div>
          </div>

          <div className="bg-card rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Next 7 Days</p>
                <p className="text-2xl font-bold text-[hsl(26_53%_72%)] mt-1">
                  {stats.upcoming}
                </p>
              </div>
              <AlertCircle className="w-10 h-10 text-[hsl(26_53%_72%)] opacity-20" />
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-card p-6 border-l-4 border-violet-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  {stats.totalAmount.toFixed(2)}
                </p>
              </div>
              <Receipt className="w-10 h-10 text-[hsl(253_40%_78%)] opacity-20" />
            </div>
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
          <TabsList className="grid w-full md:w-auto grid-cols-4 gap-2">
            <TabsTrigger value="pending" className="data-[state=active]:bg-[hsl(216_24%_30%)] data-[state=active]:text-white">
              Pending ({pending.length})
            </TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-[hsl(354_22%_30%)] data-[state=active]:text-white">
              Overdue ({overdue.length})
            </TabsTrigger>
            <TabsTrigger value="paid" className="data-[state=active]:bg-[hsl(151_20%_30%)] data-[state=active]:text-white">
              Paid ({paid.length})
            </TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-[hsl(264_23%_30%)] data-[state=active]:text-white">
              Calendar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">Loading...</div>
            ) : pending.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-[hsl(151_31%_73%)] mx-auto mb-4" />
                <p className="text-muted-foreground">No pending bills</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
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

          <TabsContent value="overdue" className="space-y-4">
            {overdue.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-[hsl(151_31%_73%)] mx-auto mb-4" />
                <p className="text-muted-foreground">No overdue bills</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {overdue.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMarkAsPaid={handleMarkAsPaid}
                    isOverdue={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-4">
            {paid.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No paid bills recorded</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {paid.map((bill) => (
                  <BillCard
                    key={bill.id}
                    bill={bill}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isPaid={true}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="calendar">
            <BillsCalendar bills={bills} onBillClick={handleEdit} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}