import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ClipboardList, Clock3, MessageSquareText, Star } from "lucide-react";
import api, { errorMessage } from "../api";
import { Toast, useToast } from "../components/Toast";
import { useAuth } from "../state/AuthContext";

const statusClass = (status) => `status-${status.toLowerCase().replace(" ", "-")}`;

export default function EngineerHome() {
  const { user } = useAuth();
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, showToast, clearToast } = useToast();

  useEffect(() => {
    let active = true;
    api.get("/feedback")
      .then(({ data }) => { if (active) setFeedback(data); })
      .catch((error) => showToast(errorMessage(error), "error"))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const openCount = feedback.filter((item) => item.feedback_status !== "Closed").length;
  const followUpCount = feedback.filter((item) => item.follow_up_required).length;
  const averageSatisfaction = feedback.length
    ? (feedback.reduce((sum, item) => sum + item.overall_satisfaction, 0) / feedback.length).toFixed(1)
    : "—";

  return <div className="engineer-home">
    <div className="page-header"><div>
      <div className="eyebrow page-eyebrow">ENGINEER WORKSPACE <span className="eyebrow-line" /></div>
      <h1>Your service <span>dashboard.</span></h1>
      <p>Welcome, {user?.username}. Here is the feedback assigned to you.</p>
    </div><Link className="btn btn-primary" to="/feedbacks"><ClipboardList size={15} /> Open feedback inbox <ArrowUpRight size={14} /></Link></div>

    <div className="engineer-summary-grid">
      <SummaryCard icon={MessageSquareText} label="Assigned feedback" value={loading ? "—" : feedback.length} color="green" />
      <SummaryCard icon={Clock3} label="Open feedback" value={loading ? "—" : openCount} color="amber" />
      <SummaryCard icon={Star} label="Average satisfaction" value={loading ? "—" : `${averageSatisfaction}${feedback.length ? "/5" : ""}`} color="blue" />
    </div>

    <section className="panel engineer-work-panel">
      <div className="panel-heading"><div><h3>Your assigned feedback</h3><p>Feedback shown here is scoped to your engineer account.</p></div>
        <span className="data-label">{feedback.length} {feedback.length === 1 ? "RECORD" : "RECORDS"}</span>
      </div>
      <div className="table-scroll"><table className="data-table">
        <thead><tr><th>TICKET / CLIENT</th><th>PRODUCT / SERVICE</th><th>DATE</th><th>SATISFACTION</th><th>FOLLOW-UP</th><th>STATUS</th></tr></thead>
        <tbody>
          {feedback.map((item) => <tr key={item.id}>
            <td><strong>{item.service_ticket_id}</strong><small className="cell-sub">{item.client_name}</small></td>
            <td>{item.product_software_name}<small className="cell-sub">{item.type_of_service}</small></td>
            <td>{item.date_of_service}</td>
            <td><span className="engineer-rating"><Star size={13} fill="currentColor" /> {item.overall_satisfaction}/5</span></td>
            <td>{item.follow_up_required ? <span className="status-badge status-action-taken">Required</span> : <span className="subtle">None</span>}</td>
            <td><span className={`status-badge ${statusClass(item.feedback_status)}`}>{item.feedback_status}</span></td>
          </tr>)}
          {!loading && feedback.length === 0 && <tr><td colSpan="6" className="empty-row"><MessageSquareText size={22} /><strong>No assigned feedback yet</strong><span>New feedback assigned to you will appear here.</span></td></tr>}
          {loading && <tr><td colSpan="6" className="empty-row"><span className="spinner spinner-dark" /> Loading your feedback…</td></tr>}
        </tbody>
      </table></div>
      {followUpCount > 0 && <p className="engineer-follow-up-note">{followUpCount} assigned {followUpCount === 1 ? "record needs" : "records need"} follow-up.</p>}
    </section>
    <Toast toast={toast} onClose={clearToast} />
  </div>;
}

function SummaryCard({ icon: Icon, label, value, color }) {
  return <section className="panel engineer-summary-card">
    <div className={`kpi-icon kpi-${color}`}><Icon size={17} /></div>
    <span className="kpi-label">{label}</span>
    <strong className="kpi-value">{value}</strong>
  </section>;
}
