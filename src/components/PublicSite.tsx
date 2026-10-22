import Link from "next/link";
import { ArrowRight, Check, FileSpreadsheet, FileText, LockKeyhole, MousePointer2, Rows3, ShieldCheck, Sparkles } from "lucide-react";
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
    <Link href="/app" className="button public-cta">Open Tool <ArrowRight size={15} /></Link>
  </header>;
}

function PublicFooter() {
  return <footer className="public-footer"><div className="footer-brand"><Link href="/" className="brand"><span className="brand-mark"><FileText size={16} /></span><span className="brand-name">easy<span>docs</span></span></Link><span>One template. A whole lot less busywork.</span></div><nav aria-label="Footer navigation"><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/privacy">Privacy</Link><Link href="/app">Open Tool</Link></nav><small>Files are processed in your browser. Word conversion and print layout can vary by document.</small></footer>;
}

export function LandingPage() {
  return <PublicLayout>
    <section className="marketing-hero">
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={13} /> DOCUMENTS, CREATED IN BULK</span>
        <h1>One template.<br /><span>A whole lot less busywork.</span></h1>
        <p>Turn a document and spreadsheet into personalized, print-ready PDFs. Place each value once, review a real record, then create the batch.</p>
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

    <section className="marketing-section how-section" id="how-it-works"><div className="section-intro center"><span className="eyebrow">A STRAIGHTFORWARD WORKFLOW</span><h2>From spreadsheet to finished documents.</h2><p>Each step keeps the next action clear and lets you review before generation.</p></div><div className="how-grid"><article><span className="how-icon"><FileText size={19} /></span><span className="how-count">STEP 01</span><h3>Choose a template</h3><p>Use PNG, JPG, PDF, DOC, or DOCX. Word files are converted locally to a printable PDF background.</p></article><article><span className="how-icon"><FileSpreadsheet size={19} /></span><span className="how-count">STEP 02</span><h3>Import your data</h3><p>Bring a CSV, XLS, XLSX, or XLSM spreadsheet with one record per row.</p></article><article><span className="how-icon"><MousePointer2 size={19} /></span><span className="how-count">STEP 03</span><h3>Place and review</h3><p>Choose columns, place values on the page, and check the output against real records.</p></article><article><span className="how-icon"><ArrowRight size={19} /></span><span className="how-count">STEP 04</span><h3>Generate and export</h3><p>Create a PDF for each eligible record, download a ZIP, or combine the PDFs for printing.</p></article></div></section>

    <section className="marketing-section usecase-section"><div className="section-intro"><span className="eyebrow">MADE FOR REPEATABLE PAPERWORK</span><h2>Useful wherever the details change<br />but the document stays the same.</h2><p>Examples of workflows you can prepare with supported page formats.</p></div><div className="usecase-grid"><span>Attendance notices</span><span>Academic letters</span><span>Offer letters</span><span>Fee reminders</span><span>HR documents</span><span>Event materials</span></div></section>

    <section className="privacy-band"><div className="privacy-icon"><ShieldCheck size={22} /></div><div><span className="eyebrow">PRIVATE BY DESIGN</span><h2>Your files stay in this browser.</h2><p>Templates, spreadsheet rows, and generated files are stored locally in this browser. EasyDocs removes saved batches after seven days when the app is opened. Read exactly how local storage and conversion work in our <Link href="/privacy">privacy notes</Link>.</p></div><Link href="/privacy" className="text-link">How privacy works <ArrowRight size={14} /></Link></section>

    <section className="final-cta"><div><span className="eyebrow">READY WHEN YOU ARE</span><h2>Make your first batch.</h2><p>Bring your template and spreadsheet. EasyDocs handles the repetitive work.</p></div><Link href="/app" className="button button-large">Open EasyDocs <ArrowRight size={16} /></Link></section>
  </PublicLayout>;
}

export function AboutPage() {
  return <PublicLayout><article className="info-page"><span className="eyebrow">ABOUT EASYDOCS</span><h1>Personalized documents,<br />without repetitive editing.</h1><p className="info-lede">EasyDocs helps turn a reusable document and a spreadsheet into a batch of personalized, printable PDFs.</p><div className="info-card-grid"><section><FileText size={18} /><h2>Use your page</h2><p>Choose an image or PDF background, or convert a Word document to PDF locally. Add spreadsheet columns as positioned text fields.</p></section><section><FileSpreadsheet size={18} /><h2>Use your data</h2><p>Import CSV or Excel data, review rows, and correct or exclude records that are missing required values.</p></section><section><LockKeyhole size={18} /><h2>Keep it local</h2><p>The current workflow stores batch files in this browser and generates documents locally. There is no sign-in or cloud batch account.</p></section></div><div className="capability-note"><strong>Supported formats</strong><p>Templates: PNG, JPG, PDF, DOC, DOCX. Data: CSV, XLS, XLSX, XLSM. Generated files: individual PDFs, ZIP export, and combined print PDF. Word conversion can change layout, so inspect converted pages before placing fields.</p></div><Link href="/app" className="button">Open the document tool <ArrowRight size={15} /></Link></article></PublicLayout>;
}

export function ContactPage() {
  return <PublicLayout><article className="info-page contact-page"><span className="eyebrow">CONTACT</span><h1>Need a hand getting started?</h1><p className="info-lede">EasyDocs runs in your browser and this installation is not connected to a support inbox.</p><div className="capability-note"><strong>If your organization provided this tool</strong><p>Contact the administrator or maintainer who shared it with you. They can help with local setup and organization-specific questions.</p></div><div className="capability-note"><strong>For help using the workflow</strong><p>Start with the supported formats and privacy notes, then open the tool to try a sample template and spreadsheet.</p><div className="inline-links"><Link href="/about">Supported formats</Link><Link href="/privacy">Privacy notes</Link></div></div><Link href="/app" className="button">Open EasyDocs <ArrowRight size={15} /></Link></article></PublicLayout>;
}

export function PrivacyPage() {
  return <PublicLayout><article className="info-page privacy-page"><span className="eyebrow">PRIVACY NOTES</span><h1>Your documents stay<br />in this browser.</h1><p className="info-lede">EasyDocs is designed to process a batch locally. Here is what the current app does with your files.</p><div className="privacy-details"><section><h2>Local browser storage</h2><p>Templates, imported rows, batch state, and generated PDFs are saved in this browser’s IndexedDB so a batch can be recovered. The app checks for expired batches when it opens and removes batches and templates last updated more than seven days ago.</p></section><section><h2>Document and spreadsheet processing</h2><p>PDF and image templates are handled in the browser. DOC/DOCX and legacy XLS conversion runs in a browser worker; the converter runtime files are served by this EasyDocs installation. The actual document contents are not sent to a conversion API.</p></section><section><h2>Downloads and deletion</h2><p>Downloads are created by your browser. Use “Delete all local data” in the app to remove stored EasyDocs templates, batches, and generated files from this browser. Clearing browser site data also removes them.</p></section><section><h2>Limitations</h2><p>Browser storage can be cleared by browser settings or constrained by available device storage. A local browser batch is not synced across devices. Review your generated PDF before distributing it.</p></section></div><Link href="/app" className="button">Open EasyDocs <ArrowRight size={15} /></Link></article></PublicLayout>;
}
