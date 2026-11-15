import { db } from "@/api/client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { startOfMonth } from "date-fns";
import toast from "react-hot-toast";
import { formatCurrency } from "@/utils";

import MemberCard from "../components/family/MemberCard";
import AddMemberForm from "../components/family/AddMemberForm";
import MemberStats from "../components/family/MemberStats";
import MemberActivity from "../components/family/MemberActivity";

export default function FamilyPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['family-members'],
    queryFn: () => db.entities.FamilyMember.list("-created_date"),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => db.entities.Transaction.list("-date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.FamilyMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      setShowForm(false);
      setEditingMember(null);
      toast.success("Family member added");
    },
    onError: () => toast.error("Could not add member"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.FamilyMember.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      setShowForm(false);
      setEditingMember(null);
      toast.success("Member updated");
    },
    onError: () => toast.error("Could not update member"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.FamilyMember.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-members'] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Could not remove member"),
  });

  const handleSubmit = (data) => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (member) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const activeMembers = useMemo(() => {
    return members.filter(m => m.active !== false);
  }, [members]);

  const familyStats = useMemo(() => {
    const monthStart = startOfMonth(new Date());
    const thisMonthTransactions = transactions.filter(t => new Date(t.date) >= monthStart);

    const totalIncome = thisMonthTransactions
      .filter(t => t.type === 'receita')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalExpense = thisMonthTransactions
      .filter(t => t.type === 'despesa')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense,
      transactionsCount: thisMonthTransactions.length,
    };
  }, [transactions]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Family & Household
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Manage household members, joint spending allocation, and shared goals
          </p>
        </div>
        <button
          onClick={() => {
            setEditingMember(null);
            setShowForm(!showForm);
          }}
          className="fuloozi-btn-primary inline-flex h-10 items-center gap-2 px-4 text-xs sm:text-sm font-semibold shadow-lime"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Active Members</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1 tabular-nums">
            {activeMembers.length}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-[#B5F13E]/30 bg-gradient-to-br from-[#1a2316] via-[#181b1f] to-[#121417]">
          <p className="text-xs text-muted-foreground">Joint Household Balance</p>
          <p className="text-2xl font-bold font-heading text-[#B5F13E] mt-1 tabular-nums">
            {formatCurrency(familyStats.balance, { showSign: true })}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Shared Transactions (This Month)</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1 tabular-nums">
            {familyStats.transactionsCount}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <AddMemberForm
            member={editingMember}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingMember(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Member Cards */}
      <div className="space-y-4 mb-8">
        <h2 className="text-base font-semibold text-foreground">Household Members ({activeMembers.length})</h2>
        {isLoading ? (
          <div className="text-center py-12 text-sm text-muted-foreground">Loading members...</div>
        ) : activeMembers.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-border bg-card">
            <Users className="w-12 h-12 text-[#B5F13E] mx-auto mb-3 opacity-80" />
            <p className="text-sm font-medium text-foreground">No family members registered</p>
            <p className="text-xs text-muted-foreground mt-1">
              Add your partner, family members or kids to track collective spending.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                transactions={transactions}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stats & Activity */}
      {activeMembers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MemberStats members={activeMembers} transactions={transactions} />
          <MemberActivity members={activeMembers} transactions={transactions} />
        </div>
      )}
    </div>
  );
}
