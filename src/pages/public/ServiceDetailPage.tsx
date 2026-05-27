import { useState } from "react";
import { Link, useParams, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { serviceCategories as staticCategories } from "../../shared/site-content";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";
import { Helmet } from "react-helmet-async";
import { formatRupees } from "../../shared/finance-utils";

// ── Razorpay pay button ───────────────────────────────────────

function PaymentButton({
  slug,
  serviceName,
  formattedPrice,
}: {
  slug: string;
  serviceName: string;
  formattedPrice: string;
}) {
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "loading" | "verifying" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handlePayment() {
    setError(null);
    setState("loading");
    try {
      const assignRes = await apiClient.post("/services/assign", { slug });
      const clientServiceId = assignRes.data.data.id;

      const orderRes = await apiClient.post("/payments/create-order", { slug });
      const { orderId, amount, currency, keyId } = orderRes.data.data;

      setState("idle");
      const rzp = new (window as any).Razorpay({
        key: keyId,
        amount,
        currency,
        name: "TheTaxpert",
        description: serviceName,
        order_id: orderId,
        handler: async function (response: any) {
          setState("verifying");
          try {
            await apiClient.post("/payments/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              serviceSlug: slug,
            });
            setState("success");
            setTimeout(() => navigate(`/my-services/${clientServiceId}`), 2000);
          } catch (err: any) {
            setState("error");
            setError(err.response?.data?.error ?? "Payment verification failed.");
          }
        },
        modal: { ondismiss() { setState("idle"); } },
        theme: { color: "#c49a3a" },
      });
      rzp.open();
    } catch (err: any) {
      setState("error");
      setError(err.response?.data?.error ?? "Failed to initiate payment");
    }
  }

  if (state === "success") {
    return <div style={{ color: "#16a34a", fontWeight: 500, padding: "1rem", background: "#f0fdf4", borderRadius: "0.5rem" }}>Payment successful! Redirecting...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      {error && <div style={{ color: "#dc2626", fontSize: "0.875rem" }}>{error}</div>}
      <button
        onClick={handlePayment}
        disabled={state !== "idle"}
        className="btn btn-primary"
        style={{ width: "100%" }}
      >
        {state === "idle" ? `Pay Now · ${formattedPrice}` : "Processing..."}
      </button>
      <p style={{ fontSize: "0.75rem", color: "#64748b", textAlign: "center" }}>Secure payment via Razorpay</p>
    </div>
  );
}

// ── Category detail page ──────────────────────────────────────

interface MarketingServiceItem {
  name: string;
  slug: string;
  summary: string;
  details: string;
  bestFor: string;
  price: string | null;
  priceRaw: number;
}

interface MarketingCategory {
  title: string;
  slug: string;
  description: string;
  items: MarketingServiceItem[];
}

