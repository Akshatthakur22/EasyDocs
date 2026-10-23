import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check, FileSpreadsheet, FileText, Github, LockKeyhole, Mail, MousePointer2, Rows3, ShieldCheck, Sparkles, Linkedin, Printer, ScanText, Workflow } from "lucide-react";
import type { ReactNode } from "react";

export function PublicLayout({ children }: { children: ReactNode }) {
  return <div className="public-site"><PublicHeader /><main className="public-main">{children}</main><PublicFooter /></div>;
}

function PublicHeader() {
  return <header className="public-header">
    <Link href="/" className="brand" aria-label="EasyDocs home"><span className="brand-mark"><FileText size={18} /></span><span className="brand-name">easy<span>docs</span></span></Link>
    <nav aria-label="Main navigation" className="public-nav">
      <Link href="/">Home</Link><Link href="/#how-it-works">How it works</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link>
    </nav>
    <details className="public-mobile-menu">
      <summary>Menu</summary>
      <nav aria-label="Mobile navigation"><Link href="/">Home</Link><Link href="/#how-it-works">How it works</Link><Link href="/about">About EasyDocs</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link></nav>
    </details>
    <Link href="/app" className="button public-cta">Open Tool <ArrowRight size={15} /></Link>
  </header>;
}

function PublicFooter() {
  return <footer className="public-footer">
    <div className="footer-scene">
      <svg className="footer-scenery" viewBox="0 0 1440 620" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="footer-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#101d31" /><stop offset=".48" stopColor="#315067" /><stop offset=".76" stopColor="#b77f6c" /><stop offset="1" stopColor="#17232d" /></linearGradient>
          <radialGradient id="footer-sunset"><stop stopColor="#ffd5a0" stopOpacity=".92" /><stop offset=".35" stopColor="#ef9c72" stopOpacity=".42" /><stop offset="1" stopColor="#f0a27b" stopOpacity="0" /></radialGradient>
          <linearGradient id="footer-ground" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#1c3034" /><stop offset="1" stopColor="#09131a" /></linearGradient>
        </defs>
        <rect width="1440" height="620" fill="url(#footer-sky)" />
        <ellipse cx="730" cy="415" rx="530" ry="225" fill="url(#footer-sunset)" />
        <g fill="#fff4de" opacity=".75"><circle cx="110" cy="72" r="1.5" /><circle cx="244" cy="129" r="1" /><circle cx="384" cy="68" r="1.4" /><circle cx="550" cy="112" r="1" /><circle cx="692" cy="51" r="1.4" /><circle cx="892" cy="96" r="1" /><circle cx="1046" cy="55" r="1.3" /><circle cx="1214" cy="113" r="1" /><circle cx="1345" cy="67" r="1.5" /><circle cx="1300" cy="198" r="1" /><circle cx="177" cy="226" r="1" /><circle cx="1010" cy="181" r="1" /></g>
        <path d="M0 405 146 270 249 339 405 203 546 352 694 285 838 376 1006 222 1171 345 1308 252 1440 342 1440 620 0 620Z" fill="#263944" opacity=".86" />
        <path d="M0 438 168 351 317 397 476 315 630 413 803 338 938 404 1112 317 1280 407 1440 337 1440 620 0 620Z" fill="#182a30" />
        <path d="M0 472 Q190 424 354 467 T720 455 Q910 407 1081 463 T1440 440 L1440 620 0 620Z" fill="url(#footer-ground)" />
        <path d="M0 520 Q210 471 427 515 T850 502 Q1110 456 1440 510 L1440 620 0 620Z" fill="#081116" opacity=".8" />
      </svg>
      <div className="footer-scene-shade" />
      <div className="footer-scene-content">
        <div className="footer-topline">
          <Link href="/" className="footer-logo" aria-label="EasyDocs home"><span className="footer-logo-mark"><FileText size={17} /></span><span>easy<strong>docs</strong></span></Link>
          <p>MAKE EVERY PAGE PERSONAL.<span>One template. A whole lot less busywork.</span></p>
          <Link href="/app" className="footer-start">Create a batch <ArrowRight size={14} /></Link>
        </div>
        <div className="footer-links-grid">
          <nav aria-label="Explore EasyDocs"><h2>EXPLORE</h2><Link href="/">Home</Link><Link href="/#how-it-works">How it works</Link><Link href="/about">About EasyDocs</Link></nav>
          <nav aria-label="Resources"><h2>RESOURCES</h2><Link href="/about">Supported formats</Link><Link href="/privacy">Privacy notes</Link><Link href="/contact">Contact</Link></nav>
          <nav aria-label="Get started"><h2>GET STARTED</h2><p>Bring your document and spreadsheet. Place each value once, then make print-ready copies.</p><Link className="footer-open-link" href="/app">Open the document tool <ArrowRight size={14} /></Link></nav>
        </div>
        <div className="footer-wordmark" aria-hidden="true">EASYDOCS</div>
      </div>
    </div>
  </footer>;
}

