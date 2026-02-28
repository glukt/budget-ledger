import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './lib/auth'

import Dashboard from './pages/Dashboard'
import DataEntry from './pages/DataEntry'
import AuditLedger from './pages/AuditLedger'
import TaxExport from './pages/TaxExport'
import Login from './pages/Login'
import Layout from './components/Layout'

// Protected Route Wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;

  return <>{children}</>;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="log" element={<DataEntry />} />
          <Route path="audit" element={<AuditLedger />} />
          <Route path="tax-export" element={<TaxExport />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
