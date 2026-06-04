import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Loader from "./components/ui/Loader";
import { useAuth } from './contexts/AuthContext';
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
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import ServicesConfigPage from './pages/admin/ServicesConfigPage';
import DocumentTypesPage from './pages/admin/DocumentTypesPage';
import ServiceEditPage from './pages/admin/ServiceEditPage';
import CouponsPage from './pages/admin/CouponsPage';
import InvoiceSettingsPage from './pages/admin/InvoiceSettingsPage';
import AdminTexpertDetailPage from './pages/admin/AdminTexpertDetailPage';
import AdminClientDetailPage from './pages/admin/AdminClientDetailPage';
import AdminQueuePage from './pages/admin/AdminQueuePage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminInquiriesPage from './pages/admin/AdminInquiriesPage';
import AdminServiceDetailPage from './pages/admin/AdminServiceDetailPage';
import AdminClientServicesPage from './pages/admin/AdminClientServicesPage';
import TexpertServiceDetailPage from './pages/texpert/TexpertServiceDetailPage';
import TexpertServicesPage from './pages/texpert/TexpertServicesPage';
import TexpertDashboardPage from './pages/texpert/TexpertDashboardPage';
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

// Smart redirect — sends each role to its home after login or on /dashboard visits.
function RoleBasedRedirect() {
  const { profile, isLoading } = useAuth();
  if (isLoading) return <div className="page-loader page-loader--full"><Loader /></div>;
  const role = profile?.role ?? 'client';
  if (role === 'admin' || role === 'super_admin') return <Navigate to="/admin" replace />;
  if (role === 'expert' || role === 'ca')         return <Navigate to="/texpert/dashboard" replace />;
  return <Navigate to="/client/dashboard" replace />;
}

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

          {/* Smart redirect — /dashboard always sends to the right role home */}
          <Route path="/dashboard" element={<RoleBasedRedirect />} />

          {/* Shared profile — accessible to all roles */}
          <Route path="/profile"             element={<ProfilePage />} />

          {/* ── Client ─────────────────────────────────────────── */}
          <Route path="/client/dashboard"    element={<DashboardPage />} />
          <Route path="/client/services"     element={<MyServicesPage />} />
          <Route path="/client/services/:id" element={<ServiceDetailsPage />} />
          <Route path="/client/vault"        element={<VaultPage />} />
          <Route path="/client/payments"     element={<PaymentsPage />} />
          <Route path="/client/due-dates"    element={<DueDatesPage />} />
          <Route path="/client/referrals"    element={<ReferralsPage />} />
          <Route path="/client/invoices/:id" element={<InvoicePage />} />

          {/* ── Texpert ────────────────────────────────────────── */}
          <Route path="/texpert/dashboard"    element={<TexpertDashboardPage />} />
          <Route path="/texpert/services"     element={<TexpertServicesPage />} />
          <Route path="/texpert/services/:id" element={<TexpertServiceDetailPage />} />
          <Route path="/texpert/queue"        element={<AdminQueuePage />} />

          {/* ── Admin ──────────────────────────────────────────── */}
          <Route path="/admin"                        element={<AdminDashboardPage />} />
          <Route path="/admin/users"                  element={<AdminPage />} />
          <Route path="/admin/queue"                  element={<AdminQueuePage />} />
          <Route path="/admin/payments"               element={<PaymentsPage />} />
          <Route path="/admin/services"               element={<ServicesConfigPage />} />
          <Route path="/admin/services/:id"           element={<ServiceEditPage />} />
          <Route path="/admin/document-types"         element={<DocumentTypesPage />} />
          <Route path="/admin/coupons"                element={<CouponsPage />} />
          <Route path="/admin/settings/invoice"       element={<InvoiceSettingsPage />} />
          <Route path="/admin/users/taxpert/:id"       element={<AdminTexpertDetailPage />} />
          <Route path="/admin/users/client/:id"        element={<AdminClientDetailPage />} />
          <Route path="/admin/audit"                  element={<AdminAuditPage />} />
          <Route path="/admin/inquiries"              element={<AdminInquiriesPage />} />
          <Route path="/admin/client-services"          element={<AdminClientServicesPage />} />
          <Route path="/admin/client-services/:id"    element={<AdminServiceDetailPage />} />

          {/* Legacy / shared */}
          <Route path="/workload"   element={<WorkloadPage />} />
          <Route path="/work-queue" element={<WorkQueuePage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