function CategoryDetailPage({
  category,
  categorySlug,
}: {
  category: MarketingCategory;
  categorySlug: string;
}) {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const selectedSvcSlug = searchParams.get("svc");
  const { profile } = useAuth();
  const navigate = useNavigate();

  const selected: MarketingServiceItem | undefined =
    (selectedSvcSlug ? category.items.find((i) => i.slug === selectedSvcSlug) : undefined)
    ?? category.items[0];

  if (!selected) return <div style={{ padding: "3rem", textAlign: "center" }}>Service not found</div>;

  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["service-price", selected.slug],
    queryFn: async () => {
      const res = await apiClient.get(`/services/${selected.slug}/price`);
      return res.data.data as { price: number };
    },
  });

  const { data: docsData } = useQuery({
    queryKey: ["service-docs", selected.slug],
    queryFn: async () => {
      const res = await apiClient.get(`/services/${selected.slug}/documents`);
      // backend returns flat: { id, name, required, description }
      return res.data.data as { id: string; name: string; required: boolean; description: string | null }[];
    },
  });

  const { data: existsData } = useQuery({
    queryKey: ["service-exists", selected.slug],
    queryFn: async () => {
      const res = await apiClient.get(`/services/${selected.slug}/check`);
      return res.data as { exists: boolean; clientServiceId?: string };
    },
    enabled: !!profile,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post("/services/assign", { slug: selected.slug });
      return res.data.data as { id: string };
    },
    onSuccess: (data) => navigate(`/vault?svc=${data.id}`),
    onError: () => alert("Failed to add service. Please try again."),
  });

  const price = priceData?.price ?? selected.priceRaw ?? 0;
  const isPaid = price > 0;
  const formattedPrice = isPaid ? formatRupees(price) : "Free";
  const refSuffix = refCode ? `&ref=${refCode}` : "";

  return (
    <>
      <Helmet>
        <title>{selected.name} | TheTaxpert</title>
        <meta name="description" content={selected.summary} />
      </Helmet>
      <Navbar isLoggedIn={!!profile} />
      <main className="svc-detail-page">
        <div className="container">
          <Link to="/services" className="back-link">← All Services</Link>

          <div className="svc-detail-shell">
            {/* LEFT: sub-service list */}
            <aside className="svc-detail-menu">
              <div className="svc-detail-menu-label">{category.title}</div>
              <nav className="svc-detail-nav">
                {category.items.map((item) => (
                  <Link
                    key={item.slug}
                    to={`/services/${categorySlug}?svc=${item.slug}`}
                    className={`svc-detail-nav-item${item.slug === selected.slug ? " svc-detail-nav-item-active" : ""}`}
                  >
                    <span className="svc-detail-nav-name">{item.name}</span>
                    {item.price && (
                      <span className="svc-detail-nav-price">{item.price}</span>
                    )}
                  </Link>
                ))}
              </nav>
            </aside>

            {/* CENTER: service info */}
            <article className="svc-detail-center">
              <span className="section-kicker">{category.title}</span>
              <h1 className="svc-detail-title">{selected.name}</h1>
              <p className="svc-detail-lead">{selected.summary}</p>

              {selected.details && (
                <div className="svc-detail-section">
                  <h2 className="svc-detail-h2">What this service covers</h2>
                  <p>{selected.details}</p>
                </div>
              )}

              {selected.bestFor && (
                <div className="svc-detail-section">
                  <h2 className="svc-detail-h2">Best suited for</h2>
                  <p>{selected.bestFor}</p>
                </div>
              )}
            </article>

            {/* RIGHT: docs + action */}
            <aside className="svc-detail-side">
              {docsData && docsData.length > 0 && (
                <div className="svc-detail-docs-card">
                  <div className="svc-detail-docs-title">Required Documents</div>
                  <ul className="svc-detail-docs-list">
                    {docsData.map((t) => (
                      <li key={t.id} className="svc-detail-docs-item">
                        <span className={`svc-detail-docs-dot${t.required ? " svc-detail-docs-dot-req" : ""}`} />
                        <div className="svc-detail-docs-item-body">
                          <span className="svc-detail-docs-item-name">{t.name}</span>
                          {t.description && (
                            <span className="svc-detail-docs-hint">{t.description}</span>
                          )}
                        </div>
                        {t.required && <span className="svc-detail-docs-req-badge">Required</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="svc-detail-action-card">
                {isPaid && (
                  <>
                    <div className="pay-price-row">
                      <span className="pay-label">Service fee</span>
                      <span className="pay-amount">{priceLoading ? "..." : formattedPrice}</span>
                    </div>
                    <p className="pay-note">Inclusive of all taxes · One-time payment</p>
                  </>
                )}

                {existsData?.exists ? (
                  <div className="svc-already-added">
                    <span>✓ Already added</span>
                    <Link
                      to={existsData.clientServiceId ? `/vault?svc=${existsData.clientServiceId}` : "/vault"}
                      className="btn btn-secondary"
                      style={{ width: "100%", textAlign: "center" }}
                    >
                      Go to Vault →
                    </Link>
                  </div>
                ) : !profile ? (
                  <>
                    {refCode && (
                      <div className="pay-referral-note">
                        🎁 Referral code <strong>{refCode}</strong> — sign up to claim ₹500 off
                      </div>
                    )}
                    <Link
                      to={`/register?next=/services/${categorySlug}?svc=${selected.slug}${refSuffix}`}
                      className="btn btn-primary"
                      style={{ display: "block", textAlign: "center" }}
                    >
                      {isPaid ? `Get Started · ${formattedPrice}` : "Get Started — Free"}
                    </Link>
                  </>
                ) : isPaid ? (
                  <PaymentButton slug={selected.slug} serviceName={selected.name} formattedPrice={formattedPrice} />
                ) : (
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending}
                    className="btn btn-primary"
                    style={{ width: "100%" }}
                  >
                    {assignMutation.isPending ? "Adding..." : "+ Add Service — Free"}
                  </button>
                )}

                <a
                  href="mailto:info@thetaxpert.com"
                  className="btn btn-secondary"
                  style={{ display: "block", marginTop: "0.75rem", textAlign: "center" }}
                >
                  Talk to a Taxpert
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

// ── Root page — resolves slug to category or redirects ────────

export default function ServiceDetailPage() {
  const { slug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref");
  const selectedSvcSlug = searchParams.get("svc");

  const { data: dbCategories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["marketing-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/services");
      return res.data.data;
    }
  });

  const category = (dbCategories || staticCategories).find((c: any) => c.slug === slug);
  
  if (!category && !categoriesLoading) {
    // Check if the slug is actually a service slug directly
    const allServices = (dbCategories || staticCategories).flatMap((c: any) => c.items.map((i: any) => ({ ...i, categorySlug: c.slug })));
    const directService = allServices.find((s: any) => s.slug === slug);
    if (directService) {
      return <Navigate to={`/services/${directService.categorySlug}?svc=${slug}${refCode ? `&ref=${refCode}` : ""}`} replace />;
    }
    return (
      <>
        <Navbar isLoggedIn={false} />
        <div className="p-12 text-center">
          <h2>Service not found</h2>
          <Link to="/services">← Browse all services</Link>
        </div>
        <Footer />
      </>
    );
  }

  const selected = selectedSvcSlug ? category?.items.find((i: any) => i.slug === selectedSvcSlug) : category?.items[0];
  if (!selected && !categoriesLoading) return <Navigate to={`/services/${category?.slug}`} replace />;

  if (categoriesLoading || !category || !selected) {
    return (
      <>
        <Navbar isLoggedIn={false} />
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c49a3a]"></div></div>
        <Footer />
      </>
    );
  }

  return <CategoryDetailPage category={category} categorySlug={slug} />;
}
