import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useSettings } from '../lib/settingsContext';
import type { Transaction } from '../lib/sheets';
import { fetchTransactions } from '../lib/sheets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Activity, DollarSign, Car, Briefcase, TrendingUp, Filter } from 'lucide-react';
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
    const navigate = useNavigate();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedYear, setSelectedYear] = useState<string>('All');
    const [selectedMonth, setSelectedMonth] = useState<string>('All');
    const [excludedCategories, setExcludedCategories] = useState<Set<string>>(new Set());

    const toggleCategory = (e: React.MouseEvent, cat: string) => {
        // Prevent event from bubbling up to the label wrapper
        e.stopPropagation();
        setExcludedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(cat)) newSet.delete(cat);
            else newSet.add(cat);
            return newSet;
        });
    };

    const jumpToLedger = (e: React.MouseEvent, cat: string) => {
        // Prevent event bubbling if necessary
        e.preventDefault();
        e.stopPropagation();
        navigate('/ledger', { state: { filterCategory: cat } });
    };

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
        const categoryTotals: Record<string, number> = {};

        transactions.forEach(t => {
            if (!t.date) return;
            const parts = t.date.split('-');
            if (parts.length < 2) return;

            // Apply Filters
            if (selectedYear !== 'All' && parts[0] !== selectedYear) return;
            if (selectedMonth !== 'All' && parts[1] !== selectedMonth) return;

            // Always add to category totals so they show in the list
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;

            // Stop processing metrics if category is isolated/excluded
            if (excludedCategories.has(t.category)) return;

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

        // As per the original Excel:
        // Total Expenses = sum of all non-mileage, non-deposit rows
        // Expenses after Reimbursement = Total Expenses - Reimbursement Total
        const expensesAfterReimbursement = totalOpEx - mileageReimbursement;

        const pieData = Object.entries(expenseBreakdown)
            .filter(([_, v]) => v > 0)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const topExpenses = individualExpenses
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 6);

        const categoryTotalsList = Object.entries(categoryTotals)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total);

        return {
            grossIncome,
            totalExpenses: totalOpEx,
            reimbursementTotal: mileageReimbursement,
            expensesAfterReimbursement,
            netIncome: grossIncome - expensesAfterReimbursement,
            mileageStats: {
                totalMiles: mileageMilesLogged,
                reimbursedValue: mileageReimbursement,
                taxDeductibleValue: mileageTaxDeductible
            },
            pieData,
            topExpenses,
            categoryTotalsList
        };
    }, [transactions, settings, selectedYear, selectedMonth, excludedCategories]);

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
                        <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                        <Activity className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${metrics.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        <p className="text-xs text-muted-foreground pt-1 border-t mt-2">
                            After Reimbursement: ${metrics.expensesAfterReimbursement.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
                        <CardTitle className="text-sm font-medium">Mileage Info</CardTitle>
                        <Car className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{metrics.mileageStats.totalMiles.toLocaleString()} mi</div>
                        <p className="text-xs text-muted-foreground pt-1 border-t mt-2 flex justify-between">
                            <span>Reimbursed: ${metrics.mileageStats.reimbursedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span>Fed Rate: ${metrics.mileageStats.taxDeductibleValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-3 md:grid-cols-2">
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

                <Card className="col-span-1 border shadow-sm flex flex-col">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Filter className="h-5 w-5 text-gray-500" />
                            Category Totals
                        </CardTitle>
                        <CardDescription>Filter metrics by category</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto max-h-[320px]">
                        <div className="space-y-2 pr-1">
                            {metrics.categoryTotalsList.map((cat, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50/50 border border-gray-100 transition-colors hover:bg-gray-50 cursor-pointer"
                                    onClick={(e) => jumpToLedger(e, cat.name)}
                                    onContextMenu={(e) => jumpToLedger(e, cat.name)}
                                    title={`Click or Right-Click to view all ${cat.name} transactions`}
                                >
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                                            checked={!excludedCategories.has(cat.name)}
                                            onChange={(e) => toggleCategory(e as any, cat.name)}
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                        <span className={`text-sm font-medium hover:text-blue-600 hover:underline ${excludedCategories.has(cat.name) ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{cat.name}</span>
                                    </div>
                                    <div className={`font-semibold tabular-nums text-sm ${excludedCategories.has(cat.name) ? 'text-gray-400' : 'text-gray-900'}`}>
                                        {cat.name === 'Mileage'
                                            ? `${cat.total.toLocaleString()} mi`
                                            : `$${cat.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
