import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, CalendarDays, CheckCircle2, ChevronDown, CircleUserRound, Clock3, FileText, MessageCircle, Plus, ShieldCheck, Sparkles, Star, TicketCheck } from "lucide-react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";
import { useAuth } from "../state/AuthContext";
import { Toast, useToast } from "../components/Toast";

export default function ClientHome() {
  const { user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [client, setClient] = useState(null);
  const [tab, setTab] = useState("feedback");
  const [selected, setSelected] = useState(null);
  const { toast, showToast, clearToast } = useToast();
  useEffect(() => {
    Promise.all([api.get("/feedback"), api.get("/clients")]).then(([f, c]) => {
      setFeedbacks(f.data);
      setClient(c.data.find((item) => item.user_id === user.id) || c.data.find((item) => item.email === user.email) || c.data[0] || null);
    }).catch((error) => showToast(errorMessage(error), "error"));
  }, []);
  const avg = feedbacks.length ? (feedbacks.reduce((sum, item) => sum + item.overall_satisfaction, 0) / feedbacks.length).toFixed(1) : "—";
  return <div className="client-home">
    <div className="client-welcome"><div><div className="eyebrow page-eyebrow">YOUR CLIENT SPACE <span className="eyebrow-line" /></div>
      <h1>Hello, <span>{client?.contact_person?.split(" ")[0] || user.username}.</span></h1><p>Your voice helps us make every service experience better.</p></div>
      <Link className="btn btn-primary" to="/new-feedback"><Plus size={16} /> Share your experience</Link>
    </div>
    <div className="client-summary">
      <div className="client-summary-card"><div className="summary-icon summary-sage"><FileText size={19} /></div><div><span>FEEDBACK SHARED</span><strong>{feedbacks.length}</strong></div><small>All time</small></div>
      <div className="client-summary-card"><div className="summary-icon summary-gold"><Star size={19} /></div><div><span>YOUR AVERAGE RATING</span><strong>{avg}<small>{avg !== "—" && "/5"}</small></strong></div><small>Overall satisfaction</small></div>
      <div className="client-summary-card"><div className="summary-icon summary-blue"><Clock3 size={19} /></div><div><span>IN PROGRESS</span><strong>{feedbacks.filter((f) => f.feedback_status !== "Closed").length}</strong></div><small>Under our care</small></div>
    </div>
    <section className="client-section panel">
      <div className="client-tabs"><button className={tab === "feedback" ? "selected" : ""} onClick={() => setTab("feedback")}><MessageCircle size={15} /> My feedback <span>{feedbacks.length}</span></button><button className={tab === "profile" ? "selected" : ""} onClick={() => setTab("profile")}><CircleUserRound size={15} /> My profile</button></div>
      {tab === "feedback" ? <div className="client-feedback-list">
        {!feedbacks.length ? <div className="client-empty"><div><Sparkles size={24} /></div><h3>Start the conversation</h3><p>Tell us how your recent service visit went. Your thoughts make a real difference.</p><Link className="btn btn-primary" to="/new-feedback"><Plus size={15} /> Share your first feedback</Link></div> :
          feedbacks.map((item, index) => <motion.button key={item.id} className={`client-feedback-row ${selected?.id === item.id ? "row-selected" : ""}`} onClick={() => setSelected(selected?.id === item.id ? null : item)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}>
            <div className="feedback-product-icon"><TicketCheck size={18} /></div><div className="client-feedback-main"><div><strong>{item.product_software_name}</strong><span className="client-service-type">{item.type_of_service}</span></div><span className="client-feedback-meta"><CalendarDays size={13} /> {item.date_of_service} <i /> Ticket {item.service_ticket_id}</span></div>
            <div className="client-row-rating"><span>Your rating</span><strong><Star size={14} fill="currentColor" /> {item.overall_satisfaction}.0</strong></div>
            <span className={`status-badge status-${item.feedback_status.toLowerCase().replace(" ", "-")}`}>{item.feedback_status}</span><ChevronDown className={`row-chevron ${selected?.id === item.id ? "rotated" : ""}`} size={17} />
          </motion.button>)}
        {selected && <div className="client-feedback-detail">
          <div className="timeline-title"><h3>Update timeline</h3><span>Ticket {selected.service_ticket_id}</span></div>
          <div className="timeline"><div className="timeline-item done"><span className="timeline-pin"><CheckCircle2 size={14} /></span><div><strong>Feedback shared</strong><p>Your response is safely with our service team.</p><small>{selected.created_at ? new Date(selected.created_at).toLocaleDateString() : selected.date_of_service}</small></div></div>
            <div className={`timeline-item ${selected.feedback_status !== "Submitted" ? "done" : "current"}`}><span className="timeline-pin">{selected.feedback_status !== "Submitted" ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}</span><div><strong>{selected.feedback_status === "Submitted" ? "Under review" : selected.feedback_status}</strong><p>{selected.admin_remarks || "Our team is reviewing your feedback and will keep you updated."}</p></div></div>
            {selected.action_taken && <div className="timeline-item done"><span className="timeline-pin"><ShieldCheck size={14} /></span><div><strong>Action taken</strong><p>{selected.action_taken}</p></div></div>}
          </div></div>}
      </div> : <div className="profile-content"><div className="profile-large-avatar">{client?.institution_name?.slice(0, 1) || user.username.slice(0, 1)}</div><div className="profile-heading"><h3>{client?.institution_name || "Your institution"}</h3><span>CLIENT ACCOUNT</span></div>
        <div className="profile-details"><ProfileItem label="Contact person" value={client?.contact_person} /><ProfileItem label="Email address" value={client?.email || user.email} /><ProfileItem label="Mobile number" value={client?.mobile} /><ProfileItem label="City" value={client?.city} /><ProfileItem label="Products with Biyani" value={client?.products?.map((product) => product.product_name).join(", ")} /></div>
        <p className="profile-help">Need to update your institution details? <a href="mailto:support@biyani.com">Contact our support team <ArrowRight size={13} /></a></p></div>}
    </section>
    <div className="client-reassurance"><div><ShieldCheck size={17} /><span>Your feedback stays confidential</span></div><span>Every response is read by a real person on our team.</span></div>
    <Toast toast={toast} onClose={clearToast} />
  </div>;
}
function ProfileItem({ label, value }) { return <div><span>{label}</span><strong>{value || "—"}</strong></div>; }