export function LandingPage() {
  return <PublicLayout>
    <section className="marketing-hero">
      <div className="hero-copy">
        <span className="eyebrow"><FileText size={13} /> REPEATABLE DOCUMENTS, PREPARED ONCE</span>
        <h1>One document.<br /><span>Every detail, in place.</span></h1>
        <p>Bring a PDF, image, or Word document and a spreadsheet. Place each value once, review a real record, then create print-ready PDFs in your browser.</p>
        <div className="hero-actions"><Link href="/app" className="button button-large">Open EasyDocs <ArrowRight size={16} /></Link><a href="#how-it-works" className="button secondary button-large">See how it works</a></div>
        <div className="hero-trust"><span><Check size={14} /> No account required</span><span><LockKeyhole size={14} /> Files stay in this browser</span></div>
      </div>
      <div className="hero-demo" aria-label="Example of placing spreadsheet values on a document">
        <div className="demo-window-bar"><div className="demo-window-dots"><i /><i /><i /></div><span>Illustrative workflow · sample data</span><span className="demo-live"><span /> PDF output</span></div>
        <div className="demo-workspace">
          <div className="demo-sheet"><div className="demo-panel-title"><FileSpreadsheet size={14} /> Recipients.csv</div><div className="demo-table-head"><span>Name</span><span>Date</span></div><div className="demo-table-row"><span>Avery Chen</span><span>Oct 22</span></div><div className="demo-table-row"><span>Jordan Lee</span><span>Oct 22</span></div><div className="demo-table-row"><span>Sam Patel</span><span>Oct 22</span></div><span className="demo-more">One row per document</span></div>
          <div className="demo-connector"><ArrowRight size={18} /><span>Place fields</span><ArrowRight size={18} /></div>
          <div className="demo-document"><div className="demo-doc-kicker">SAMPLE NOTICE</div><div className="demo-doc-title">A personal letter</div><div className="demo-doc-line">Dear <strong>Avery Chen</strong>,</div><div className="demo-doc-line">This notice is prepared for you.</div><div className="demo-doc-date">October 22</div><div className="demo-doc-sign">EasyDocs sample</div><span className="demo-field-dot"><MousePointer2 size={12} /></span></div>
        </div>
        <div className="demo-caption"><span><Rows3 size={13} /> Spreadsheet columns</span><span><MousePointer2 size={13} /> Positioned fields</span><span><FileText size={13} /> Printable PDF</span></div>
      </div>
    </section>

    <section className="proof-strip"><div><strong>01</strong><span>Bring a document</span></div><div><strong>02</strong><span>Import a spreadsheet</span></div><div><strong>03</strong><span>Place and review</span></div><div><strong>04</strong><span>Generate printable PDFs</span></div></section>

    <section className="marketing-section problem-section"><div className="section-intro"><span className="eyebrow">LESS REPETITION, MORE TIME</span><h2>Stop editing the same document<br />one person at a time.</h2><p>Prepare the page once. EasyDocs places each record’s details and keeps each finished PDF organized.</p></div><div className="benefit-list"><div><span className="benefit-number">01</span><div><strong>Keep the document you already use</strong><p>Start with an image or PDF, or convert a Word file locally into a page background.</p></div></div><div><span className="benefit-number">02</span><div><strong>Use the spreadsheet you already have</strong><p>Import CSV or Excel rows and connect each placed field to a column.</p></div></div><div><span className="benefit-number">03</span><div><strong>Review before you make the batch</strong><p>Check a real record, fix missing values, then generate PDFs for eligible rows.</p></div></div></div></section>

    <section className="marketing-section how-section" id="how-it-works"><div className="section-intro"><span className="eyebrow">THE WORKFLOW</span><h2>Four deliberate steps.<br />One reviewed batch.</h2><p>Prepare the page, connect the data, then check the result before creating files.</p></div><ol className="how-grid"><li><span className="how-count">01 / TEMPLATE</span><span className="how-icon"><FileText size={19} /></span><h3>Choose a page</h3><p>Use PNG, JPG, PDF, DOC, or DOCX. Word files become a PDF page background.</p></li><li><span className="how-count">02 / DATA</span><span className="how-icon"><FileSpreadsheet size={19} /></span><h3>Import a list</h3><p>Load CSV, XLS, XLSX, or XLSM with one record in each row.</p></li><li><span className="how-count">03 / PLACEMENT</span><span className="how-icon"><MousePointer2 size={19} /></span><h3>Place each value</h3><p>Choose a column, position its text on the page, and review a real record.</p></li><li><span className="how-count">04 / OUTPUT</span><span className="how-icon"><ArrowRight size={19} /></span><h3>Create print files</h3><p>Export one PDF per eligible row, a ZIP, or a combined print PDF.</p></li></ol></section>

    <section className="marketing-section usecase-section"><div className="section-intro"><span className="eyebrow">REPEATABLE PAPERWORK</span><h2>Different details.<br />The same page.</h2><p>Prepare a reusable layout for work where names, dates, amounts, or other values change from one copy to the next.</p></div><ul className="usecase-grid"><li>Attendance notices</li><li>Academic letters</li><li>Offer letters</li><li>Fee reminders</li><li>HR documents</li><li>Event materials</li></ul></section>

    <section className="privacy-band"><div className="privacy-icon"><ShieldCheck size={22} /></div><div><span className="eyebrow">PRIVATE BY DESIGN</span><h2>Your files stay in this browser.</h2><p>Templates, spreadsheet rows, and generated files are stored locally in this browser. EasyDocs removes saved batches after seven days when the app is opened. Read exactly how local storage and conversion work in our <Link href="/privacy">privacy notes</Link>.</p></div><Link href="/privacy" className="text-link">How privacy works <ArrowRight size={14} /></Link></section>

    <section className="final-cta"><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Make your first batch.</h2><p>Bring your template and spreadsheet. EasyDocs handles the repetitive work.</p></div><Link href="/app" className="button button-large">Open EasyDocs <ArrowRight size={16} /></Link></section>
  </PublicLayout>;
}

