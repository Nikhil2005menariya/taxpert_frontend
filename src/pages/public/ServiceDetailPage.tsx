import { useRef, useState } from "react";
import { Link, useParams, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { apiClient } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import { serviceCategories as staticCategories } from "../../shared/site-content";
import { CategoryIcon } from "../../shared/category-icons";
import { useScrollReveal } from "../../hooks/useScrollReveal";
import { formatRupees } from "../../shared/finance-utils";
import Navbar from "../../components/marketing/Navbar";
import Footer from "../../components/marketing/Footer";

// ── Inline premium icons ──────────────────────────────────────

const Chevron = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);

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
            setTimeout(() => navigate(`/client/services/${clientServiceId}`), 2000);
          } catch (err: any) {
            setState("error");
            setError(err.response?.data?.error ?? "Payment verification failed.");
          }
        },
        modal: { ondismiss() { setState("idle"); } },
        theme: { color: "#e85220" },
      });
      rzp.open();
    } catch (err: any) {
      setState("error");
      setError(err.response?.data?.error ?? "Failed to initiate payment");
    }
  }

  if (state === "success") {
    return <div className="lp-sd-paysuccess">Payment successful — redirecting…</div>;
  }

  return (
    <>
      {error && <div className="lp-sd-payerr">{error}</div>}
      <button onClick={handlePayment} disabled={state !== "idle"} className="lp-btn lp-btn--accent">
        {state === "idle" ? `Pay now · ${formattedPrice}` : "Processing…"}
      </button>
      <p className="lp-sd-paynote">Secure payment via Razorpay</p>
    </>
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
  const shellRef = useRef<HTMLElement>(null);
  useScrollReveal(shellRef);

  const selected: MarketingServiceItem | undefined =
    (selectedSvcSlug ? category.items.find((i) => i.slug === selectedSvcSlug) : undefined)
    ?? category.items[0];

  if (!selected) return <div className="lp-sd-state">Service not found</div>;

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
    onSuccess: (data) => navigate(`/client/vault?svc=${data.id}`),
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

      <main className="lp" ref={shellRef}>
        <Navbar isLoggedIn={!!profile} />

        {/* Breadcrumb */}
        <div className="lp-container lp-sd-top">
          <nav className="lp-sd-crumbs">
            <Link to="/">Home</Link>
            <Chevron />
            <Link to="/services">Services</Link>
            <Chevron />
            <span>{category.title}</span>
          </nav>
        </div>

        {/* Sub-service tabs */}
        <div className="lp-sd-tabs-wrap">
          <div className="lp-container">
            <div className="lp-sd-tabs">
              {category.items.map((item) => (
                <Link
                  key={item.slug}
                  to={`/services/${categorySlug}?svc=${item.slug}${refSuffix}`}
                  className={`lp-sd-tab${item.slug === selected.slug ? " is-active" : ""}`}
                >
                  {item.name}
                  {item.price && <span className="lp-sd-tab-price">{item.price}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Detail + sticky action */}
        <section className="lp-section lp-sd-hero">
          <div className="lp-container lp-sd-layout">
            <div className="lp-sd-main">
              <span className="lp-eyebrow" data-reveal>{category.title}</span>
              <h1 className="lp-sd-title" data-reveal>{selected.name}</h1>
              <p className="lp-sd-lead" data-reveal>{selected.summary}</p>

              {selected.details && (
                <div className="lp-sd-block" data-reveal>
                  <h2 className="lp-sd-h2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                    What this service covers
                  </h2>
                  <p>{selected.details}</p>
                </div>
              )}

              {selected.bestFor && (
                <div className="lp-sd-callout" data-reveal>
                  <span className="lp-sd-callout-ico">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="0.6" fill="currentColor" /></svg>
                  </span>
                  <div>
                    <span className="lp-sd-callout-label">Best suited for</span>
                    <p>{selected.bestFor}</p>
                  </div>
                </div>
              )}

              {docsData && docsData.length > 0 && (
                <div className="lp-sd-block">
                  <h2 className="lp-sd-h2">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                    Documents you’ll need
                  </h2>
                  <ul className="lp-sd-docs">
                    {docsData.map((t) => (
                      <li className="lp-sd-doc" key={t.id}>
                        <span className={`lp-sd-doc-ico${t.required ? " is-req" : ""}`}>
                          <CheckIcon />
                        </span>
                        <span className="lp-sd-doc-body">
                          <span className="lp-sd-doc-name">
                            {t.name}
                            {t.required && <em>Required</em>}
                          </span>
                          {t.description && <span className="lp-sd-doc-hint">{t.description}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Action rail */}
            <aside className="lp-sd-aside">
              <div className="lp-sd-action" data-reveal>
                <div className="lp-sd-action-cat">
                  <CategoryIcon slug={categorySlug} />
                  {category.title}
                </div>

                <div className="lp-sd-price">
                  <span className="lp-sd-price-amt">{priceLoading ? "…" : formattedPrice}</span>
                  {isPaid && <span className="lp-sd-price-note">one-time · incl. all taxes</span>}
                </div>

                {existsData?.exists ? (
                  <div className="lp-sd-added">
                    <span className="lp-sd-added-badge"><CheckIcon /> Already added to your account</span>
                    <Link
                      to={existsData.clientServiceId ? `/client/vault?svc=${existsData.clientServiceId}` : "/client/vault"}
                      className="lp-btn lp-btn--primary"
                    >
                      Go to vault
                    </Link>
                  </div>
                ) : !profile ? (
                  <>
                    {refCode && (
                      <div className="lp-sd-ref">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" /></svg>
                        <span>Referral code <strong>{refCode}</strong> — sign up to claim ₹500 off.</span>
                      </div>
                    )}
                    <Link
                      to={`/register?next=/services/${categorySlug}?svc=${selected.slug}${refSuffix}`}
                      className="lp-btn lp-btn--accent"
                    >
                      {isPaid ? `Get started · ${formattedPrice}` : "Get started — free"}
                    </Link>
                  </>
                ) : isPaid ? (
                  <PaymentButton slug={selected.slug} serviceName={selected.name} formattedPrice={formattedPrice} />
                ) : (
                  <button
                    onClick={() => assignMutation.mutate()}
                    disabled={assignMutation.isPending}
                    className="lp-btn lp-btn--accent"
                  >
                    {assignMutation.isPending ? "Adding…" : "Add service — free"}
                  </button>
                )}

                <a href="mailto:info@thetaxpert.com" className="lp-sd-talk">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                  Talk to a Taxpert
                </a>

                <ul className="lp-sd-trust">
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                    Secure payment via Razorpay
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                    Reviewed &amp; filed by qualified experts
                  </li>
                  <li>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
                    Documents stored in your vault
                  </li>
                </ul>
              </div>
            </aside>
          </div>
        </section>

        <Footer />
      </main>
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
    },
  });

  const category = (dbCategories || staticCategories).find((c: any) => c.slug === slug);

  if (!category && !categoriesLoading) {
    // Slug might be a service slug directly — redirect into its category.
    const allServices = (dbCategories || staticCategories).flatMap((c: any) =>
      c.items.map((i: any) => ({ ...i, categorySlug: c.slug })),
    );
    const directService = allServices.find((s: any) => s.slug === slug);
    if (directService) {
      return <Navigate to={`/services/${directService.categorySlug}?svc=${slug}${refCode ? `&ref=${refCode}` : ""}`} replace />;
    }
    return (
      <main className="lp">
        <Navbar isLoggedIn={false} />
        <div className="lp-sd-state">
          <div>
            <h2 className="lp-sd-title" style={{ fontSize: "28px" }}>Service not found</h2>
            <Link to="/services" className="lp-btn lp-btn--ghost" style={{ marginTop: "20px" }}>Browse all services</Link>
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const selected = selectedSvcSlug ? category?.items.find((i: any) => i.slug === selectedSvcSlug) : category?.items[0];
  if (!selected && !categoriesLoading) return <Navigate to={`/services/${category?.slug}`} replace />;

  if (categoriesLoading || !category || !selected) {
    return (
      <main className="lp">
        <Navbar isLoggedIn={false} />
        <div className="lp-sd-state"><div className="lp-sd-spinner" /></div>
        <Footer />
      </main>
    );
  }

  return <CategoryDetailPage category={category} categorySlug={slug} />;
}
