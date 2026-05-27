"use client";

import { useState } from "react";

const faqs = [
  {
    q: "How long does ITR filing take on TheTaxpert?",
    a: "For salaried individuals, most ITR filings are completed within 2–3 business days once all required documents are uploaded. Complex cases involving business income, capital gains, or foreign assets may take 4–7 business days. You can track the status in real-time from your dashboard.",
  },
  {
    q: "What documents do I need to get started with GST filing?",
    a: "For GST return filing, you will need your GSTIN, purchase and sales invoices for the period, bank statements, and any credit notes or debit notes issued. Our team will send you a detailed document checklist after you sign up.",
  },
  {
    q: "Is my financial data safe on the platform?",
    a: "Yes. Your data is encrypted in transit (TLS) and at rest. We use row-level security so each user only sees their own data. Documents are stored in a private vault — only you and your assigned Taxpert team member can access them. We never sell or share your data.",
  },
  {
    q: "What is the difference between GSTR-1 and GSTR-3B?",
    a: "GSTR-1 is a statement of your outward supplies (sales invoices) filed by the 11th of each month. GSTR-3B is a summary return where you declare your GST liability, claim input tax credit, and pay the net tax due — filed by the 20th. Both are mandatory for most GST-registered businesses.",
  },
  {
    q: "When are TDS returns due?",
    a: "TDS returns are filed quarterly: Q1 (Apr–Jun) by 31 Jul; Q2 (Jul–Sep) by 31 Oct; Q3 (Oct–Dec) by 31 Jan; and Q4 (Jan–Mar) by 31 May. Monthly TDS payments to the government are due by the 7th of the following month.",
  },
  {
    q: "Can TheTaxpert handle compliance for my startup from the beginning?",
    a: "Yes — we cover the full compliance lifecycle from Day 1. This includes INC-20A filing, GST registration, monthly accounting, TDS returns, and annual ROC filings (AOC-4, MGT-7). Many of our clients are early-stage founders.",
  },
  {
    q: "What is your pricing model?",
    a: "We charge per service, not a retainer. Each service has a starting price on our Services page. Final pricing depends on complexity. There are no hidden charges — any government fees are communicated separately before you pay.",
  },
  {
    q: "What if I receive a notice from the Income Tax or GST authority?",
    a: "Our Taxpert team can help you understand the notice, prepare the response, and guide you through the next steps. Notice handling is a separate engagement — reach out via the contact page or WhatsApp and we'll assess your case.",
  },
];

export default function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="section section-alt" id="faq">
      <div className="container">
        <div className="faq-layout">
          <div className="faq-header">
            <span className="section-kicker">FAQ</span>
            <h2 className="faq-title">Frequently Asked Questions</h2>
            <p className="faq-sub">
              Quick answers about tax filing, GST, compliance timelines,
              and how TheTaxpert works.
            </p>
          </div>

          <div className="faq-list">
            {faqs.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div key={i} className={`faq-item${isOpen ? " faq-open" : ""}`}>
                  <button
                    className="faq-trigger"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                  >
                    <span className="faq-q-text">{faq.q}</span>
                    <span className={`faq-chevron${isOpen ? " open" : ""}`} aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  {isOpen && (
                    <div className="faq-body">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
