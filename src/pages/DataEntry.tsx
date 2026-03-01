import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settingsContext';
import { appendTransaction, appendTransactions } from '../lib/sheets';
import type { Transaction } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

export default function DataEntry() {
    const { accessToken } = useAuth();
    const { settings } = useSettings();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Transaction>({
        date: new Date().toISOString().split("T")[0],
        amount: 0,
        category: "Mileage",
        isHomePay: false,
        isMichiganPay: false,
        remarks: "",
    });

    const [isSplit, setIsSplit] = useState(false);
    const [splits, setSplits] = useState<{ amount: number, category: string, remarks: string }[]>([
        { amount: 0, category: settings.categories[0] || 'Uncategorized', remarks: "" },
        { amount: 0, category: settings.categories[0] || 'Uncategorized', remarks: "" }
    ]);

    const handleAddSplit = () => {
        setSplits([...splits, { amount: 0, category: settings.categories[0] || 'Uncategorized', remarks: "" }]);
    };

    const handleRemoveSplit = (index: number) => {
        if (splits.length > 2) {
            setSplits(splits.filter((_, i) => i !== index));
        }
    };

    const handleSplitChange = (index: number, field: 'amount' | 'category' | 'remarks', value: any) => {
        const newSplits = [...splits];
        newSplits[index] = { ...newSplits[index], [field]: value };
        setSplits(newSplits);
    };

    const splitTotal = splits.reduce((sum, split) => sum + (Number(split.amount) || 0), 0);
    const isSplitValid = Math.abs(formData.amount - splitTotal) < 0.01;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accessToken) {
            setError("You must be logged in to submit data.");
            return;
        }

        setLoading(true);
        setError(null);
        setSuccess(false);

        try {
            if (isSplit) {
                if (!isSplitValid) {
                    setError("Split amounts must equal the parent transaction total.");
                    setLoading(false);
                    return;
                }

                // Map the splits into full transaction objects
                const splitTransactions: Transaction[] = splits.map(split => ({
                    date: formData.date,
                    amount: split.amount,
                    category: split.category,
                    isHomePay: formData.isHomePay,
                    isMichiganPay: formData.isMichiganPay,
                    remarks: split.remarks || formData.remarks || "Split Transaction", // Fallback remarks
                }));

                await appendTransactions(accessToken, splitTransactions);
            } else {
                await appendTransaction(accessToken, formData);
            }
            setSuccess(true);
            // Reset form but keep the date & toggles for rapid entry
            setFormData(prev => ({
                ...prev,
                amount: 0,
                remarks: "",
            }));
            if (isSplit) {
                setSplits([
                    { amount: 0, category: settings.categories[0] || 'Uncategorized', remarks: "" },
                    { amount: 0, category: settings.categories[0] || 'Uncategorized', remarks: "" }
                ]);
            }
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to log expense.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-lg mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Log Expense</h2>
                <p className="text-muted-foreground">Record a new transaction or mileage log.</p>
            </div>

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle>Transaction Details</CardTitle>
                        <CardDescription>All fields will be saved to your Google Sheet.</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Date</label>
                                <Input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">
                                    {formData.category === "Mileage" && !isSplit ? "Miles Driven" : isSplit ? "Parent Amount ($)" : "Amount ($)"}
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.amount || ""}
                                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                        </div>

                        {!isSplit && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-4">
                                <label className="text-sm font-medium">Category</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    required
                                >
                                    {settings.categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium">
                                {isSplit ? 'Master Remarks (Optional, applied to all)' : 'Remarks (Optional)'}
                            </label>
                            <Input
                                type="text"
                                placeholder={isSplit ? "e.g., Home Depot Run" : "Client name, location, etc."}
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            />
                        </div>

                        {/* SPLIT TOGGLE & LOGIC */}
                        <div className="pt-4 pb-2 border-t mt-6">
                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                        checked={isSplit}
                                        onChange={(e) => setIsSplit(e.target.checked)}
                                    />
                                    <span className="text-sm font-bold text-foreground">Split Transaction</span>
                                </label>
                                {isSplit && (
                                    <div className={`text-xs font-semibold px-2 py-1 rounded bg-accent ${isSplitValid ? 'text-green-600' : 'text-red-500'}`}>
                                        ${splitTotal.toFixed(2)} / ${formData.amount.toFixed(2)}
                                    </div>
                                )}
                            </div>

                            {isSplit && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 rounded-lg bg-accent/30 p-4 border border-border">
                                    <div className="space-y-3">
                                        {splits.map((split, index) => (
                                            <div key={index} className="flex flex-col gap-2 relative p-3 bg-background rounded-md border shadow-sm">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sub-Item {index + 1}</span>
                                                    {splits.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSplit(index)}
                                                            className="text-xs text-red-500 hover:text-red-700 p-1"
                                                            title="Remove split"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="$0.00"
                                                        className="w-1/3"
                                                        value={split.amount || ""}
                                                        onChange={(e) => handleSplitChange(index, "amount", parseFloat(e.target.value) || 0)}
                                                        required
                                                    />
                                                    <select
                                                        className="flex h-10 w-2/3 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                                                        value={split.category}
                                                        onChange={(e) => handleSplitChange(index, "category", e.target.value)}
                                                        required
                                                    >
                                                        {settings.categories.map((cat) => (
                                                            <option key={cat} value={cat}>
                                                                {cat}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <Input
                                                    type="text"
                                                    placeholder="Sub-item notes (e.g., specific supply)"
                                                    value={split.remarks}
                                                    onChange={(e) => handleSplitChange(index, "remarks", e.target.value)}
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="w-full mt-2"
                                        onClick={handleAddSplit}
                                    >
                                        + Add Another Split
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-6 py-4 border-t border-b mb-6">
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    checked={formData.isHomePay}
                                    onChange={(e) => setFormData({ ...formData, isHomePay: e.target.checked })}
                                />
                                <span className="text-sm font-medium">Home Pay</span>
                            </label>
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    checked={formData.isMichiganPay}
                                    onChange={(e) => setFormData({ ...formData, isMichiganPay: e.target.checked })}
                                />
                                <span className="text-sm font-medium">Michigan Pay</span>
                            </label>
                        </div>

                        {error && <div className="text-sm text-red-500 font-medium p-3 bg-red-50/50 rounded-md border border-red-100">{error}</div>}
                        {success && <div className="text-sm text-green-600 font-medium p-3 bg-green-50/50 rounded-md border border-green-100">Successfully logged!</div>}

                        <Button type="submit" className="w-full min-h-[48px] text-lg font-semibold" disabled={loading || (isSplit && !isSplitValid)}>
                            {loading ? "Saving..." : isSplit ? "Save Split Records" : "Save Entry"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
