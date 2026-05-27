import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { serviceCategories } from "../../data/site-content";
import { apiClient } from "../../api/client";

export default function AddServiceModal() {
  const [open, setOpen] = useState(false);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "error" | "exists"; text: string; svcId?: string } | null>(null);
  const navigate = useNavigate();

  const category = categorySlug
    ? serviceCategories.find(c => c.slug === categorySlug) ?? null
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
        navigate(`/vault?fy=${fy ?? ""}&svc=${result.data.id}`);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to add service. Please try again." });
    } finally {
      setAddingSlug(null);
    }
  }

  return (
    <>
      <button className="btn btn-primary add-svc-btn" onClick={handleOpen}>
        + Add Service
      </button>

      {open && (
        <div className="add-svc-overlay" onClick={() => setOpen(false)}>
          <div className="add-svc-modal" onClick={e => e.stopPropagation()}>
            <div className="add-svc-modal-header">
              <div>
                {category ? (
                  <button className="add-svc-back" onClick={() => { setCategorySlug(null); setMessage(null); }}>
                    ← Back
                  </button>
                ) : (
                  <span className="add-svc-modal-title">Add a Service</span>
                )}
                {category && (
                  <span className="add-svc-modal-title">{category.title}</span>
                )}
              </div>
              <button className="add-svc-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="add-svc-modal-body">
              {message && (
                <div className={`add-svc-msg add-svc-msg-${message.type}`}>
                  {message.text}
                  {message.type === "exists" && message.svcId && (
                    <button
                      className="add-svc-msg-link"
                      onClick={() => { setOpen(false); navigate(`/vault?svc=${message.svcId}`); }}
                    >
                      Go to Vault →
                    </button>
                  )}
                </div>
              )}

              {!category ? (
                // Category picker
                <div className="add-svc-cat-list">
                  {serviceCategories.map(cat => (
                    <button
                      key={cat.slug}
                      className="add-svc-cat-item"
                      onClick={() => { setCategorySlug(cat.slug); setMessage(null); }}
                    >
                      <span className="add-svc-cat-name">{cat.title}</span>
                      <span className="add-svc-cat-count">{cat.items.length}</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 18 6-6-6-6"/>
                      </svg>
                    </button>
                  ))}
                </div>
              ) : (
                // Service picker within category
                <div className="add-svc-svc-list">
                  {category.items.map(svc => (
                    <div key={svc.slug} className="add-svc-svc-item">
                      <div className="add-svc-svc-info">
                        <span className="add-svc-svc-name">{svc.name}</span>
                        <span className="add-svc-svc-summary">{svc.summary}</span>
                      </div>
                      <div className="add-svc-svc-right">
                        <button
                          className="btn btn-primary add-svc-add-btn"
                          onClick={() => handleAdd(svc.slug)}
                          disabled={addingSlug !== null}
                        >
                          {addingSlug === svc.slug ? "Adding…" : "+ Add"}
                        </button>
                      </div>
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
