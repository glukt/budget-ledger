
import { Outlet, NavLink } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Search, LogOut, FileDown } from 'lucide-react';
import { useAuth } from '../lib/auth';

export default function Layout() {
    const { user, logout } = useAuth();

    const navItems = [
        { to: "/", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/log", icon: PlusCircle, label: "Log Expense" },
        { to: "/audit", icon: Search, label: "Audit" },
        { to: "/tax-export", icon: FileDown, label: "Tax Export" },
    ];

    return (
        <div className="flex min-h-screen bg-gray-50 flex-col pb-20 sm:flex-row sm:pb-0">
            {/* Sidebar / Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 border-t bg-white sm:static sm:h-screen sm:w-64 sm:flex-col sm:border-r sm:border-t-0 p-2 sm:p-4">
                <div className="hidden sm:block mb-8 px-4 py-2">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Str8 Ledger</h1>
                    {user && <p className="text-xs text-gray-500 truncate mt-1">{user.email}</p>}
                </div>

                <div className="flex w-full justify-around sm:flex-col sm:justify-start sm:gap-2">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.to === "/"}
                            className={({ isActive }) =>
                                `flex flex-1 flex-col items-center justify-center gap-1 sm:flex-row sm:justify-start sm:rounded-lg sm:p-3 sm:px-4 ${isActive
                                    ? "text-blue-600 sm:bg-blue-50 sm:text-blue-700 font-medium"
                                    : "text-gray-500 hover:text-gray-900 sm:hover:bg-gray-100"
                                }`
                            }
                        >
                            <item.icon className="h-6 w-6 sm:h-5 sm:w-5" />
                            <span className="text-[10px] sm:text-sm">{item.label}</span>
                        </NavLink>
                    ))}

                    <button
                        onClick={logout}
                        className="flex flex-1 flex-col items-center justify-center gap-1 sm:mt-auto sm:flex-row sm:justify-start sm:rounded-lg sm:p-3 sm:px-4 text-red-500 hover:text-red-700 sm:hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="h-6 w-6 sm:h-5 sm:w-5" />
                        <span className="text-[10px] sm:text-sm">Sign Out</span>
                    </button>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto w-full max-w-5xl mx-auto p-4 sm:p-8">
                <Outlet />
            </main>
        </div>
    );
}
