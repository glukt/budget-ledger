import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settingsContext';
import type { Transaction } from '../lib/sheets';
import { fetchTransactions } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Activity, DollarSign, Car, Briefcase, TrendingUp } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];
const MONTHS = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' }, { value: '04', label: 'April' },
    { value: '05', label: 'May' }, { value: '06', label: 'June' },
    { value: '07', label: 'July' }, { value: '08', label: 'August' },
    { value: '09', label: 'September' }, { value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' }
];

export default function Dashboard() {
    const { accessToken } = useAuth();
    const { settings } = useSettings();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedYear, setSelectedYear] = useState<string>('All');
    const [selectedMonth, setSelectedMonth] = useState<string>('All');

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

    const availableYears = useMemo(() => {
        const years = new Set<string>();
        transactions.forEach(t => {
            if (t.date && t.date.length >= 4) {
                years.add(t.date.split('-')[0]);
            }
        });
        return Array.from(years).sort().reverse();
    }, [transactions]);

    const metrics = useMemo(() => {
        let grossIncome = 0;
        let totalOpEx = 0;
        let mileageMilesLogged = 0;
        const expenseBreakdown: Record<string, number> = {};
        const individualExpenses: { name: string; amount: number; date: string }[] = [];

        transactions.forEach(t => {
            if (!t.date) return;
            const parts = t.date.split('-');
            if (parts.length < 2) return;

            // Apply Filters
            if (selectedYear !== 'All' && parts[0] !== selectedYear) return;
            if (selectedMonth !== 'All' && parts[1] !== selectedMonth) return;

            if (t.category === 'Deposit') {
                grossIncome += t.amount;
            } else if (t.category === 'Mileage') {
                mileageMilesLogged += t.amount;
            } else {
                totalOpEx += t.amount;
                expenseBreakdown[t.category] = (expenseBreakdown[t.category] || 0) + t.amount;
                individualExpenses.push({
                    name: t.remarks || t.category,
                    amount: t.amount,
                    date: t.date
                });
            }
        });

        const mileageReimbursement = mileageMilesLogged * settings.mileageReimbursementRate;
        const mileageTaxDeductible = mileageMilesLogged * settings.mileageTaxDeductionRate;
        const comprehensiveOpEx = totalOpEx + mileageReimbursement;

        const pieData = Object.entries(expenseBreakdown)
            .filter(([_, v]) => v > 0)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const topExpenses = individualExpenses
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);

        return {
            grossIncome,
            totalOpEx: comprehensiveOpEx,
            netIncome: grossIncome - comprehensiveOpEx,
            mileageStats: {
                totalMiles: mileageMilesLogged,
                reimbursedValue: mileageReimbursement,
                taxDeductibleValue: mileageTaxDeductible
            },
            pieData,
            topExpenses
        };
    }, [transactions, settings, selectedYear, selectedMonth]);

    if (loading) return <div className="p-8 flex items-center justify-center text-gray-500">Loading insights...</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
                    <p className="text-muted-foreground">Your real-time financial insights.</p>
                </div>

                <div className="flex gap-2">
                    <select
                        className="rounded-md border border-input bg-white px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                    >
                        <option value="All">All Years</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    <select
                        className="rounded-md border border-input bg-white px-3 py-1.5 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                    >
                        <option value="All">All Months</option>
                        {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Gross Income</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.grossIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Overhead Expenses</CardTitle>
                        <Activity className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.totalOpEx.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
                            Includes ${metrics.mileageStats.reimbursedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })} Reimbursed Mileage
                        </p>
                    </CardContent>
                </Card>

                <Card className="bg-slate-900 border-none text-white shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-200">Net Income</CardTitle>
                        <Briefcase className="h-4 w-4 text-slate-400" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-bold ${metrics.netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            ${metrics.netIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Mileage Deductions</CardTitle>
                        <Car className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.mileageStats.totalMiles.toLocaleString()} mi</div>
                        <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
                            Tax Value: ${metrics.mileageStats.taxDeductibleValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="col-span-1 border shadow-sm">
                    <CardHeader>
                        <CardTitle>Overhead Breakdown</CardTitle>
                        <CardDescription>How much you're spending by category</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[320px]">
                        {metrics.pieData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={metrics.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {metrics.pieData.map((_, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        formatter={(value: any) => `$${Number(value).toFixed(2)}`}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No data for selected period.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="col-span-1 border shadow-sm flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-gray-500" />
                            Top Expenses
                        </CardTitle>
                        <CardDescription>Your largest single transactions</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto">
                        {metrics.topExpenses.length > 0 ? (
                            <div className="space-y-4">
                                {metrics.topExpenses.map((expense, i) => (
                                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50">
                                        <div className="space-y-1 overflow-hidden">
                                            <p className="text-sm font-medium leading-none truncate pr-4 text-gray-900">
                                                {expense.name}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {format(new Date(expense.date), 'MMM d, yyyy')}
                                            </p>
                                        </div>
                                        <div className="font-semibold tabular-nums text-gray-900 bg-white px-3 py-1 rounded-md shadow-sm border border-gray-100">
                                            ${expense.amount.toFixed(2)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                                No expenses to list.
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
