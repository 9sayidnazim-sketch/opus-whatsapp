import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export default function TransactionFilters({ onFilterChange }) {
  const [type, setType] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const updateFilters = (newType, newCategory, newSearch) => {
    onFilterChange({
      type: newType,
      category: newCategory,
      search: newSearch,
    });
  };

  const handleTypeChange = (val) => {
    setType(val);
    updateFilters(val, category, search);
  };

  const handleCategoryChange = (val) => {
    setCategory(val);
    updateFilters(type, val, search);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    updateFilters(type, category, val);
  };

  return (
    <div className="flex flex-wrap items-center gap-3 mb-6">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by description..."
          value={search}
          onChange={handleSearchChange}
          className="pl-9 h-10 rounded-xl bg-card border-border text-xs sm:text-sm"
        />
      </div>

      <div className="flex items-center gap-2">
        <Select value={type} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-36 h-10 rounded-xl bg-card border-border text-xs sm:text-sm">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="receita">Income</SelectItem>
            <SelectItem value="despesa">Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Select value={category} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-44 h-10 rounded-xl bg-card border-border text-xs sm:text-sm">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent className="bg-popover border-border max-h-64">
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="alimentacao">Food & Groceries</SelectItem>
            <SelectItem value="contas">Bills & Utilities</SelectItem>
            <SelectItem value="transporte">Transport & Fuel</SelectItem>
            <SelectItem value="moradia">Housing & Rent</SelectItem>
            <SelectItem value="lazer">Dining & Lifestyle</SelectItem>
            <SelectItem value="compras">Shopping & Retail</SelectItem>
            <SelectItem value="saude">Health & Wellness</SelectItem>
            <SelectItem value="salario">Salary & Income</SelectItem>
            <SelectItem value="freelance">Consulting & Freelance</SelectItem>
            <SelectItem value="investimentos">Investments</SelectItem>
            <SelectItem value="outros_gastos">Other Expenses</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
