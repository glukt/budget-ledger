import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settingsContext';
import { appendTransaction } from '../lib/sheets';
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
            await appendTransaction(accessToken, formData);
            setSuccess(true);
            // Reset form but keep the date for rapid entry
            setFormData(prev => ({
                ...prev,
                amount: 0,
                remarks: "",
            }));
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
                <CardHeader>
                    <CardTitle>Transaction Details</CardTitle>
                    <CardDescription>All fields will be saved to your Google Sheet.</CardDescription>
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
                                    {formData.category === "Mileage" ? "Miles Driven" : "Amount ($)"}
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Category</label>
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focusFocus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Remarks (Optional)</label>
                            <Input
                                type="text"
                                placeholder="Client name, location, etc."
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                            />
                        </div>

                        <div className="flex gap-6 py-2">
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

                        {error && <div className="text-sm text-red-500 font-medium">{error}</div>}
                        {success && <div className="text-sm text-green-600 font-medium">Successfully logged!</div>}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Saving..." : "Save Entry"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
