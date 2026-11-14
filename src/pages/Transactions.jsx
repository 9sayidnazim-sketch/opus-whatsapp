import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { db } from '@/api/client';
import TransactionForm from '@/components/transactions/TransactionForm';
import TransactionList from '@/components/transactions/TransactionList';
import TransactionFilters from '@/components/transactions/TransactionFilters';

export default function Transactions() {
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({ type: 'all', category: 'all' });
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ['transactions'], queryFn: () => db.entities.Transaction.list('-date') });
  const mutation = useMutation({
    mutationFn: ({ data, id }) => !data ? db.entities.Transaction.delete(id)
      : id ? db.entities.Transaction.update(id, data) : db.entities.Transaction.create(data),
    onSuccess: () => { cache.invalidateQueries({ queryKey: ['transactions'] }); setEditing(null); },
    onError: () => toast.error('Could not save the change'),
  });
  const transactions = (query.data || []).filter(item =>
    (filters.type === 'all' || item.type === filters.type) &&
    (filters.category === 'all' || item.category === filters.category));
  return <section className="mx-auto max-w-7xl p-4 md:p-8">
    <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-3xl font-semibold">Transactions</h1><p className="mt-2 text-muted-foreground">Review income and spending in your household ledger</p></div>
      <Button onClick={() => setEditing({})}><Plus className="mr-2 h-4 w-4" />Add transaction</Button>
    </header>
    <TransactionFilters onFilterChange={setFilters} />
    {query.isError && <p role="alert">Could not load transactions</p>}
    <TransactionList transactions={transactions} isLoading={query.isPending} onEdit={setEditing}
      onDelete={id => { if (window.confirm('Delete this transaction?')) mutation.mutate({ id }); }} />
    {editing && <TransactionForm transaction={editing.id ? editing : undefined} onCancel={() => setEditing(null)}
      onSubmit={data => { if (!mutation.isPending) mutation.mutate({ id: editing.id, data }); }} />}
  </section>;
}
