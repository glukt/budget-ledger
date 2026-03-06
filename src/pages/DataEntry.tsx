import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settingsContext';
import { appendTransaction, appendTransactions } from '../lib/sheets';
import type { Transaction } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useScheduledTransactions } from '../lib/scheduledContext';
import { appendScheduledTransaction, deleteScheduledTransaction, type ScheduledTransaction } from '../lib/sheets';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { CalendarClock, Plus, Trash2 } from 'lucide-react';

export default function DataEntry() {
    const { accessToken } = useAuth();
    const { settings } = useSettings();
    const location = useLocation();
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Scheduled Transactions State
    const { scheduledTransactions, refreshScheduledTransactions } = useScheduledTransactions();
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // New Subscription Form State
    const [subName, setSubName] = useState('');
    const [subAmount, setSubAmount] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [subIsHomePay, setSubIsHomePay] = useState(false);
    const [subIsMichiganPay, setSubIsMichiganPay] = useState(false);
    const [subIsOhioPay, setSubIsOhioPay] = useState(false);
    const [subFrequency, setSubFrequency] = useState<'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
    const [subNextDate, setSubNextDate] = useState('');
    const [subMngLoading, setSubMngLoading] = useState(false);

    const [formData, setFormData] = useState<Transaction>({
        date: location.state?.prefillDate || new Date().toISOString().split("T")[0],
        amount: 0,
        category: location.state?.prefillCategory || (settings.categories[0] || "Mileage"),
        isHomePay: false,
        isMichiganPay: false,
        isOhioPay: false,
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
                    isOhioPay: formData.isOhioPay,
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

    const handleCreateSubscription = async () => {
        if (!accessToken || !subName || !subAmount || !subCategory || !subNextDate) return;
        setSubMngLoading(true);
        try {
            const newSub: ScheduledTransaction = {
                name: subName,
                amount: parseFloat(subAmount) || 0,
                category: subCategory,
                isHomePay: subIsHomePay,
                isMichiganPay: subIsMichiganPay,
                isOhioPay: subIsOhioPay,
                frequency: subFrequency,
                nextTriggerDate: subNextDate,
            };
            await appendScheduledTransaction(accessToken, newSub);
            await refreshScheduledTransactions();

            // Reset form
            setSubName('');
            setSubAmount('');
            setSubCategory('');
            setSubIsHomePay(false);
            setSubIsMichiganPay(false);
            setSubIsOhioPay(false);
            setSubFrequency('Monthly');
            setSubNextDate('');
            setIsDialogOpen(false);

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error(err);
        } finally {
            setSubMngLoading(false);
        }
    };

    const handleDeleteSubscription = async (rowNumber?: number) => {
        if (!accessToken || !rowNumber) return;
        if (!confirm("Are you sure you want to delete this scheduled transaction?")) return;
        setSubMngLoading(true);
        try {
            await deleteScheduledTransaction(accessToken, rowNumber);
            await refreshScheduledTransactions();
        } catch (err) {
            console.error(err);
        } finally {
            setSubMngLoading(false);
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
                                    {!settings.categories.includes(formData.category) && formData.category && (
                                        <option value={formData.category}>{formData.category}</option>
                                    )}
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

                        <div className="flex gap-5 py-4 border-t border-b mb-6">
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
                            <label className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    checked={formData.isOhioPay}
                                    onChange={(e) => setFormData({ ...formData, isOhioPay: e.target.checked })}
                                />
                                <span className="text-sm font-medium border-b-2 border-red-500/50 pb-0.5">Ohio Pay</span>
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

            <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <CalendarClock className="h-5 w-5 text-blue-500" />
                            Recurring Transactions
                        </CardTitle>
                        <CardDescription>
                            Define expenses or paychecks that should be automatically logged when you open the app.
                        </CardDescription>
                    </div>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="gap-2 shrink-0">
                                <Plus className="h-4 w-4" /> Schedule New
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Create Scheduled Transaction</DialogTitle>
                                <DialogDescription>
                                    Automate an overhead cost. The engine checks this every time you log in.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Name / Identifier</Label>
                                    <input value={subName} onChange={(e) => setSubName(e.target.value)} placeholder="e.g. Fiber Internet" className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-ring" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Amount</Label>
                                        <input type="number" step="0.01" value={subAmount} onChange={(e) => setSubAmount(e.target.value)} placeholder="0.00" className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-ring" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Category</Label>
                                        <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring">
                                            <option value="" disabled>Select...</option>
                                            {settings.categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Billing Frequency</Label>
                                        <select value={subFrequency} onChange={(e) => setSubFrequency(e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                                            <option value="Weekly">Weekly</option>
                                            <option value="Monthly">Monthly</option>
                                            <option value="Yearly">Yearly</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Next Trigger Date</Label>
                                        <input type="date" value={subNextDate} onChange={(e) => setSubNextDate(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:ring-2 focus:ring-ring" />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-2">
                                    <label className="flex items-center space-x-2 text-sm">
                                        <input type="checkbox" checked={subIsHomePay} onChange={(e) => setSubIsHomePay(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span>Home Pay?</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-sm">
                                        <input type="checkbox" checked={subIsMichiganPay} onChange={(e) => setSubIsMichiganPay(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span>MI Pay?</span>
                                    </label>
                                    <label className="flex items-center space-x-2 text-sm">
                                        <input type="checkbox" checked={subIsOhioPay} onChange={(e) => setSubIsOhioPay(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                        <span className="border-b-2 border-red-500/50 pb-0.5">OH Pay?</span>
                                    </label>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button disabled={subMngLoading || !subName || !subAmount || !subCategory || !subNextDate} onClick={handleCreateSubscription}>
                                    {subMngLoading ? "Processing..." : "Save Schedule"}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {scheduledTransactions.length === 0 ? (
                            <div className="text-center py-6 text-muted-foreground text-sm border-2 border-dashed rounded-lg bg-background/50">
                                No recurring transactions scheduled.
                            </div>
                        ) : (
                            scheduledTransactions.map((st) => (
                                <div key={st.rowNumber} className="flex items-center justify-between p-3 border rounded-lg bg-card shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-sm">{st.name}</span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            <span className="bg-accent text-accent-foreground px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold">
                                                {st.frequency}
                                            </span>
                                            {st.category} • Next: <b className={new Date(st.nextTriggerDate) <= new Date() ? "text-orange-500" : ""}>{st.nextTriggerDate}</b>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-mono font-medium ${st.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            ${Math.abs(st.amount).toFixed(2)}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteSubscription(st.rowNumber)}
                                            disabled={subMngLoading}
                                            className="text-muted-foreground hover:text-red-500 p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                                            title="Delete Schedule"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
