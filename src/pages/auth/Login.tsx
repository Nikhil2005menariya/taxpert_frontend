import { Helmet } from "react-helmet-async";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthTabs from "../../components/auth/AuthTabs";

export default function Login() {
  return (
    <>
      <Helmet>
        <title>Sign in | TheTaxpert</title>
      </Helmet>
      <AuthLayout>
        <AuthTabs defaultTab="login" />
      </AuthLayout>
    </>
  );
}
