import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { db } from '@/api/client';
import TransactionForm from '@/components/transactions/TransactionForm';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionFilters from '@/components/transactions/TransactionFilters';

export default function Transactions() {
  const { search } = useLocation();
  const [editing, setEditing] = useState(() => new URLSearchParams(search).has("new") ? {} : null);
  const [filters, setFilters] = useState({ type: 'all', category: 'all', search: '' });
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['transactions'], queryFn: () => db.entities.Transaction.list('-date') });

  const mutation = useMutation({
    mutationFn: ({ data, id }) => !data
      ? db.entities.Transaction.delete(id)
      : id
        ? db.entities.Transaction.update(id, data)
        : db.entities.Transaction.create(data),
    onSuccess: (_, vars) => {
      cache.invalidateQueries({ queryKey: ['transactions'] });
      setEditing(null);
      toast.success(vars.data ? (vars.id ? 'Transaction updated' : 'Transaction recorded') : 'Transaction deleted');
    },
    onError: () => toast.error('Could not save the change'),
  });

  const transactions = (query.data || []).filter(item => {
    const matchesType = filters.type === 'all' || item.type === filters.type;
    const matchesCategory = filters.category === 'all' || item.category === filters.category;
    const matchesSearch = !filters.search ||
      (item.description || '').toLowerCase().includes(filters.search.toLowerCase()) ||
      (item.category || '').toLowerCase().includes(filters.search.toLowerCase());
    return matchesType && matchesCategory && matchesSearch;
  });

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Log of all income, grocery runs, bills and household expenses
          </p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="fuloozi-btn-primary inline-flex h-10 items-center gap-2 px-4 text-xs sm:text-sm font-semibold shadow-lime"
        >
          <Plus className="w-4 h-4" /> Add Transaction
        </button>
      </header>

      {editing && (
        <TransactionForm
          transaction={editing.id ? editing : undefined}
          onCancel={() => setEditing(null)}
          onSubmit={(data) => {
            if (!mutation.isPending) {
              mutation.mutate({ id: editing.id, data });
            }
          }}
        />
      )}

      <TransactionFilters onFilterChange={setFilters} />

      {query.isError && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm mb-4">
          Could not load transactions from the ledger.
        </div>
      )}

      <TransactionList
        transactions={transactions}
        isLoading={query.isPending}
        onEdit={setEditing}
        onDelete={(id) => {
          mutation.mutate({ id });
        }}
      />
    </section>
  );
}
