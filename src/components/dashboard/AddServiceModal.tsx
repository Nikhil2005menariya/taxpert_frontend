import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { serviceCategories } from "../../data/site-content";
import { apiClient } from "../../api/client";
import { CategoryIcon } from "../../shared/category-icons";

type Cat = (typeof serviceCategories)[number];

export default function AddServiceModal() {
  const [open, setOpen] = useState(false);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "exists"; text: string; svcId?: string } | null>(null);
  const navigate = useNavigate();

  // Live catalogue from the DB — reflects admin add/edit/activate in ServiceEditPage.
  // Only active services/categories come back. Static list is a loading fallback.
  const { data: liveCategories } = useQuery({
    queryKey: ["marketing-categories"],
    queryFn: async () => {
      const res = await apiClient.get("/services");
      return res.data.data as Cat[];
    },
  });

  const categories: Cat[] = liveCategories?.length ? liveCategories : serviceCategories;

  const category = categorySlug
    ? categories.find(c => c.slug === categorySlug) ?? null
    : null;

  function handleOpen() {
    setCategorySlug(null);
    setMessage(null);
    setOpen(true);
  }

  async function handleAdd(slug: string) {
    if (addingSlug) return;
    setMessage(null);
    setAddingSlug(slug);
    try {
      const response = await apiClient.post('/services/assign', { slug });
      const result = response.data;
      
      if (result.alreadyExists && result.data) {
        setMessage({ type: "exists", text: "You already have this service.", svcId: result.data.id });
        return;
      }
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      if (result.data) {
        setOpen(false);
        const fy = (result.data as Record<string, unknown>).fiscal_year as string | null;
        navigate(`/client/vault?fy=${fy ?? ""}&svc=${result.data.id}`);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to add service. Please try again." });
    } finally {
      setAddingSlug(null);
    }
  }

  return (
    <>
      <button className="addsvc-btn" onClick={handleOpen} aria-label="Add a service">
        <span className="addsvc-main">
          <span className="addsvc-ico">
            <span className="addsvc-blur" />
            <span className="addsvc-plus">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </span>
          </span>
          Add Service
        </span>
      </button>

      {open && (
        <div className="asv-overlay" onClick={() => setOpen(false)}>
          <div className="asv-modal" onClick={e => e.stopPropagation()}>
            <div className="asv-head">
              <div className="asv-head-left">
                {category && (
                  <button className="asv-back" onClick={() => { setCategorySlug(null); setMessage(null); }} aria-label="Back to categories">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                  </button>
                )}
                <div className="asv-head-text">
                  <span className="asv-eyebrow">{category ? "Choose a service" : "Service catalogue"}</span>
                  <span className="asv-title">{category ? category.title : "Add a service"}</span>
                </div>
              </div>
              <button className="asv-close" onClick={() => setOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <div className="asv-body">
              {message && (
                <div className={`asv-msg asv-msg--${message.type}`}>
                  <span>{message.text}</span>
                  {message.type === "exists" && message.svcId && (
                    <button
                      className="asv-msg-link"
                      onClick={() => { setOpen(false); navigate(`/client/vault?svc=${message.svcId}`); }}
                    >
                      Go to Vault
                    </button>
                  )}
                </div>
              )}

              {!category ? (
                <div className="asv-cats">
                  {categories.map(cat => (
                    <button
                      key={cat.slug}
                      className="asv-cat"
                      onClick={() => { setCategorySlug(cat.slug); setMessage(null); }}
                    >
                      <span className="asv-cat-ico"><CategoryIcon slug={cat.slug} /></span>
                      <span className="asv-cat-body">
                        <span className="asv-cat-name">{cat.title}</span>
                        <span className="asv-cat-count">{cat.items.length} service{cat.items.length !== 1 ? "s" : ""}</span>
                      </span>
                      <span className="asv-cat-arrow">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="asv-svcs">
                  {category.items.map(svc => (
                    <div key={svc.slug} className="asv-svc">
                      <div className="asv-svc-body">
                        <div className="asv-svc-top">
                          <span className="asv-svc-name">{svc.name}</span>
                          {(svc as any).price && <span className="asv-svc-price">{(svc as any).price}</span>}
                        </div>
                        <span className="asv-svc-summary">{svc.summary}</span>
                      </div>
                      <button
                        className="asv-add"
                        onClick={() => handleAdd(svc.slug)}
                        disabled={addingSlug !== null}
                        aria-label={`Add ${svc.name}`}
                      >
                        {addingSlug === svc.slug ? (
                          <span className="asv-spin" />
                        ) : (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
