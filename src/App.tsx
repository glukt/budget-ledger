import React from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { ThemeProvider } from './lib/themeContext'
import { ScheduledTransactionsProvider } from './lib/scheduledContext'
import { useRecurringEngine } from './lib/recurringEngine'
import { Toaster } from 'sonner'

import Dashboard from './pages/Dashboard'
import DataEntry from './pages/DataEntry'
import AuditLedger from './pages/AuditLedger'
import TaxExport from './pages/TaxExport'
import Login from './pages/Login'
import Layout from './components/Layout'
import Migrate from './pages/Migrate'
import Settings from './pages/Settings'

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  // This engine silently wakes up after `user` and `scheduledTransactions` load,
  // evaluates if any Trigger Dates are past due, and batch processes them.
  useRecurringEngine();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <ScheduledTransactionsProvider>
                <Layout />
              </ScheduledTransactionsProvider>
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="log" element={<DataEntry />} />
            <Route path="audit" element={<AuditLedger />} />
            <Route path="tax-export" element={<TaxExport />} />
            <Route path="settings" element={<Settings />} />
            <Route path="migrate" element={<Migrate />} />
          </Route>
        </Routes>
        <Toaster position="bottom-right" richColors />
      </HashRouter>
    </ThemeProvider>
  )
}

export default App
