import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settingsContext';
import type { Transaction } from '../lib/sheets';
import { fetchTransactions } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Activity, DollarSign, Car, Briefcase } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function Dashboard() {
    const { accessToken } = useAuth();
    const { settings } = useSettings();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (accessToken) {
            fetchTransactions(accessToken).then((data) => {
                setTransactions(data);
                setLoading(false);
            }).catch(err => {
                console.error("Dashboard error", err);
                setLoading(false);
            });
        }
    }, [accessToken]);

    const metrics = useMemo(() => {
        let grossIncome = 0;
        let totalOpEx = 0;
        let mileageMilesLogged = 0;
        const expenseBreakdown: Record<string, number> = {};

        transactions.forEach(t => {
            if (t.category === 'Deposit') {
                grossIncome += t.amount;
            } else if (t.category === 'Mileage') {
                mileageMilesLogged += t.amount;
            } else {
                totalOpEx += t.amount;
                expenseBreakdown[t.category] = (expenseBreakdown[t.category] || 0) + t.amount;
            }
        });

        const mileageReimbursement = mileageMilesLogged * settings.mileageReimbursementRate;
        const mileageTaxDeductible = mileageMilesLogged * settings.mileageTaxDeductionRate;
        const comprehensiveOpEx = totalOpEx + mileageReimbursement;

        const pieData = Object.entries(expenseBreakdown)
            .filter(([_, v]) => v > 0)
            .map(([name, value]) => ({ name, value }));

        return {
            grossIncome,
            totalOpEx: comprehensiveOpEx,
            netIncome: grossIncome - comprehensiveOpEx,
            mileageStats: {
                totalMiles: mileageMilesLogged,
                reimbursedValue: mileageReimbursement,
                taxDeductibleValue: mileageTaxDeductible
            },
            pieData
        };
    }, [transactions, settings]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading metrics...</div>;

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                <p className="text-muted-foreground">Your real-time financial P&L generated from Google Sheets.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Gross Income</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.grossIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.totalOpEx.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
                            Includes ${metrics.mileageStats.reimbursedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} Reimbursed Mileage
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            ${metrics.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Mileage Deductions</CardTitle>
                        <Car className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.mileageStats.totalMiles.toLocaleString()} mi</div>
                        <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
                            Tax Value: ${metrics.mileageStats.taxDeductibleValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Overhead Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        {metrics.pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.pieData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {metrics.pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip formatter={(value: any) => `$${Number(value).toFixed(2)}`} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No expense data yet.</div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
