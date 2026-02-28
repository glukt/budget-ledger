import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { fetchTransactions } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { FileDown } from 'lucide-react';

export default function TaxExport() {
    const { accessToken } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [year, setYear] = useState<number>(new Date().getFullYear());

    const handleExport = async () => {
        if (!accessToken) return;
        setLoading(true);
        setError(null);

        try {
            const allTransactions = await fetchTransactions(accessToken);

            // Filter for the selected year
            const yearTransactions = allTransactions.filter(t => {
                if (!t.date) return false;
                const tYear = new Date(t.date).getFullYear();
                return tYear === year;
            });

            if (yearTransactions.length === 0) {
                setError(`No transactions found for the year ${year}.`);
                setLoading(false);
                return;
            }

            let grossIncome = 0;
            let totalOpEx = 0;
            let mileageMilesLogged = 0;
            const expenseBreakdown: Record<string, number> = {};

            yearTransactions.forEach(t => {
                if (t.category === 'Deposit') {
                    grossIncome += t.amount;
                } else if (t.category === 'Mileage') {
                    mileageMilesLogged += t.amount;
                } else {
                    totalOpEx += t.amount;
                    expenseBreakdown[t.category] = (expenseBreakdown[t.category] || 0) + t.amount;
                }
            });

            const mileageReimbursement = Math.round((mileageMilesLogged * 0.55) * 100) / 100;
            const mileageTaxDeductible = Math.round((mileageMilesLogged * 0.15) * 100) / 100;

            // Generate CPA Summary CSV
            const summaryRows = [
                ["Tax Year", year.toString()],
                [""],
                ["INCOME"],
                ["Gross Income", grossIncome.toFixed(2)],
                ["", ""],
                ["OPERATIONAL EXPENSES (OpEx)"],
                ["Total OpEx (Excluding Mileage)", totalOpEx.toFixed(2)],
            ];

            Object.entries(expenseBreakdown).forEach(([cat, amount]) => {
                summaryRows.push([`  - ${cat}`, amount.toFixed(2)]);
            });

            summaryRows.push(["", ""]);
            summaryRows.push(["MILEAGE & DEDUCTIONS"]);
            summaryRows.push(["Total Miles Driven", mileageMilesLogged.toString()]);
            summaryRows.push(["Standard Reimbursed Mileage Value ($0.55/mi)", mileageReimbursement.toFixed(2)]);
            summaryRows.push(["IRS Tax Deductible Mileage Value ($0.15/mi)", mileageTaxDeductible.toFixed(2)]);

            const csvContent = summaryRows.map(e => e.join(",")).join("\n");

            // Trigger Download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `CPA_Summary_Report_${year}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err: any) {
            setError(err.message || "Failed to generate export.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-md mx-auto">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Tax Export</h2>
                <p className="text-muted-foreground">Download aggregated data for your CPA.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Generate CPA Report</CardTitle>
                    <CardDescription>
                        This generates a clean Summary CSV categorized by IRS Schedule lines for the selected fiscal year.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Fiscal Year</label>
                        <select
                            className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                        >
                            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                            <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                            <option value={new Date().getFullYear() - 2}>{new Date().getFullYear() - 2}</option>
                        </select>
                    </div>

                    {error && <div className="text-sm text-red-500 font-medium">{error}</div>}

                    <Button onClick={handleExport} disabled={loading} className="w-full gap-2">
                        <FileDown className="h-4 w-4" />
                        {loading ? "Generating..." : "Download CSV Report"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
