import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import AuthTabs from "../../components/auth/AuthTabs";

export default function Register() {
  return (
    <main className="marketing-shell">
      <Navbar />
      <div className="auth-shell">
        <AuthTabs defaultTab="signup" />
      </div>
      <Footer />
    </main>
  );
}
