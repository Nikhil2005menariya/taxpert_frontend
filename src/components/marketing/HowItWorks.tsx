// How It Works — static UI mockup previews instead of emoji icons

function MockUploadScreen() {
  return (
    <svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg" className="hiw-mockup">
      {/* Window chrome */}
      <rect width="280" height="180" rx="8" fill="#f8f6f1" stroke="#e2ddd5" strokeWidth="1"/>
      <rect width="280" height="28" rx="8" fill="#1a2035"/>
      <rect y="20" width="280" height="8" fill="#1a2035"/>
      <circle cx="14" cy="14" r="4" fill="#ef4444" opacity="0.7"/>
      <circle cx="26" cy="14" r="4" fill="#f59e0b" opacity="0.7"/>
      <circle cx="38" cy="14" r="4" fill="#22c55e" opacity="0.7"/>
      <text x="110" y="17" fontSize="7" fill="#c9a85c" fontFamily="sans-serif">Vault — Income Tax Return</text>
      {/* Sidebar */}
      <rect x="0" y="28" width="60" height="152" fill="#0f1624"/>
      <rect x="8" y="40" width="44" height="6" rx="3" fill="#c9a85c" opacity="0.9"/>
      <rect x="8" y="54" width="36" height="5" rx="2.5" fill="#ffffff" opacity="0.25"/>
      <rect x="8" y="66" width="40" height="5" rx="2.5" fill="#ffffff" opacity="0.15"/>
      <rect x="8" y="78" width="32" height="5" rx="2.5" fill="#ffffff" opacity="0.15"/>
      <rect x="8" y="90" width="38" height="5" rx="2.5" fill="#ffffff" opacity="0.15"/>
      {/* Main area */}
      <rect x="68" y="36" width="140" height="8" rx="3" fill="#1a2035" opacity="0.8"/>
      <rect x="68" y="50" width="80" height="5" rx="2.5" fill="#c9a85c" opacity="0.6"/>
      {/* Upload card */}
      <rect x="68" y="62" width="200" height="50" rx="6" fill="#ffffff" stroke="#e2ddd5" strokeWidth="1"/>
      <rect x="78" y="70" width="34" height="4" rx="2" fill="#1a2035" opacity="0.5"/>
      <rect x="78" y="78" width="24" height="3" rx="1.5" fill="#c9a85c" opacity="0.7"/>
      <rect x="122" y="68" width="60" height="18" rx="4" fill="#f1ede6" stroke="#e2ddd5" strokeWidth="1" strokeDasharray="3,2"/>
      <text x="147" y="79" fontSize="6" fill="#b8a98a" fontFamily="sans-serif" textAnchor="middle">Drop PDF here</text>
      <rect x="200" y="70" width="56" height="8" rx="3" fill="#1a2035" opacity="0.08"/>
      <rect x="214" y="72" width="28" height="4" rx="2" fill="#1a2035" opacity="0.2"/>
      {/* Doc checklist */}
      <rect x="68" y="120" width="200" height="6" rx="3" fill="#ffffff" stroke="#e2ddd5" strokeWidth="0.5"/>
      <circle cx="76" cy="123" r="3" fill="#22c55e" opacity="0.8"/>
      <rect x="82" y="121" width="60" height="3" rx="1.5" fill="#1a2035" opacity="0.25"/>
      <rect x="68" y="130" width="200" height="6" rx="3" fill="#ffffff" stroke="#e2ddd5" strokeWidth="0.5"/>
      <circle cx="76" cy="133" r="3" fill="#22c55e" opacity="0.8"/>
      <rect x="82" y="131" width="50" height="3" rx="1.5" fill="#1a2035" opacity="0.25"/>
      <rect x="68" y="140" width="200" height="6" rx="3" fill="#ffffff" stroke="#e2ddd5" strokeWidth="0.5"/>
      <circle cx="76" cy="143" r="3" fill="#f59e0b" opacity="0.8"/>
      <rect x="82" y="141" width="70" height="3" rx="1.5" fill="#1a2035" opacity="0.15"/>
      <rect x="178" y="141" width="26" height="3" rx="1.5" fill="#c9a85c" opacity="0.6"/>
    </svg>
  );
}

