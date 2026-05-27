export type BlogSection =
  | { type: "h2"; content: string }
  | { type: "h3"; content: string }
  | { type: "p"; content: string }
  | { type: "ul"; content: string[] }
  | { type: "callout"; content: string }
  | { type: "table"; headers: string[]; rows: string[][] };

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  readTime: string;
  category: string;
  author: string;
  sections: BlogSection[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "gst-filing-deadlines-2026",
    title: "GST Filing Deadlines 2026 — Complete Calendar",
    description:
      "A complete month-by-month calendar of all GST return due dates for FY 2025-26, including GSTR-1, GSTR-3B, GSTR-9, and penalty guidelines.",
    publishedAt: "2026-01-15",
    readTime: "6 min read",
    category: "GST",
    author: "TheTaxpert Team",
    sections: [
      {
        type: "p",
        content:
          "Missing a GST filing deadline is one of the most common compliance mistakes Indian businesses make — and it comes with automatic late fees and interest. For FY 2025-26, this calendar gives you every key due date so you can plan ahead and file on time.",
      },
      {
        type: "h2",
        content: "Monthly GST Return Deadlines",
      },
      {
        type: "p",
        content:
          "Two returns are mandatory for most regular GST-registered businesses every month: GSTR-1 (outward supplies) and GSTR-3B (summary return with tax payment).",
      },
      {
        type: "table",
        headers: ["Return", "Period", "Due Date", "Who Files"],
        rows: [
          ["GSTR-1", "Monthly (turnover > ₹5 Cr)", "11th of next month", "Regular taxpayers"],
          ["GSTR-1 (QRMP)", "Quarterly", "13th of month after quarter", "Turnover up to ₹5 Cr"],
          ["GSTR-3B", "Monthly", "20th of next month", "All regular taxpayers"],
          ["GSTR-3B (QRMP)", "Quarterly", "22nd / 24th (state-wise)", "Turnover up to ₹5 Cr"],
        ],
      },
      {
        type: "h2",
        content: "Annual GST Return — GSTR-9",
      },
      {
        type: "p",
        content:
          "GSTR-9 is the annual return consolidating all monthly/quarterly filings for the financial year. It is mandatory for businesses with annual turnover above ₹2 crore.",
      },
      {
        type: "ul",
        content: [
          "GSTR-9 (Annual Return): Due 31 December 2026 for FY 2025-26",
          "GSTR-9C (Reconciliation Statement): Due 31 December 2026 for turnover above ₹5 Cr",
          "GSTR-4 (Composition Scheme): Due 30 April 2026 for FY 2025-26",
        ],
      },
      {
        type: "h2",
        content: "Penalties for Late GST Filing",
      },
      {
        type: "ul",
        content: [
          "Late fee for GSTR-3B: ₹50/day (₹25 CGST + ₹25 SGST), capped at ₹10,000 per return",
          "Nil return late fee: ₹20/day (₹10 CGST + ₹10 SGST), capped at ₹500",
          "Interest on unpaid tax: 18% per annum from due date",
          "GSTR-1 late fee: ₹50/day, capped at ₹10,000",
        ],
      },
      {
        type: "callout",
        content:
          "TheTaxpert handles all your monthly and annual GST filings with reminders, document collection, and expert review — so you never miss a deadline.",
      },
      {
        type: "h2",
        content: "Key Dates at a Glance — FY 2025-26",
      },
      {
        type: "ul",
        content: [
          "April 2026: GSTR-3B for March due 20 April",
          "May 2026: TDS Q4 return (Jan–Mar) due 31 May",
          "July 2026: ITR filing for individuals due 31 July",
          "September 2026: DIR-3 KYC for company directors due 30 September",
          "October 2026: ITR for companies (audit required) due 31 October",
          "December 2026: GSTR-9 Annual Return due 31 December",
        ],
      },
      {
        type: "p",
        content:
          "Filing on time not only avoids penalties — it keeps your GST registration active, your input tax credit intact, and your business in good standing with the GST authorities.",
      },
    ],
  },
  {
    slug: "itr-filing-salaried-employees-documents",
    title: "ITR Filing for Salaried Employees — Documents You Need",
    description:
      "A clear checklist of every document a salaried employee needs to file their Income Tax Return in India, with tips to avoid common mistakes.",
    publishedAt: "2026-02-10",
    readTime: "5 min read",
    category: "Income Tax",
    author: "TheTaxpert Team",
    sections: [
      {
        type: "p",
        content:
          "Filing your Income Tax Return (ITR) as a salaried individual in India is straightforward when you have the right documents ready. The ITR-1 form (Sahaj) applies to most salaried employees with income from salary, one house property, and other sources (excluding business income).",
      },
      {
        type: "h2",
        content: "Core Documents Every Salaried Person Needs",
      },
      {
        type: "ul",
        content: [
          "Form 16 from your employer (Part A + Part B)",
          "PAN Card",
          "Aadhaar Card (linked to PAN)",
          "Bank account details for refund credit",
          "Form 26AS and Annual Information Statement (AIS) from the Income Tax portal",
        ],
      },
      {
        type: "h2",
        content: "Understanding Form 16",
      },
      {
        type: "p",
        content:
          "Form 16 is the most important document for a salaried employee's ITR filing. It is issued by your employer and contains two parts.",
      },
      {
        type: "ul",
        content: [
          "Part A: TDS deducted and deposited on your behalf, quarter by quarter",
          "Part B: Detailed salary breakup — basic, HRA, allowances, perquisites, deductions under Chapter VIA (80C, 80D, etc.)",
        ],
      },
      {
        type: "callout",
        content:
          "TheTaxpert's Smart Form 16 Extraction pulls salary, TDS, and employer data from your Form 16 automatically — no manual entry needed.",
      },
      {
        type: "h2",
        content: "Documents for Claiming Deductions",
      },
      {
        type: "h3",
        content: "Section 80C (up to ₹1.5 lakh)",
      },
      {
        type: "ul",
        content: [
          "LIC premium receipts",
          "PPF passbook / statements",
          "ELSS mutual fund statements",
          "Home loan principal repayment certificate",
          "Children's tuition fee receipts",
          "NSC / tax-saving FD receipts",
        ],
      },
      {
        type: "h3",
        content: "Section 80D — Health Insurance",
      },
      {
        type: "ul",
        content: [
          "Health insurance premium receipt (for self, spouse, children)",
          "Premium receipt for parents' health insurance (additional ₹25,000–₹50,000)",
        ],
      },
      {
        type: "h3",
        content: "Home Loan Deductions (Section 24 & 80EEA)",
      },
      {
        type: "ul",
        content: [
          "Home loan interest certificate from your bank",
          "Home loan principal repayment statement",
          "Sale deed / possession letter (for first-time buyers)",
        ],
      },
      {
        type: "h2",
        content: "Common Mistakes to Avoid",
      },
      {
        type: "ul",
        content: [
          "Not checking Form 26AS before filing — mismatches can cause notices",
          "Forgetting income from multiple employers (if you switched jobs)",
          "Missing interest income from savings accounts (taxable above ₹10,000)",
          "Not reporting income from freelance work or digital platforms",
          "Filing under the wrong ITR form",
        ],
      },
      {
        type: "h2",
        content: "Due Date for Salaried ITR",
      },
      {
        type: "p",
        content:
          "For FY 2025-26 (AY 2026-27), the due date for ITR filing for salaried individuals is 31 July 2026. Filing after this date attracts a late fee of up to ₹5,000 and forfeiture of certain carry-forward losses.",
      },
    ],
  },
  {
    slug: "why-every-startup-needs-compliance-calendar",
    title: "Why Every Startup Needs a Compliance Calendar",
    description:
      "Startups in India face a dense web of tax and regulatory deadlines from day one. Here's why a compliance calendar is the most important document your startup can have.",
    publishedAt: "2026-03-05",
    readTime: "7 min read",
    category: "Startup",
    author: "TheTaxpert Team",
    sections: [
      {
        type: "p",
        content:
          "When founders are focused on product, customers, and fundraising, compliance tends to be the last thing on the list — until a penalty notice arrives. In India, a newly registered company or LLP has compliance obligations from its very first month of existence, regardless of whether it has started operations or generated any revenue.",
      },
      {
        type: "h2",
        content: "What Happens When Startups Miss Compliance Deadlines",
      },
      {
        type: "ul",
        content: [
          "Late ROC filings attract penalties of ₹100/day per form — with no upper cap in some cases",
          "Non-filing of GST returns can lead to cancellation of GST registration",
          "Missed TDS deposits attract 1.5% interest per month",
          "Directors can become personally liable for company defaults in certain cases",
          "Late ITR filing blocks carry-forward of business losses — critical for early-stage companies",
        ],
      },
      {
        type: "callout",
        content:
          "Most startup compliance failures are not due to ignorance — they happen because no one is tracking deadlines. A compliance calendar fixes this.",
      },
      {
        type: "h2",
        content: "Key Compliance Milestones for a New Private Limited Company",
      },
      {
        type: "h3",
        content: "Within 30 Days of Incorporation",
      },
      {
        type: "ul",
        content: [
          "File INC-20A (Declaration of Commencement of Business) — mandatory",
          "Open a current bank account",
          "Obtain a Digital Signature Certificate (DSC) for all directors",
          "Register for GST if turnover exceeds threshold or you're doing interstate supply",
        ],
      },
      {
        type: "h3",
        content: "Ongoing Monthly Compliance",
      },
      {
        type: "ul",
        content: [
          "GST returns (GSTR-1 + GSTR-3B) — 11th and 20th of every month",
          "TDS payment to government — 7th of next month",
          "Payroll processing and PF/ESI deposits (if employees > threshold)",
          "Monthly bookkeeping and reconciliation",
        ],
      },
      {
        type: "h3",
        content: "Annual Compliance (Private Limited Company)",
      },
      {
        type: "ul",
        content: [
          "Annual General Meeting (AGM): within 6 months of financial year end",
          "AOC-4 (Financial Statements): within 30 days of AGM",
          "MGT-7/7A (Annual Return): within 60 days of AGM",
          "DIR-3 KYC for all directors: 30 September every year",
          "Income Tax Return: 31 October (for companies requiring audit)",
          "GSTR-9 Annual Return: 31 December",
        ],
      },
      {
        type: "h2",
        content: "The Compliance Calendar Every Startup Should Maintain",
      },
      {
        type: "p",
        content:
          "A compliance calendar is simply a shared document (or platform) that lists every regulatory obligation, its due date, responsible person, and status. It should be reviewed at the start of every month and updated when regulations change.",
      },
      {
        type: "p",
        content:
          "The best-run startups we work with treat compliance like a product sprint — it has owners, deadlines, and review cycles. The ones that struggle treat it as a once-a-year fire drill.",
      },
      {
        type: "h2",
        content: "How TheTaxpert Helps",
      },
      {
        type: "p",
        content:
          "TheTaxpert brings all startup compliance into one structured platform. From incorporation through annual filings, your assigned Tax Expert tracks every deadline, collects documents proactively, and files on time — so founders can focus on building the business.",
      },
      {
        type: "ul",
        content: [
          "Single platform for all tax, ROC, and GST compliance",
          "Deadline reminders and real-time status tracking",
          "Lifetime document vault for all filings",
          "Dedicated Tax Expert assigned to your company",
        ],
      },
    ],
  },
];

export function getBlogPostBySlug(slug: string): BlogPost | null {
  return blogPosts.find((p) => p.slug === slug) ?? null;
}
