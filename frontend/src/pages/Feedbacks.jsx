import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownToLine, CalendarDays, Check, ChevronDown, Eye, Filter, MessageSquare, Search, SlidersHorizontal, X } from "lucide-react";
import api, { errorMessage } from "../api";
import { Toast, useToast } from "../components/Toast";
import { useAuth } from "../state/AuthContext";

const statusClass = (status) => `status-${status.toLowerCase().replace(" ", "-")}`;
export default function Feedbacks() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [clients, setClients] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [filters, setFilters] = useState({ search: "", client_id: "", engineer_id: "", date_from: "", date_to: "", status: "", priority: "" });
  const [review, setReview] = useState({ feedback_status: "Submitted", admin_remarks: "", action_taken: "" });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const { toast, showToast, clearToast } = useToast();
  const params = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, value]) => value)), [filters]);

  useEffect(() => {
    Promise.all([api.get("/clients"), api.get("/engineers")]).then(([c, e]) => { setClients(c.data); setEngineers(e.data); })
      .catch((error) => showToast(errorMessage(error), "error"));
  }, []);
  useEffect(() => {
    let active = true; setBusy(true);
    api.get("/feedback", { params }).then(({ data }) => { if (active) setRows(data); })
      .catch((error) => showToast(errorMessage(error), "error")).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [params]);

  function open(row) {
    setSelected(row);
    setReview({ feedback_status: row.feedback_status, admin_remarks: row.admin_remarks || "", action_taken: row.action_taken || "" });
  }
  async function saveReview(event) {
    event.preventDefault(); if (!selected) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/feedback/${selected.id}/review`, review);
      setRows((current) => current.map((row) => row.id === data.id ? data : row));
      setSelected(data);
      showToast("Feedback review saved.");
    } catch (error) { showToast(errorMessage(error), "error"); }
    finally { setSaving(false); }
  }
  function exportExcel() {
    const columns = [
      ["Date", "date_of_service"], ["Client", "client_name"], ["Product", "product_software_name"],
      ["Engineer", "support_engineer_name"], ["Service", "type_of_service"], ["Quality", "quality_of_service"],
      ["Satisfaction", "overall_satisfaction"], ["Resolution", "was_issue_resolved"],
      ["Status", "feedback_status"], ["Priority", "priority"], ["Follow-up Required", "follow_up_required"],
      ["Ticket ID", "service_ticket_id"], ["Admin Remarks", "admin_remarks"], ["Action Taken", "action_taken"],
    ];
    const csvCell = (value) => {
      let text = value == null ? "" : String(value);
      if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const csv = [columns.map(([heading]) => csvCell(heading)).join(","),
      ...rows.map((row) => columns.map(([, key]) => csvCell(key === "follow_up_required" ? row[key] ? "Yes" : "No" : row[key])).join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "biyani-client-feedback.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return <div className="content-page">
    <div className="page-header"><div><div className="eyebrow page-eyebrow">LISTEN. REVIEW. ACT. <span className="eyebrow-line" /></div><h1>Feedback <span>inbox.</span></h1>
      <p>Every response is an opportunity to make the next experience better.</p></div>
      <button className="btn btn-primary" onClick={exportExcel}><ArrowDownToLine size={16} /> Export to Excel</button></div>
    <section className="panel inbox-toolbar">
      <div className="search-box"><Search size={17} /><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Search client, product, engineer or ticket…" /></div>
      <button className={`btn btn-outline filter-toggle ${showFilters ? "toggle-on" : ""}`} onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal size={15} /> Filters <ChevronDown size={14} /></button>
      <span className="result-count">{rows.length} {rows.length === 1 ? "response" : "responses"}</span>
    </section>
    <AnimatePresence>{showFilters && <motion.section className="panel advanced-filters" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
      <div className="filter-controls inbox-filters">
        <label className="filter-field"><span>Client</span><select value={filters.client_id} onChange={(e) => setFilters({ ...filters, client_id: e.target.value })}><option value="">All clients</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.institution_name}</option>)}</select></label>
        <label className="filter-field"><span>Engineer</span><select value={filters.engineer_id} onChange={(e) => setFilters({ ...filters, engineer_id: e.target.value })}><option value="">All engineers</option>{engineers.map((e) => <option key={e.id} value={e.id}>{e.engineer_name}</option>)}</select></label>
        <label className="filter-field"><span>From date</span><input type="date" value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} /></label>
        <label className="filter-field"><span>To date</span><input type="date" value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} /></label>
        <label className="filter-field"><span>Status</span><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Any status</option>{["Submitted","Reviewed","Action Taken","Closed"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="filter-field"><span>Priority</span><select value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}><option value="">Any priority</option>{["High","Medium","Low"].map((x) => <option key={x}>{x}</option>)}</select></label>
      </div></motion.section>}</AnimatePresence>
    <section className="panel inbox-panel"><div className="table-scroll"><table className="data-table inbox-table"><thead><tr><th>DATE / CLIENT</th><th>PRODUCT / ENGINEER</th><th>QUALITY</th><th>SATISFACTION</th><th>RESOLUTION</th><th>STATUS</th><th>FOLLOW-UP</th><th></th></tr></thead><tbody>
      {rows.map((row) => <tr key={row.id}><td><strong>{row.client_name}</strong><small className="cell-sub">{row.date_of_service} · {row.service_ticket_id}</small></td>
        <td><strong>{row.product_software_name}</strong><small className="cell-sub">{row.support_engineer_name}</small></td>
        <td><StarRow value={row.quality_of_service} /></td><td><StarRow value={row.overall_satisfaction} /></td>
        <td><span className={`resolution-badge resolution-${row.was_issue_resolved.toLowerCase().replaceAll(" ", "-")}`}>{row.was_issue_resolved}</span></td>
        <td><div className="status-stack"><span className={`status-badge ${statusClass(row.feedback_status)}`}>{row.feedback_status}</span>{row.priority === "High" && <span className="priority-badge">HIGH PRIORITY</span>}</div></td>
        <td>{row.follow_up_required ? <span className="followup-badge"><i /> Needed</span> : <span className="not-needed">—</span>}</td>
        <td><button className="view-feedback" aria-label="View feedback" title="View feedback" onClick={() => open(row)}><Eye size={17} /></button></td></tr>)}
      {!busy && rows.length === 0 && <tr><td colSpan="8" className="empty-row"><MessageSquare size={22} /><strong>No feedback found</strong><span>Try changing your filters or search terms.</span></td></tr>}
      {busy && <tr><td colSpan="8" className="empty-row"><span className="spinner spinner-dark" /> Loading feedback…</td></tr>}
    </tbody></table></div><div className="table-footer"><span>Showing <strong>{rows.length}</strong> feedback {rows.length === 1 ? "entry" : "entries"}</span><span>Sorted by newest first</span></div></section>
    <AnimatePresence>{selected && <FeedbackDrawer row={selected} review={review} setReview={setReview} onClose={() => setSelected(null)} onSave={saveReview} saving={saving} readOnly={user?.role !== "admin"} />}</AnimatePresence>
    <Toast toast={toast} onClose={clearToast} />
  </div>;
}
function StarRow({ value }) { return <span className="table-stars">{Array.from({ length: 5 }, (_, i) => <i key={i} className={i < value ? "filled" : ""}>★</i>)}</span>; }
function FeedbackDrawer({ row, review, setReview, onClose, onSave, saving, readOnly }) {
  const comments = [
    ["Product feedback", row.feedback_on_software], ["Pending problems", row.problems_still_pending],
    ["Suggestions", row.suggestions_for_improvement], ["Additional requirements", row.additional_requirements],
    ["References", row.references_for_clients], ["Other comments", row.any_other_comments],
  ].filter(([, value]) => value);
  return <motion.div className="drawer-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.aside className="feedback-drawer" initial={{ x: 40 }} animate={{ x: 0 }} exit={{ x: 40 }} transition={{ type: "tween", duration: .24 }}>
      <div className="drawer-header"><div><span className="drawer-kicker">CLIENT FEEDBACK · {row.service_ticket_id}</span><h2>Service review</h2></div><button className="icon-btn drawer-close" onClick={onClose} aria-label="Close"><X size={19} /></button></div>
      <div className="drawer-scroll">
        <div className="drawer-client-card"><div className="client-monogram">{row.client_name.slice(0, 1)}</div><div><strong>{row.client_name}</strong><span>{row.contact_person_name} · {row.mobile_email}</span></div></div>
        <div className="drawer-facts"><Fact label="PRODUCT" value={row.product_software_name} /><Fact label="SERVICE" value={row.type_of_service} /><Fact label="DATE OF SERVICE" value={row.date_of_service} /><Fact label="SUPPORT ENGINEER" value={row.support_engineer_name} /></div>
        <div className="drawer-section"><div className="drawer-section-title"><h3>The ratings</h3><span>OUT OF 5</span></div><RatingLine label="Service quality" value={row.quality_of_service} /><RatingLine label="Overall satisfaction" value={row.overall_satisfaction} /><RatingLine label="Behaviour & professionalism" value={row.engineers_behaviour} /><RatingLine label="Technical knowledge" value={row.engineers_technical_knowledge} /></div>
        <div className="drawer-section drawer-answers"><h3>Service experience</h3><div><span>Engineer punctual?</span><b>{row.was_engineer_punctual}</b></div><div><span>Issue resolved?</span><b>{row.was_issue_resolved}</b></div><div><span>Priority</span><b className={`priority-text ${row.priority === "High" ? "high-priority" : ""}`}>{row.priority}</b></div></div>
        <div className="drawer-section"><h3>In their own words</h3>{comments.length ? <div className="comment-list">{comments.map(([label, value]) => <div className="comment-block" key={label}><span>{label}</span><p>{value}</p></div>)}</div> : <p className="no-comments">No additional written comments were provided.</p>}</div>
        {!readOnly && <form className="drawer-review" onSubmit={onSave}><div className="review-heading"><div><h3>Team follow-through</h3><p>Keep every commitment visible.</p></div><span className="internal-label">INTERNAL</span></div>
          <label className="form-field"><span className="field-label">Feedback status</span><select value={review.feedback_status} onChange={(e) => setReview({ ...review, feedback_status: e.target.value })}>{["Submitted","Reviewed","Action Taken","Closed"].map((status) => <option key={status}>{status}</option>)}</select></label>
          <label className="form-field"><span className="field-label">Internal remarks</span><textarea value={review.admin_remarks} onChange={(e) => setReview({ ...review, admin_remarks: e.target.value })} rows="3" placeholder="Context or notes for your team…" /></label>
          <label className="form-field"><span className="field-label">Action taken</span><textarea value={review.action_taken} onChange={(e) => setReview({ ...review, action_taken: e.target.value })} rows="3" placeholder="What did the team do to address this?" /></label>
          <button className="btn btn-primary save-review" disabled={saving}>{saving ? <span className="spinner" /> : <><Check size={16} /> Save review</>}</button>
        </form>}
      </div>
    </motion.aside>
  </motion.div>;
}
function Fact({ label, value }) { return <div><span>{label}</span><strong>{value || "—"}</strong></div>; }
function RatingLine({ label, value }) { return <div className="rating-line"><span>{label}</span><div><StarRow value={value} /><b>{value}.0</b></div></div>; }
