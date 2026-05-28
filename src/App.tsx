import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute } from './guards/PublicRoute';
import { ProtectedRoute } from './guards/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import DashboardLayout from './layouts/DashboardLayout';
import ProfilePage from './pages/client/profile/ProfilePage';
import DashboardPage from './pages/client/dashboard/DashboardPage';
import MyServicesPage from './pages/client/my-services/MyServicesPage';
import ServiceDetailsPage from './pages/client/my-services/ServiceDetailsPage';
import VaultPage from './pages/client/vault/VaultPage';
import WorkloadPage from './pages/workload/WorkloadPage';
import WorkQueuePage from './pages/work-queue/WorkQueuePage';
import AdminPage from './pages/admin/AdminPage';
import ServicesConfigPage from './pages/admin/ServicesConfigPage';
import DocumentTypesPage from './pages/admin/DocumentTypesPage';
import NewServicePage from './pages/admin/NewServicePage';
import ServiceEditPage from './pages/admin/ServiceEditPage';
import PricingPage from './pages/admin/PricingPage';
import CouponsPage from './pages/admin/CouponsPage';
import InvoiceSettingsPage from './pages/admin/InvoiceSettingsPage';
import AdminTaxpertsPage from './pages/admin/AdminTaxpertsPage';
import AdminTexpertDetailPage from './pages/admin/AdminTexpertDetailPage';
import AdminClientsPage from './pages/admin/AdminClientsPage';
import AdminClientDetailPage from './pages/admin/AdminClientDetailPage';
import AdminQueuePage from './pages/admin/AdminQueuePage';
import AdminPayoutsPage from './pages/admin/AdminPayoutsPage';
import AdminNotifyPage from './pages/admin/AdminNotifyPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminServiceDetailPage from './pages/admin/AdminServiceDetailPage';
import PaymentsPage from './pages/client/payments/PaymentsPage';
import DueDatesPage from './pages/client/due-dates/DueDatesPage';
import ReferralsPage from './pages/client/referrals/ReferralsPage';
import InvoicePage from './pages/client/invoices/InvoicePage';

import HomePage from './pages/public/HomePage';
import ServicesCatalogPage from './pages/public/ServicesCatalogPage';
import ServiceDetailPage from './pages/public/ServiceDetailPage';
import BlogPage from './pages/public/BlogPage';
import BlogPostPage from './pages/public/BlogPostPage';
import PrivacyPolicyPage from './pages/public/legal/PrivacyPolicyPage';
import TermsPage from './pages/public/legal/TermsPage';
import RefundPolicyPage from './pages/public/legal/RefundPolicyPage';
import DisclaimerPage from './pages/public/legal/DisclaimerPage';
import ContactPage from './pages/public/ContactPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/services" element={<ServicesCatalogPage />} />
        <Route path="/services/:slug" element={<ServiceDetailPage />} />
        <Route path="/blog" element={<BlogPage />} />
        <Route path="/blog/:slug" element={<BlogPostPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-of-service" element={<TermsPage />} />
        <Route path="/refund-policy" element={<RefundPolicyPage />} />
        <Route path="/disclaimer" element={<DisclaimerPage />} />
        <Route path="/contact" element={<ContactPage />} />

        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        
        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/my-services" element={<MyServicesPage />} />
          <Route path="/my-services/:id" element={<ServiceDetailsPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/workload" element={<WorkloadPage />} />
          <Route path="/work-queue" element={<WorkQueuePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/services" element={<ServicesConfigPage />} />
          <Route path="/admin/services/new" element={<NewServicePage />} />
          <Route path="/admin/services/:id" element={<ServiceEditPage />} />
          <Route path="/admin/document-types" element={<DocumentTypesPage />} />
          <Route path="/admin/pricing" element={<PricingPage />} />
          <Route path="/admin/coupons" element={<CouponsPage />} />
          <Route path="/admin/settings/invoice" element={<InvoiceSettingsPage />} />
          {/* Phase 2: Admin */}
          <Route path="/admin/taxperts" element={<AdminTaxpertsPage />} />
          <Route path="/admin/taxperts/:id" element={<AdminTexpertDetailPage />} />
          <Route path="/admin/clients" element={<AdminClientsPage />} />
          <Route path="/admin/clients/:id" element={<AdminClientDetailPage />} />
          <Route path="/admin/payouts" element={<AdminPayoutsPage />} />
          <Route path="/admin/notify" element={<AdminNotifyPage />} />
          <Route path="/admin/audit" element={<AdminAuditPage />} />
          <Route path="/admin/client-services/:id" element={<AdminServiceDetailPage />} />
          {/* Shared queue — accessible to admin and taxpert */}
          <Route path="/queue" element={<AdminQueuePage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/invoices/:id" element={<InvoicePage />} />
          <Route path="/due-dates" element={<DueDatesPage />} />
          <Route path="/referrals" element={<ReferralsPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
