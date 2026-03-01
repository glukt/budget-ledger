import { useEffect, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { fetchTransactions, updateTransaction, deleteTransaction } from '../lib/sheets';
import type { Transaction } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { format } from 'date-fns';
import { FileEdit, Trash2, X } from 'lucide-react';

const CATEGORIES = [
    "Mileage", "Deposit", "Internet", "Power", "Phone",
    "Liability Insurance", "Tools/Supplies", "Meals", "Lodging", "Fuel", "Other"
];

export default function AuditLedger() {
    const { accessToken } = useAuth();
    const location = useLocation();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filtering State
    const [selectedCategory, setSelectedCategory] = useState<string>(
        location.state?.filterCategory || 'All'
    );

    // Modal State
    const [editingTx, setEditingTx] = useState<Transaction | null>(null);
    const [saving, setSaving] = useState(false);

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

    const filteredTransactions = useMemo(() => {
        if (selectedCategory === 'All') return transactions;
        if (selectedCategory === 'ExpenseOnly') return transactions.filter(t => t.category !== 'Deposit' && t.category !== 'Mileage');
        return transactions.filter(t => t.category === selectedCategory);
    }, [transactions, selectedCategory]);

    return (
        <div className="space-y-6 relative">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Audit Ledger</h2>
                    <p className="text-muted-foreground">Historical view of all transactions.</p>
                </div>

                <div className="flex items-center gap-4">
                    <select
                        className="rounded-md border border-input bg-white px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                        <option value="All">All Categories</option>
                        <option value="ExpenseOnly">All Expenses (Excl. Mileage)</option>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>

                    <button
                        onClick={loadData}
                        className="text-sm text-blue-600 hover:text-blue-800"
                        disabled={loading || saving}
                    >
                        {loading ? "Refreshing..." : "Refresh"}
                    </button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Transaction History</CardTitle>
                </CardHeader>
                <CardContent>
                    {error && <div className="text-red-500 mb-4">{error}</div>}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                <tr>
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
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                            No transactions found for the selected category.
                                        </td>
                                    </tr>
                                )}
                                {filteredTransactions.map((t, idx) => (
                                    <tr key={idx} className="bg-white border-b hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {t.date && !isNaN(new Date(t.date).getTime()) ? format(new Date(t.date), 'MMM d, yyyy') : (t.date || "Unknown Date")}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">
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
                                        <td className="px-4 py-3 text-gray-500 truncate max-w-[150px] sm:max-w-[200px]">
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
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
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
                                        {CATEGORIES.map((cat) => (
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
                        <div className="p-4 border-t bg-gray-50 flex justify-between gap-3">
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