function MockProcessingScreen() {
  return (
    <svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg" className="hiw-mockup">
      <rect width="280" height="180" rx="8" fill="#f8f6f1" stroke="#e2ddd5" strokeWidth="1"/>
      <rect width="280" height="28" rx="8" fill="#1a2035"/>
      <rect y="20" width="280" height="8" fill="#1a2035"/>
      <circle cx="14" cy="14" r="4" fill="#ef4444" opacity="0.7"/>
      <circle cx="26" cy="14" r="4" fill="#f59e0b" opacity="0.7"/>
      <circle cx="38" cy="14" r="4" fill="#22c55e" opacity="0.7"/>
      <text x="100" y="17" fontSize="7" fill="#c9a85c" fontFamily="sans-serif">My Services — Status</text>
      {/* Sidebar */}
      <rect x="0" y="28" width="60" height="152" fill="#0f1624"/>
      <rect x="8" y="40" width="44" height="6" rx="3" fill="#ffffff" opacity="0.15"/>
      <rect x="8" y="54" width="36" height="5" rx="2.5" fill="#ffffff" opacity="0.25"/>
      <rect x="8" y="66" width="40" height="5" rx="2.5" fill="#c9a85c" opacity="0.9"/>
      <rect x="8" y="78" width="32" height="5" rx="2.5" fill="#ffffff" opacity="0.15"/>
      {/* Milestone bar */}
      <rect x="68" y="36" width="140" height="7" rx="3" fill="#1a2035" opacity="0.8"/>
      <rect x="68" y="48" width="200" height="16" rx="4" fill="#ffffff" stroke="#e2ddd5" strokeWidth="1"/>
      {/* Steps */}
      {[0,1,2,3,4].map((i) => (
        <g key={i}>
          <circle cx={78 + i*44} cy={56} r={4}
            fill={i <= 1 ? "#c9a85c" : i === 2 ? "#3a5fc4" : "#e2ddd5"}
            stroke={i === 2 ? "#3a5fc4" : "none"} strokeWidth="1"/>
        </g>
      ))}
      <rect x="78" y="55" width="176" height="2" fill="#e2ddd5"/>
      <rect x="78" y="55" width="88" height="2" fill="#c9a85c"/>
      {/* Status card */}
      <rect x="68" y="70" width="200" height="40" rx="6" fill="#ffffff" stroke="#e2ddd5" strokeWidth="1"/>
      <rect x="78" y="78" width="50" height="4" rx="2" fill="#1a2035" opacity="0.7"/>
      <rect x="78" y="86" width="80" height="3" rx="1.5" fill="#1a2035" opacity="0.2"/>
      <rect x="206" y="76" width="50" height="10" rx="5" fill="rgba(80,120,200,0.12)"/>
      <text x="231" y="83" fontSize="6" fill="#3a5fc4" fontFamily="sans-serif" textAnchor="middle">In Progress</text>
      {/* Doc summary cards */}
      <rect x="68" y="116" width="94" height="34" rx="6" fill="#ffffff" stroke="#e2ddd5" strokeWidth="1"/>
      <rect x="76" y="122" width="30" height="3" rx="1.5" fill="#1a2035" opacity="0.3"/>
      <text x="78" y="140" fontSize="14" fill="#22c55e" fontFamily="sans-serif" fontWeight="bold">6</text>
      <rect x="76" y="144" width="40" height="3" rx="1.5" fill="#22c55e" opacity="0.4"/>
      <rect x="174" y="116" width="94" height="34" rx="6" fill="#ffffff" stroke="#e2ddd5" strokeWidth="1"/>
      <rect x="182" y="122" width="30" height="3" rx="1.5" fill="#1a2035" opacity="0.3"/>
      <text x="184" y="140" fontSize="14" fill="#f59e0b" fontFamily="sans-serif" fontWeight="bold">2</text>
      <rect x="182" y="144" width="40" height="3" rx="1.5" fill="#f59e0b" opacity="0.4"/>
    </svg>
  );
}

