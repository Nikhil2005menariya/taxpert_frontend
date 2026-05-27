import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PublicRoute } from './guards/PublicRoute';
import { ProtectedRoute } from './guards/ProtectedRoute';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ResetPassword from './pages/auth/ResetPassword';
import DashboardLayout from './layouts/DashboardLayout';
import ProfilePage from './pages/profile/ProfilePage';
import DashboardPage from './pages/dashboard/DashboardPage';
import MyServicesPage from './pages/my-services/MyServicesPage';
import ServiceDetailsPage from './pages/my-services/ServiceDetailsPage';
import VaultPage from './pages/vault/VaultPage';
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
import PaymentsPage from './pages/payments/PaymentsPage';
import DueDatesPage from './pages/due-dates/DueDatesPage';
import ReferralsPage from './pages/referrals/ReferralsPage';
import InvoicePage from './pages/invoices/InvoicePage';

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