export function AboutPage() {
  return <PublicLayout>
    <article className="story-page about-page">
      <header className="story-hero">
        <span className="eyebrow"><Sparkles size={13} /> ABOUT EASYDOCS</span>
        <h1>Make the repeat work<br /><span>the easy part.</span></h1>
        <p>Preparing a familiar letter for every person takes time and invites small mistakes. EasyDocs lets you place each spreadsheet value once, review a real example, and create a batch of printable documents.</p>
        <div className="story-actions"><Link href="/app" className="button button-large">Open EasyDocs <ArrowRight size={16} /></Link><a href="#about-workflow" className="button secondary button-large">See how it works</a></div>
        <div className="story-proof"><span><Workflow size={15} /> One reusable layout</span><span><LockKeyhole size={15} /> Processed in your browser</span><span><Printer size={15} /> Print-ready PDF output</span></div>
      </header>

      <section className="about-workflow" id="about-workflow" aria-labelledby="about-workflow-title">
        <div className="about-section-heading"><span className="eyebrow">WHY EASYDOCS</span><h2 id="about-workflow-title">One page. Many people.<br />No repeated editing.</h2><p>Use the document you already have, bring in a list, and position the changing details where they belong.</p></div>
        <ol className="workflow-list">
          <li><span>01</span><div><strong>Bring your document</strong><p>Use a PDF or image as the page, or convert a Word document into a PDF background.</p></div></li>
          <li><span>02</span><div><strong>Connect your spreadsheet</strong><p>Each row becomes a record; each column can provide a value for a placed field.</p></div></li>
          <li><span>03</span><div><strong>Place, review, and create</strong><p>Set positions and text styles, inspect a real record, then export personalized PDFs.</p></div></li>
        </ol>
      </section>

      <section className="about-capabilities" aria-labelledby="about-capabilities-title">
        <div className="about-section-heading"><span className="eyebrow">WHAT YOU CAN DO</span><h2 id="about-capabilities-title">A focused tool for batch documents.</h2></div>
        <div className="capability-rows">
          <article><span className="capability-icon"><FileText size={18} /></span><div><h3>Use your page as the template</h3><p>Place text over PDF and image pages. Word documents are converted to PDF backgrounds for positioning.</p></div><ScanText size={18} className="capability-end-icon" aria-hidden="true" /></article>
          <article><span className="capability-icon"><FileSpreadsheet size={18} /></span><div><h3>Fill values from rows and columns</h3><p>Import CSV or Excel spreadsheets, map columns to fields, and review records with missing values.</p></div><Workflow size={18} className="capability-end-icon" aria-hidden="true" /></article>
          <article><span className="capability-icon"><Printer size={18} /></span><div><h3>Export documents ready to print</h3><p>Download an individual PDF per record, a ZIP of files, or one combined print PDF.</p></div><ArrowRight size={18} className="capability-end-icon" aria-hidden="true" /></article>
        </div>
      </section>

      <section className="about-local" aria-labelledby="about-local-title">
        <div className="about-local-icon"><LockKeyhole size={20} /></div>
        <div><span className="eyebrow">LOCAL-FIRST BY DESIGN</span><h2 id="about-local-title">Your batch stays in this browser.</h2><p>Templates, spreadsheet rows, and generated files are stored locally in this browser. Word and legacy Excel conversion runs in a browser worker; EasyDocs does not send document contents to a conversion API. Saved batches expire after seven days, with cleanup when the app opens.</p></div>
        <Link href="/privacy" className="text-link">Read the privacy details <ArrowRight size={14} /></Link>
      </section>

      <section className="about-formats" aria-labelledby="about-formats-title">
        <div className="about-section-heading"><span className="eyebrow">FORMATS & LIMITS</span><h2 id="about-formats-title">Start with files you already use.</h2><p>EasyDocs creates a printable PDF for each included record.</p></div>
        <div className="format-table" role="list">
          <div role="listitem"><strong>Page templates</strong><span>PNG · JPG · PDF · DOC · DOCX</span></div>
          <div role="listitem"><strong>Spreadsheets</strong><span>CSV · XLS · XLSX · XLSM</span></div>
          <div role="listitem"><strong>Exports</strong><span>PDFs · ZIP archive · Combined PDF</span></div>
        </div>
        <p className="format-limit"><strong>A note on layout:</strong> Word conversion can change pagination or spacing. Scanned pages and flat PDFs act as backgrounds; EasyDocs places new text over them and does not edit the original printed text. Image templates use a documented 96 pixels-per-inch policy to establish physical PDF size. Review the converted page and a generated sample before making a full batch.</p>
      </section>

      <section className="creator-section" aria-labelledby="creator-title">
        <div className="creator-monogram" aria-hidden="true">AT</div>
        <div className="creator-copy"><span className="eyebrow">BUILT BY</span><h2 id="creator-title">Akshat Thakur</h2><p>Akshat is a software developer who builds practical software around real operational problems. EasyDocs is one expression of that approach: make repetitive document work simpler, then keep the workflow understandable.</p><div className="creator-links"><a href="https://akshatt.in/" target="_blank" rel="noreferrer">Portfolio <ArrowUpRight size={14} /></a><a href="https://github.com/Akshatthakur22" target="_blank" rel="noreferrer"><Github size={14} /> GitHub <ArrowUpRight size={14} /></a><a href="https://www.linkedin.com/in/akshatthakur22/" target="_blank" rel="noreferrer"><Linkedin size={14} /> LinkedIn <ArrowUpRight size={14} /></a><a href="mailto:akshatthakur22@gmail.com"><Mail size={14} /> Email</a></div></div>
      </section>

      <section className="about-final-cta"><div><span className="eyebrow">READY TO START?</span><h2>Make your first batch.</h2><p>Bring a document and a spreadsheet. EasyDocs helps with the repetitive part.</p></div><Link href="/app" className="button button-large">Open the document tool <ArrowRight size={16} /></Link></section>
    </article>
  </PublicLayout>;
}

