import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { fetchTransactions } from '../lib/sheets';
import type { Transaction } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { format } from 'date-fns';

export default function AuditLedger() {
    const { accessToken } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(data);
        } catch (err: any) {
            setError("Failed to load transactions. Check your connection or Spreadsheet ID.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Audit Ledger</h2>
                    <p className="text-muted-foreground">Historical view of all transactions.</p>
                </div>
                <button
                    onClick={loadData}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    disabled={loading}
                >
                    {loading ? "Refreshing..." : "Refresh"}
                </button>
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
                                    <th className="px-4 py-3 hidden sm:table-cell">Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                            No transactions found. Log one to get started!
                                        </td>
                                    </tr>
                                )}
                                {transactions.map((t, idx) => (
                                    <tr key={idx} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {t.date ? format(new Date(t.date), 'MMM d, yyyy') : "Invalid Date"}
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
                                            {t.isHomePay && <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">Home</span>}
                                            {t.isMichiganPay && <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">MI</span>}
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-gray-500 truncate max-w-[200px]">
                                            {t.remarks}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
