import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settingsContext';
import { fetchTransactions, updateTransaction, deleteTransaction, batchUpdateTransactions } from '../lib/sheets';
import type { Transaction } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { format } from 'date-fns';
import { FileEdit, Trash2, X, CheckSquare } from 'lucide-react';

const CATEGORY_COLORS: Record<string, string> = {
    "Mileage": "border-l-blue-500",
    "Deposit": "border-l-emerald-500",
    "Internet": "border-l-indigo-500",
    "Power": "border-l-yellow-500",
    "Phone": "border-l-purple-500",
    "Liability Insurance": "border-l-rose-500",
    "Tools/Supplies": "border-l-orange-500",
    "Meals": "border-l-red-400",
    "Lodging": "border-l-teal-500",
    "Fuel": "border-l-cyan-500",
    "Other": "border-l-gray-500",
    "Uncategorized": "border-l-gray-300"
};

const FALLBACK_COLORS = [
    "border-l-pink-500",
    "border-l-lime-500",
    "border-l-amber-500",
    "border-l-fuchsia-500",
    "border-l-sky-500",
    "border-l-violet-500",
    "border-l-rose-300",
    "border-l-teal-300",
    "border-l-yellow-300"
];

const getCategoryBorderColor = (category: string) => {
    if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];
    let hash = 0;
    for (let i = 0; i < category.length; i++) {
        hash = category.charCodeAt(i) + ((hash << 5) - hash);
    }
    return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
};