function MockCompletionScreen() {
  return (
    <svg viewBox="0 0 280 180" xmlns="http://www.w3.org/2000/svg" className="hiw-mockup">
      <rect width="280" height="180" rx="8" fill="#f8f6f1" stroke="#e2ddd5" strokeWidth="1"/>
      <rect width="280" height="28" rx="8" fill="#1a2035"/>
      <rect y="20" width="280" height="8" fill="#1a2035"/>
      <circle cx="14" cy="14" r="4" fill="#ef4444" opacity="0.7"/>
      <circle cx="26" cy="14" r="4" fill="#f59e0b" opacity="0.7"/>
      <circle cx="38" cy="14" r="4" fill="#22c55e" opacity="0.7"/>
      <text x="90" y="17" fontSize="7" fill="#c9a85c" fontFamily="sans-serif">Payments — Completed</text>
      {/* Sidebar */}
      <rect x="0" y="28" width="60" height="152" fill="#0f1624"/>
      <rect x="8" y="40" width="44" height="6" rx="3" fill="#ffffff" opacity="0.15"/>
      <rect x="8" y="54" width="36" height="5" rx="2.5" fill="#ffffff" opacity="0.15"/>
      <rect x="8" y="66" width="40" height="5" rx="2.5" fill="#ffffff" opacity="0.15"/>
      <rect x="8" y="78" width="32" height="5" rx="2.5" fill="#c9a85c" opacity="0.9"/>
      {/* Completion badge */}
      <rect x="68" y="34" width="200" height="50" rx="8" fill="rgba(47,122,91,0.08)" stroke="rgba(47,122,91,0.2)" strokeWidth="1"/>
      <circle cx="110" cy="59" r="14" fill="rgba(47,122,91,0.12)" stroke="#2f7a5b" strokeWidth="1.5"/>
      <text x="110" y="63" fontSize="12" fill="#2f7a5b" fontFamily="sans-serif" textAnchor="middle">✓</text>
      <rect x="132" y="48" width="80" height="5" rx="2.5" fill="#2f7a5b" opacity="0.7"/>
      <rect x="132" y="57" width="110" height="3.5" rx="1.75" fill="#1a2035" opacity="0.2"/>
      <rect x="132" y="64" width="90" height="3.5" rx="1.75" fill="#1a2035" opacity="0.15"/>
      {/* Receipt card */}
      <rect x="68" y="92" width="200" height="56" rx="6" fill="#ffffff" stroke="#e2ddd5" strokeWidth="1"/>
      <rect x="78" y="100" width="70" height="4" rx="2" fill="#1a2035" opacity="0.6"/>
      <rect x="78" y="108" width="50" height="3" rx="1.5" fill="#1a2035" opacity="0.2"/>
      <rect x="78" y="116" width="200" height="0.5" fill="#e2ddd5"/>
      <rect x="78" y="122" width="50" height="3" rx="1.5" fill="#1a2035" opacity="0.2"/>
      <rect x="200" y="121" width="40" height="4" rx="2" fill="#1a2035" opacity="0.5"/>
      <rect x="78" y="130" width="40" height="3" rx="1.5" fill="#1a2035" opacity="0.15"/>
      <rect x="210" y="129" width="30" height="3.5" rx="1.75" fill="#c9a85c" opacity="0.7"/>
      {/* Download button */}
      <rect x="68" y="154" width="200" height="16" rx="6" fill="#1a2035"/>
      <text x="168" y="164" fontSize="7" fill="#c9a85c" fontFamily="sans-serif" textAnchor="middle">Download Receipt</text>
    </svg>
  );
}

const steps = [
  {
    number: "01",
    title: "Upload Documents",
    desc: "Upload Form 16, GST records, challans, and all required documents through your secure Vault.",
    Mock: MockUploadScreen,
  },
  {
    number: "02",
    title: "We Process",
    desc: "Your assigned Taxpert reviews everything, works through the filing, and keeps you updated at every stage.",
    Mock: MockProcessingScreen,
  },
  {
    number: "03",
    title: "Review & Complete",
    desc: "Once ready, you receive the final output, a structured receipt, and can download everything from your account.",
    Mock: MockCompletionScreen,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section section-alt">
      <div className="container">
        <div className="section-heading">
          <span className="section-kicker">How It Works</span>
          <h2>Simple for you. Structured behind the scenes.</h2>
          <p>
            Move from scattered emails and last-minute follow-ups to a guided
            workflow with full visibility on progress.
          </p>
        </div>
        <div className="content-grid three-up">
          {steps.map((step) => (
            <article key={step.number} className="hiw-card">
              <div className="hiw-mockup-wrap">
                <step.Mock />
              </div>
              <span className="step-chip">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
