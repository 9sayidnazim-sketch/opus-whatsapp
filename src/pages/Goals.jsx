import { db } from "@/api/client";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Target, CheckCircle2, TrendingUp } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { formatCurrency } from "@/utils";

import GoalForm from "../components/goals/GoalForm";
import GoalCard from "../components/goals/GoalCard";
import GoalProgress from "../components/goals/GoalProgress";

export default function GoalsPage() {
  const [showForm, setShowForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [selectedGoal, setSelectedGoal] = useState(null);
  
  const queryClient = useQueryClient();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: () => db.entities.Goal.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => db.entities.Goal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowForm(false);
      setEditingGoal(null);
      toast.success("Goal created");
    },
    onError: () => toast.error("Could not create goal"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => db.entities.Goal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setShowForm(false);
      setEditingGoal(null);
      setSelectedGoal(null);
      toast.success("Goal updated");
    },
    onError: () => toast.error("Could not update goal"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => db.entities.Goal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setSelectedGoal(null);
      toast.success("Goal deleted");
    },
    onError: () => toast.error("Could not delete goal"),
  });

  const handleSubmit = (data) => {
    if (editingGoal) {
      updateMutation.mutate({ id: editingGoal.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (goal) => {
    setEditingGoal(goal);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const handleAddProgress = (goalId, additionalAmount) => {
    const targetGoal = goals.find(g => g.id === goalId);
    if (!targetGoal) return;
    const newAmount = Number(targetGoal.current_amount || 0) + additionalAmount;
    updateMutation.mutate({
      id: goalId,
      data: {
        current_amount: newAmount,
        status: newAmount >= Number(targetGoal.target_amount) ? 'concluida' : 'em_progresso'
      }
    });
  };

  const { activeGoals, completedGoals, totalSaved, totalTarget } = useMemo(() => {
    const active = [];
    const completed = [];
    let savedSum = 0;
    let targetSum = 0;

    goals.forEach(g => {
      const cur = Number(g.current_amount || 0);
      const tar = Number(g.target_amount || 1);
      savedSum += cur;
      targetSum += tar;

      if (cur >= tar || g.status === 'concluida' || g.status === 'completed') {
        completed.push(g);
      } else {
        active.push(g);
      }
    });

    return {
      activeGoals: active,
      completedGoals: completed,
      totalSaved: savedSum,
      totalTarget: targetSum
    };
  }, [goals]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Financial Goals
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Save for household milestones, family travel, and emergency cushion
          </p>
        </div>
        <button
          onClick={() => {
            setEditingGoal(null);
            setShowForm(!showForm);
          }}
          className="fuloozi-btn-primary inline-flex h-10 items-center gap-2 px-4 text-xs sm:text-sm font-semibold shadow-lime"
        >
          <Plus className="w-4 h-4" /> New Goal
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Active Goals</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1 tabular-nums">
            {activeGoals.length}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Total Cumulative Saved</p>
          <p className="text-2xl font-bold font-heading text-[#B5F13E] mt-1 tabular-nums">
            {formatCurrency(totalSaved)}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Total Target Value</p>
          <p className="text-2xl font-bold font-heading text-foreground mt-1 tabular-nums">
            {formatCurrency(totalTarget)}
          </p>
        </div>

        <div className="bg-card rounded-2xl p-4 sm:p-5 border border-border">
          <p className="text-xs text-muted-foreground">Goals Completed</p>
          <p className="text-2xl font-bold font-heading text-emerald-400 mt-1 tabular-nums">
            {completedGoals.length}
          </p>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <GoalForm
            goal={editingGoal}
            onSubmit={handleSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingGoal(null);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedGoal && (
          <GoalProgress
            goal={selectedGoal}
            onClose={() => setSelectedGoal(null)}
            onAddProgress={handleAddProgress}
          />
        )}
      </AnimatePresence>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-border bg-card">
          <Target className="w-12 h-12 text-[#B5F13E] mx-auto mb-3 opacity-80" />
          <p className="text-sm font-medium text-foreground">No financial goals set</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Start saving for a vacation, emergency fund, or vehicle.
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="fuloozi-btn-primary inline-flex h-9 items-center gap-1.5 px-4 text-xs font-semibold"
          >
            <Plus className="w-4 h-4" /> Create First Goal
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {activeGoals.length > 0 && (
            <div className="space-y-3.5">
              <h2 className="text-base font-semibold text-foreground">
                In Progress ({activeGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activeGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={() => setSelectedGoal(goal)}
                  />
                ))}
              </div>
            </div>
          )}

          {completedGoals.length > 0 && (
            <div className="space-y-3.5">
              <h2 className="text-base font-semibold text-foreground">
                Completed Milestones ({completedGoals.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {completedGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onClick={() => setSelectedGoal(goal)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
