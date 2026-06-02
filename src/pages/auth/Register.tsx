import { Helmet } from "react-helmet-async";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthTabs from "../../components/auth/AuthTabs";

export default function Register() {
  return (
    <>
      <Helmet>
        <title>Create your account | TheTaxpert</title>
      </Helmet>
      <AuthLayout>
        <AuthTabs defaultTab="signup" />
      </AuthLayout>
    </>
  );
}
