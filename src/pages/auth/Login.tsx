import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import AuthTabs from "../../components/auth/AuthTabs";

export default function Login() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <div className="auth-shell">
        <AuthTabs defaultTab="login" />
      </div>
      <Footer />
    </main>
  );
}
