import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import Receipts from './pages/Receipts.jsx';
import ReceiptForm from './pages/ReceiptForm.jsx';
import Deliveries from './pages/Deliveries.jsx';
import DeliveryForm from './pages/DeliveryForm.jsx';
import Transfers from './pages/Transfers.jsx';
import Adjustments from './pages/Adjustments.jsx';
import MoveHistory from './pages/MoveHistory.jsx';
import Analytics from './pages/Analytics.jsx';
import Warehouses from './pages/Settings/Warehouses.jsx';
import Locations from './pages/Settings/Locations.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/operations/receipts" element={<Receipts />} />
          <Route path="/operations/receipts/:id" element={<ReceiptForm />} />
          <Route path="/operations/deliveries" element={<Deliveries />} />
          <Route path="/operations/deliveries/:id" element={<DeliveryForm />} />
          <Route path="/operations/transfers" element={<Transfers />} />
          <Route path="/operations/adjustments" element={<Adjustments />} />
          <Route path="/move-history" element={<MoveHistory />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings/warehouses" element={<Warehouses />} />
          <Route path="/settings/locations" element={<Locations />} />
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AuthProvider>
  );
}