export function ContactPage() {
  return <PublicLayout>
    <article className="story-page contact-page-redesign">
      <header className="contact-hero">
        <span className="eyebrow"><Mail size={13} /> CONTACT & HELP</span>
        <h1>Start with the person<br /><span>who shared EasyDocs.</span></h1>
        <p>This installation does not have a dedicated support inbox. If your organization or team provided EasyDocs, contact the administrator or maintainer who shared it with you.</p>
      </header>

      <section className="contact-guidance" aria-labelledby="contact-guidance-title">
        <div className="contact-guidance-mark"><LockKeyhole size={20} /></div>
        <div className="contact-guidance-copy"><span className="eyebrow">THE RIGHT PLACE FOR HELP</span><h2 id="contact-guidance-title">Your provider knows this installation.</h2><p>They can help with local setup, organization-specific configuration, or questions about how your copy of the tool is managed.</p></div>
        <div className="contact-guidance-note"><strong>When describing an issue</strong><p>Include which step you were on and the exact message you saw. Avoid sharing private document contents unless your administrator asks for them.</p></div>
      </section>

      <section className="contact-next" aria-labelledby="contact-next-title">
        <div className="about-section-heading"><span className="eyebrow">KEEP GOING</span><h2 id="contact-next-title">Find the information you need.</h2></div>
        <div className="contact-link-list">
          <Link href="/about"><span><strong>About EasyDocs</strong><small>Workflow, supported formats, and limitations</small></span><ArrowRight size={17} /></Link>
          <Link href="/privacy"><span><strong>Privacy notes</strong><small>How local files and browser storage work</small></span><ArrowRight size={17} /></Link>
          <Link href="/app"><span><strong>Open the document tool</strong><small>Start or continue a batch in this browser</small></span><ArrowRight size={17} /></Link>
        </div>
      </section>
    </article>
  </PublicLayout>;
}

