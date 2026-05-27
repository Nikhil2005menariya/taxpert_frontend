/**
 * @deprecated Phase 7 — marketing pages now pull from DB via lib/actions/marketing.ts.
 * This file remains as a fallback while the week3-config-driven-services.sql +
 * week3c-phase7-marketing-content.sql migrations propagate.
 * Remove once DB data is confirmed complete.
 */

export type ServiceItem = {
  name: string;
  slug: string;
  summary: string;
  details: string;
  bestFor: string;
  price?: string;
};

export type ServiceCategory = {
  title: string;
  description: string;
  slug: string;
  items: ServiceItem[];
};

export const serviceCategories: ServiceCategory[] = [
  {
    title: "Incorporations",
    slug: "incorporations",
    description: "Set up the right legal structure with the right documentation from day one.",
    items: [
      { name: "Private Limited Company", slug: "private-limited-company", price: "₹6,999", summary: "A scalable company structure for founders planning growth, investors, or formal governance.", details: "Choose this when you want a recognized corporate structure with shareholder ownership, better fund-raising readiness, and clearer separation between business and personal obligations.", bestFor: "Startups, founder-led businesses, and growth-focused companies." },
      { name: "LLP", slug: "llp", price: "₹5,499", summary: "A simpler limited liability structure with partnership flexibility.", details: "Choose this when you want limited liability and a lighter compliance burden than a private limited company while still operating as a formal business entity.", bestFor: "Professional firms, consulting businesses, and closely held operating teams." },
      { name: "Partnership Firm", slug: "partnership-firm", price: "₹2,999", summary: "A straightforward setup for partners starting a business together.", details: "Choose this when you want a traditional partnership structure with simpler setup and shared operating ownership among partners.", bestFor: "Small businesses and early-stage partnerships." },
      { name: "Section 8 Company", slug: "section-8-company", price: "₹7,999", summary: "A structured non-profit entity for charitable or social impact work.", details: "Choose this when your organization is formed for charitable, educational, or social objectives and profits are not distributed to members.", bestFor: "NGOs, social initiatives, and non-profit institutions." },
    ],
  },
  {
    title: "Registrations",
    slug: "registrations",
    description: "Handle mandatory registrations, approvals, and supporting filings without confusion.",
    items: [
      { name: "GST Registration", slug: "gst-registration", price: "₹1,499", summary: "Register your business under GST and become filing-ready.", details: "Choose this when your turnover, business type, or client requirements make GST registration necessary or beneficial.", bestFor: "Businesses selling goods or services across taxable thresholds or to GST-registered clients." },
      { name: "Labour License", slug: "labour-license", price: "₹2,499", summary: "Support for labour-related licensing requirements.", details: "Choose this when your business activity, workforce size, or location requires labour registration or licence compliance.", bestFor: "Operational businesses, contractors, and employer-led organizations." },
      { name: "MSME Registration", slug: "msme-registration", price: "₹999", summary: "Register under Udyam to access MSME recognition and benefits.", details: "Choose this when you want formal MSME classification for benefits, vendor onboarding, or policy-linked advantages.", bestFor: "Small and medium businesses." },
      { name: "Trade License", slug: "trade-license", price: "₹1,999", summary: "Municipal trade licensing support for business operations.", details: "Choose this when your local authority requires a trade licence before starting or continuing operations.", bestFor: "Retail, food, service, and location-based businesses." },
      { name: "GST Litigations", slug: "gst-litigations", price: "₹2,999", summary: "Practical support for notices, disputes, and GST matters requiring representation prep.", details: "Choose this when you have received a GST notice, need help understanding exposure, or need structured documentation support.", bestFor: "Businesses facing GST scrutiny or disputes." },
      { name: "LUT Filings", slug: "lut-filings", price: "₹1,499", summary: "Apply or renew LUT for exports without paying IGST upfront.", details: "Choose this when your export workflow requires LUT compliance for smoother GST treatment.", bestFor: "Exporters and service providers with cross-border revenue." },
    ],
  },
  {
    title: "Accounting & Bookkeeping",
    slug: "accounting-bookkeeping",
    description: "Keep books current, accurate, and ready for filings and business review.",
    items: [
      { name: "Monthly Accounting", slug: "monthly-accounting", price: "₹2,999/mo", summary: "Ongoing bookkeeping support to keep records clean through the year.", details: "Choose this when you want transaction recording, categorization, and monthly readiness for compliance and reporting.", bestFor: "Small and medium businesses with recurring transactions." },
      { name: "Annual Finalization", slug: "annual-finalization", price: "₹4,999", summary: "Year-end cleanup and closeout for accounts and reporting.", details: "Choose this when you need annual books finalized for tax filing, compliance, lender needs, or internal review.", bestFor: "Businesses preparing for annual filings and financial closure." },
    ],
  },
  {
    title: "TDS Compliance",
    slug: "tds-compliance",
    description: "Stay on top of deduction, filing, and advisory requirements without last-minute pressure.",
    items: [
      { name: "TDS Returns Filing", slug: "tds-returns-filing", price: "₹1,499/qtr", summary: "Quarterly TDS return preparation and filing support.", details: "Choose this when your business deducts tax and needs regular, timely filing across quarters.", bestFor: "Employers, companies, and businesses making taxable payments." },
      { name: "TDS Advisory", slug: "tds-advisory", price: "₹999", summary: "Understand deduction requirements before errors turn into notices.", details: "Choose this when you need clarity on when to deduct, which section applies, or how to structure TDS workflows correctly.", bestFor: "Businesses with vendor payments, payroll, or contract payouts." },
    ],
  },
  {
    title: "GST Filings",
    slug: "gst-filings",
    description: "Routine returns plus advisory support in one structured workflow.",
    items: [
      { name: "Monthly/Quarterly Returns", slug: "gst-monthly-quarterly-returns", price: "₹1,999/mo", summary: "Recurring GST filing support with document readiness and filing tracking.", details: "Choose this when you need monthly or quarterly filing handled reliably with fewer back-and-forth requests.", bestFor: "GST-registered businesses with recurring compliance." },
      { name: "Annual Returns", slug: "gst-annual-returns", price: "₹3,999", summary: "Annual GST return support with reconciliation readiness.", details: "Choose this when your annual GST compliance requires cleanup, review, and structured filing support.", bestFor: "Businesses closing out yearly GST obligations." },
      { name: "GST Advisory", slug: "gst-advisory", price: "₹1,499", summary: "Practical GST guidance for decisions, transactions, and recurring issues.", details: "Choose this when you need help beyond filing, including tax treatment, process clarity, or issue resolution.", bestFor: "Businesses with evolving GST questions and process decisions." },
    ],
  },
  {
    title: "Income Tax Filings",
    slug: "income-tax-filings",
    description: "Tax filing support for individuals and business entities in one platform.",
    items: [
      { name: "Individuals", slug: "income-tax-individuals", price: "₹999", summary: "Structured filing for salaried individuals, freelancers, and professionals.", details: "Choose this when you need personal income tax filing with document collection, expert review, and vault storage.", bestFor: "Salaried professionals, freelancers, and self-employed individuals." },
      { name: "Companies", slug: "income-tax-companies", price: "₹4,999", summary: "Corporate income tax filing with compliance-focused preparation.", details: "Choose this when your company needs annual income tax filing with a cleaner workflow and expert oversight.", bestFor: "Private limited companies and other corporate entities." },
      { name: "LLPs", slug: "income-tax-llps", price: "₹3,999", summary: "Income tax filing support for LLP entities.", details: "Choose this when your LLP needs entity-level tax filing with organized document support.", bestFor: "Operational LLPs and professional LLPs." },
      { name: "Partnership Firms", slug: "income-tax-partnership-firms", price: "₹2,999", summary: "Income tax filing for registered or operational partnership firms.", details: "Choose this when your firm needs filing support with records organized and reviewed properly.", bestFor: "Traditional partnerships and closely held firms." },
    ],
  },
  {
    title: "ROC Compliance for Companies",
    slug: "roc-compliance-companies",
    description: "Stay ahead of annual company compliance deadlines and MCA obligations.",
    items: [
      { name: "AOC-4", slug: "aoc-4", price: "₹2,999", summary: "Annual filing support for financial statement submission.", details: "Choose this when your company needs to file financial statements with MCA as part of annual compliance.", bestFor: "Companies completing year-end ROC obligations." },
      { name: "MGT-7 / MGT-7A", slug: "mgt-7-mgt-7a", price: "₹2,499", summary: "Annual return filing support for companies and applicable small companies.", details: "Choose this when your annual return filing needs the right form, the right disclosures, and timely submission.", bestFor: "Companies with annual ROC filing requirements." },
      { name: "DIR-3 KYC", slug: "dir-3-kyc", price: "₹999", summary: "Director KYC compliance for active DIN holders.", details: "Choose this when directors need yearly KYC filing to keep DIN status compliant.", bestFor: "Directors and companies managing director compliance." },
      { name: "DPT-3", slug: "dpt-3", price: "₹1,999", summary: "Deposit-related filing support where applicable.", details: "Choose this when your company needs DPT-3 filing based on outstanding receipts or regulatory applicability.", bestFor: "Companies with relevant deposit reporting obligations." },
    ],
  },
  {
    title: "ROC Compliance for LLPs",
    slug: "roc-compliance-llps",
    description: "Simple LLP compliance support without deadline panic.",
    items: [
      { name: "Form 8", slug: "llp-form-8", price: "₹1,999", summary: "Statement of account and solvency filing support for LLPs.", details: "Choose this when your LLP needs annual compliance support for financial and solvency reporting.", bestFor: "LLPs managing yearly ROC obligations." },
      { name: "Form 11", slug: "llp-form-11", price: "₹1,499", summary: "Annual return filing support for LLPs.", details: "Choose this when your LLP needs annual return filing completed accurately and on time.", bestFor: "LLPs with active ROC compliance requirements." },
    ],
  },
  {
    title: "Other Services",
    slug: "other-services",
    description: "Operational and compliance support beyond the main filing categories.",
    items: [
      { name: "DSC Services", slug: "dsc-services", price: "₹1,499", summary: "Support for digital signature issuance and related needs.", details: "Choose this when your filing or MCA workflow requires DSC setup, renewal, or guidance.", bestFor: "Directors, businesses, and authorized signatories." },
      { name: "Payroll Processing", slug: "payroll-processing", price: "₹1,999/mo", summary: "Structured payroll support for recurring monthly operations.", details: "Choose this when you want salary processing and payroll records managed consistently.", bestFor: "Businesses with employee payroll cycles." },
      { name: "PF, ESI, PT Compliance", slug: "pf-esi-pt-compliance", price: "₹1,499/mo", summary: "Recurring labour and payroll-linked compliance support.", details: "Choose this when your employee base requires statutory payroll compliance management.", bestFor: "Employers managing workforce-related obligations." },
      { name: "Director Changes", slug: "director-changes", price: "₹2,499", summary: "Support for director appointment, resignation, or update filings.", details: "Choose this when company leadership changes require proper documentation and ROC filing.", bestFor: "Companies updating board composition." },
      { name: "Registered Office Change", slug: "registered-office-change", price: "₹2,999", summary: "Handle registered office updates with proper filing support.", details: "Choose this when your business changes official address and needs compliant document handling.", bestFor: "Companies and LLPs updating registered location details." },
      { name: "Share Transfers", slug: "share-transfers", price: "₹3,499", summary: "Support for ownership transfer documentation and process steps.", details: "Choose this when shareholding changes need clean documentation and regulatory support.", bestFor: "Private companies with shareholder changes." },
      { name: "MCA Email Update", slug: "mca-email-update", price: "₹999", summary: "Correct or update MCA-linked communication details.", details: "Choose this when email details tied to MCA records need updating for compliance continuity.", bestFor: "Companies and LLPs maintaining accurate MCA records." },
    ],
  },
];

export function getAllServices() {
  return serviceCategories.flatMap((category) =>
    category.items.map((item) => ({
      ...item,
      categoryTitle: category.title,
      categorySlug: category.slug,
    })),
  );
}

export function getServiceBySlug(slug: string) {
  return getAllServices().find((service) => service.slug === slug) ?? null;
}