export default function AuditLedger() {
    const { accessToken } = useAuth();
    const { settings } = useSettings();
    const location = useLocation();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtering State
    const [selectedCategory, setSelectedCategory] = useState<string>(
        location.state?.filterCategory || 'All'
    );
    const [startDate, setStartDate] = useState<string>(location.state?.filterStartDate || '');
    const [endDate, setEndDate] = useState<string>(location.state?.filterEndDate || '');
    const [filterMI, setFilterMI] = useState<boolean>(false);
    const [filterHome, setFilterHome] = useState<boolean>(false);

    // Modal & Bulk State
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [saving, setSaving] = useState(false);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [bulkCategory, setBulkCategory] = useState<string>('');

    useEffect(() => {
        if (accessToken) {
            loadData();
        }
    }, [accessToken]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchTransactions(accessToken!);
            // Sort newest first
            data.sort((a, b) => {
                const timeA = new Date(a.date).getTime();
                const timeB = new Date(b.date).getTime();
                return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
            });
            setTransactions(data);
        } catch (err: any) {
            setError("Failed to load transactions. Check your connection or Spreadsheet ID.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken || !editingTx || !editingTx.rowNumber) return;
        setSaving(true);
        try {
            await updateTransaction(accessToken, editingTx.rowNumber, editingTx);
            await loadData(); // refresh list
            setEditingTx(null); // Close modal
        } catch (err: any) {
            alert("Failed to update: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (rowNumber?: number) => {
        if (!accessToken || !rowNumber) return;
        if (!window.confirm("Are you sure you want to permanently delete this transaction? This cannot be undone.")) return;

        setSaving(true);
        try {
            await deleteTransaction(accessToken, rowNumber);
            await loadData();
            setEditingTx(null);
        } catch (err: any) {
            alert("Failed to delete: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleBulkAssign = async () => {
        if (!accessToken || selectedRows.length === 0 || !bulkCategory) return;
        setSaving(true);
        try {
            const txsToUpdate = transactions
                .filter(t => t.rowNumber !== undefined && selectedRows.includes(t.rowNumber))
                .map(t => ({ ...t, category: bulkCategory }));

            await batchUpdateTransactions(accessToken, txsToUpdate);

            setSelectedRows([]);
            setBulkCategory('');
            await loadData();
        } catch (err: any) {
            alert("Bulk update failed: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleRow = (rowNumber: number | undefined) => {
        if (!rowNumber) return;
        setSelectedRows(prev =>
            prev.includes(rowNumber)
                ? prev.filter(r => r !== rowNumber)
                : [...prev, rowNumber]
        );
    };

    const toggleAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const visibleRowNumbers = filteredTransactions
            .map(t => t.rowNumber)
            .filter((r): r is number => r !== undefined);

        if (e.target.checked) {
            const newSet = new Set([...selectedRows, ...visibleRowNumbers]);
            setSelectedRows(Array.from(newSet));
        } else {
            const visibleSet = new Set(visibleRowNumbers);
            setSelectedRows(selectedRows.filter(r => !visibleSet.has(r)));
        }
    };

    const filteredTransactions = useMemo(() => {
        return transactions.filter(t => {
            // Category Filter
            if (selectedCategory === 'ExpenseOnly' && (t.category === 'Deposit' || t.category === 'Mileage')) return false;
            if (selectedCategory !== 'All' && selectedCategory !== 'ExpenseOnly' && t.category !== selectedCategory) return false;

            // Date Filters
            if (startDate && t.date < startDate) return false;
            if (endDate && t.date > endDate) return false;

            // MI / Home Filters
            if (filterMI && !t.isMichiganPay) return false;
            if (filterHome && !t.isHomePay) return false;

            return true;
        });
    }, [transactions, selectedCategory, startDate, endDate, filterMI, filterHome]);

    const allVisibleSelected = filteredTransactions.length > 0 &&
        filteredTransactions.every(t => t.rowNumber !== undefined && selectedRows.includes(t.rowNumber));

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Audit Ledger</h2>
                    <p className="text-muted-foreground">Historical view of all transactions.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/50 p-4 rounded-lg border border-border">
                    <select
                        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        <option value="ExpenseOnly">All Expenses (Excl. Mileage)</option>
                        <option value="Uncategorized">Uncategorized</option>
                        {settings.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            className="w-auto h-8 text-sm"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            title="Start Date"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <Input
                            type="date"
                            className="w-auto h-8 text-sm"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            title="End Date"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-background"
                                checked={filterMI}
                                onChange={(e) => setFilterMI(e.target.checked)}
                            />
                            <span>MI Only</span>
                        </label>
                        <label className="flex items-center space-x-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-background"
                                checked={filterHome}
                                onChange={(e) => setFilterHome(e.target.checked)}
                            />
                            <span>Home Pay Only</span>
                        </label>
                    </div>

                    <div className="sm:ml-auto">
                        <button
                            onClick={loadData}
                            className="text-sm text-blue-500 hover:text-blue-400 font-medium"
                            disabled={loading || saving}
                        >
                            {loading ? "Refreshing..." : "Refresh Data"}
                        </button>
                    </div>
                </div>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <div className="text-red-500 mb-4">{error}</div>}

                    {selectedRows.length > 0 && (
                        <div className="bg-accent/50 text-accent-foreground px-4 py-3 mb-4 rounded-lg flex items-center gap-4 border border-border">
                            <CheckSquare className="h-5 w-5 text-blue-500" />
                            <span className="text-sm font-semibold">{selectedRows.length} selected</span>
                            <select
                                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:ring-2 focus:ring-ring"
                                value={bulkCategory}
                                onChange={(e) => setBulkCategory(e.target.value)}
                            >
                                <option value="">Assign New Category...</option>
                                <option value="Uncategorized">Uncategorized</option>
                                {settings.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                            <Button size="sm" onClick={handleBulkAssign} disabled={!bulkCategory || saving}>
                                {saving ? "Updating..." : "Apply Category"}
                            </Button>
                            <button onClick={() => setSelectedRows([])} className="ml-auto text-sm text-muted-foreground hover:underline">
                                Clear Selection
                            </button>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-muted-foreground uppercase bg-muted border-b">
                                <tr>
                                    <th className="px-4 py-3 w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-background"
                                            checked={allVisibleSelected}
                                            onChange={toggleAll}
                                        />
                                    </th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Category</th>
                                    <th className="px-4 py-3 text-right">Amount / Miles</th>
                                    <th className="px-4 py-3 hidden md:table-cell">Flags</th>
                                    <th className="px-4 py-3 xl:table-cell">Remarks</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredTransactions.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                            No transactions found matching the selected filters.
                                        </td>
                                    </tr>
                                )}
                                {filteredTransactions.map((t, idx) => (
                                    <tr
                                        key={idx}
                                        className={`bg-background border-b hover:bg-muted transition-colors border-l-4 ${getCategoryBorderColor(t.category)}`}
                                    >
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4 bg-background"
                                                checked={t.rowNumber !== undefined && selectedRows.includes(t.rowNumber)}
                                                onChange={() => toggleRow(t.rowNumber)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {t.date && !isNaN(new Date(t.date).getTime()) ? format(new Date(t.date), 'MMM d, yyyy') : (t.date || "Unknown Date")}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-foreground">
                                            {t.category}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {t.category === 'Mileage'
                                                ? `${t.amount} mi`
                                                : `$${t.amount.toFixed(2)}`}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell space-x-1">
                                            {t.isHomePay && <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10 mb-1">Home</span>}
                                            {t.isMichiganPay && <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">MI</span>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">
                                            {t.remarks || "-"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => setEditingTx({ ...t })}
                                                className="text-gray-400 hover:text-blue-600 transition-colors"
                                                title="Edit Transaction"
                                            >
                                                <FileEdit className="h-4 w-4 inline-block" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* Edit Modal / Slide-over Overlay */}
            {editingTx && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-background rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b bg-muted">
                            <h3 className="font-semibold text-lg">Edit Transaction</h3>
                            <button onClick={() => setEditingTx(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto">
                            <form id="editForm" onSubmit={handleSaveEdit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Date</label>
                                        <Input
                                            type="date"
                                            value={editingTx.date}
                                            onChange={(e) => setEditingTx({ ...editingTx, date: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                            {editingTx.category === "Mileage" ? "Miles Driven" : "Amount ($)"}
                                        </label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={editingTx.amount}
                                            onChange={(e) => setEditingTx({ ...editingTx, amount: parseFloat(e.target.value) || 0 })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Category</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={editingTx.category}
                                        onChange={(e) => setEditingTx({ ...editingTx, category: e.target.value })}
                                        required
                                    >
                                        <option value="Uncategorized">Uncategorized</option>
                                        {settings.categories.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Remarks</label>
                                    <Input
                                        type="text"
                                        value={editingTx.remarks}
                                        onChange={(e) => setEditingTx({ ...editingTx, remarks: e.target.value })}
                                    />
                                </div>

                                <div className="flex gap-6 py-2 border-t pt-4">
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            checked={editingTx.isHomePay}
                                            onChange={(e) => setEditingTx({ ...editingTx, isHomePay: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium">Home Pay</span>
                                    </label>
                                    <label className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            checked={editingTx.isMichiganPay}
                                            onChange={(e) => setEditingTx({ ...editingTx, isMichiganPay: e.target.checked })}
                                        />
                                        <span className="text-sm font-medium">Michigan Pay</span>
                                    </label>
                                </div>
                            </form>
                        </div>
                        <div className="p-4 border-t bg-muted flex justify-between gap-3">
                            <Button
                                type="button"
                                variant="destructive"
                                onClick={() => handleDelete(editingTx.rowNumber)}
                                disabled={saving}
                                className="gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Delete
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" onClick={() => setEditingTx(null)} disabled={saving}>
                                    Cancel
                                </Button>
                                <Button type="submit" form="editForm" disabled={saving}>
                                    {saving ? "Saving..." : "Save Changes"}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