export function PrivacyPage() {
  return <PublicLayout>
    <article className="privacy-page">
      <header className="privacy-hero">
        <span className="eyebrow"><LockKeyhole size={13} /> PRIVACY AT A GLANCE</span>
        <h1>Your documents stay<br /><span>on this device.</span></h1>
        <p>EasyDocs processes the batch in your browser and stores working files locally so you can return to it. Here is what that means in practice.</p>
      </header>

      <section className="privacy-summary" aria-labelledby="privacy-summary-title">
        <div className="privacy-summary-icon"><ShieldCheck size={20} /></div>
        <div><span className="eyebrow">LOCAL-FIRST WORKFLOW</span><h2 id="privacy-summary-title">No document upload to a conversion service.</h2><p>PDFs and images are handled in your browser. Word and legacy Excel conversion runs in a browser worker; the converter runtime is served by this EasyDocs installation, while document contents stay in the browser.</p></div>
        <Link href="/app" className="text-link">Open EasyDocs <ArrowRight size={14} /></Link>
      </section>

      <section className="privacy-details" aria-label="How EasyDocs handles your files">
        <article><span className="privacy-detail-index">01</span><div><h2>Files saved in this browser</h2><p>Templates, imported rows, batch state, and generated PDFs are saved in this browser’s IndexedDB so a batch can be recovered. Batches and templates older than seven days are removed when the app opens.</p></div></article>
        <article><span className="privacy-detail-index">02</span><div><h2>Local processing</h2><p>PDF and image templates are handled in the browser. DOC/DOCX and legacy XLS conversion runs in a browser worker. Document contents are not sent to a conversion API. Image print dimensions use a documented 96 pixels-per-inch policy.</p></div></article>
        <article><span className="privacy-detail-index">03</span><div><h2>Downloads and deletion</h2><p>Downloads are created by your browser. Use “Delete all local data” in the app to remove EasyDocs templates, batches, and generated files from this browser. Clearing site data also removes them.</p></div></article>
        <article><span className="privacy-detail-index">04</span><div><h2>Storage limits</h2><p>Browser settings or available device storage can affect local files. A batch is not synced across devices. Review generated PDFs before sharing or printing them.</p></div></article>
      </section>

      <footer className="privacy-page-end"><p>Need a hand with this installation? Contact the administrator or maintainer who provided it.</p><div><Link href="/contact" className="text-link">Contact guidance <ArrowRight size={14} /></Link><Link href="/about" className="text-link">About EasyDocs <ArrowRight size={14} /></Link></div></footer>
    </article>
  </PublicLayout>;
}
