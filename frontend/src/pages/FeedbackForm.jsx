import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, ClipboardList, LoaderCircle, Sparkles, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import api, { errorMessage } from "../api";
import { useAuth } from "../state/AuthContext";
import { Toast, useToast } from "../components/Toast";

const today = new Date().toISOString().slice(0, 10);
const emptyForm = {
  client_id: "", contact_person_name: "", mobile_number: "", email_address: "", product_software_name: "", type_of_service: "",
  date_of_service: today, support_engineer_name: "", was_engineer_punctual: "", was_issue_resolved: "",
  quality_of_service: 0, overall_satisfaction: 0, feedback_on_software: "", problems_still_pending: "",
  suggestions_for_improvement: "", engineers_behaviour: 0, engineers_technical_knowledge: 0,
  additional_requirements: "", references_for_clients: "", any_other_comments: "",
};

export default function FeedbackForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [ticket, setTicket] = useState("");
  const { toast, showToast, clearToast } = useToast();

  useEffect(() => {
    Promise.all([api.get("/clients"), api.get("/engineers")]).then(([clientResponse, engineerResponse]) => {
      const clientList = clientResponse.data;
      setClients(clientList);
      setEngineers(engineerResponse.data);
      const mine = clientList.find((client) => client.user_id === user.id) || clientList.find((client) => client.email === user.email);
      setForm((current) => ({
        ...current,
        client_id: mine?.id || "",
        contact_person_name: mine?.contact_person || "",
        mobile_number: mine?.mobile || "",
        email_address: mine?.email || "",
        support_engineer_name: engineerResponse.data[0]?.engineer_name || "",
      }));
      if (mine) loadProducts(mine.id);
    }).catch((error) => showToast(errorMessage(error), "error"));
  }, []);

  async function loadProducts(clientId) {
    try {
      const { data } = await api.get("/products", { params: { client_id: clientId } });
      setProducts(data);
      setForm((current) => ({ ...current, product_software_name: data[0]?.product_name || "" }));
    } catch (error) { showToast(errorMessage(error), "error"); }
  }

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  }
  function chooseClient(id) {
    const client = clients.find((item) => String(item.id) === String(id));
    setForm((current) => ({
      ...current,
      client_id: id,
      contact_person_name: client?.contact_person || "",
      mobile_number: client?.mobile || "",
      email_address: client?.email || "",
      product_software_name: "",
    }));
    setProducts([]);
    if (client) loadProducts(id);
  }

  function validate() {
    const next = {};
    if (!form.client_id) next.client_id = "Please choose your institution.";
    if (!form.contact_person_name.trim()) next.contact_person_name = "Contact person is required.";
    if (!form.mobile_number.trim()) next.mobile_number = "Mobile number is required.";
    if (!form.email_address.trim()) next.email_address = "Email address is required.";
    if (!form.product_software_name) next.product_software_name = "Please select a product.";
    if (!form.type_of_service) next.type_of_service = "Please select a service type.";
    if (!form.date_of_service) next.date_of_service = "Please choose a service date.";
    if (!form.support_engineer_name) next.support_engineer_name = "Please select an engineer.";
    if (!form.was_engineer_punctual) next.was_engineer_punctual = "Please select an answer.";
    if (!form.was_issue_resolved) next.was_issue_resolved = "Please select an answer.";
    if (!form.quality_of_service) next.quality_of_service = "Please rate service quality.";
    if (!form.overall_satisfaction) next.overall_satisfaction = "Your satisfaction rating is required.";
    if (!form.engineers_behaviour) next.engineers_behaviour = "Please rate the engineer's behaviour.";
    if (!form.engineers_technical_knowledge) next.engineers_technical_knowledge = "Please rate technical knowledge.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { mobile_number, email_address, ...feedback } = form;
      const { data } = await api.post("/feedback", {
        ...feedback,
        client_id: Number(form.client_id),
        mobile_email: `${mobile_number.trim()} / ${email_address.trim()}`,
      });
      setTicket(data.service_ticket_id);
      setComplete(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { showToast(errorMessage(error), "error"); }
    finally { setLoading(false); }
  }

  return <div className="form-page client-feedback-page">
    {complete ? <motion.div className="success-card form-card" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }}>
      <div className="success-orbit"><div className="success-check"><Check size={32} strokeWidth={2.5} /></div><i /><i /><i /></div>
      <span className="success-kicker"><Sparkles size={14} /> FEEDBACK RECEIVED</span><h2>Thank you for your<br /><span>valuable feedback!</span></h2>
      <p>Your perspective helps us deliver the kind of service you deserve. Our team will review your response and follow up if needed.</p>
      {ticket && <div className="ticket-chip">REFERENCE ID <strong>{ticket}</strong></div>}
      <button className="btn btn-primary" onClick={() => navigate("/my-feedback")}>Back to my feedback <ArrowRight size={16} /></button>
    </motion.div> : <form className="form-card client-feedback-form" onSubmit={submit} noValidate>
      <div className="feedback-form-title"><h1><ClipboardList size={15} /> Add Service Evaluation Feedback</h1></div>
      <div className="feedback-fields-grid">
        <Field label="Client / Institution Name" required error={errors.client_id}><select value={form.client_id} onChange={(e) => chooseClient(e.target.value)}><option value="">-- Select Client --</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.institution_name}</option>)}</select></Field>
        <Field label="Contact Person Name" required error={errors.contact_person_name}><input value={form.contact_person_name} onChange={(e) => update("contact_person_name", e.target.value)} placeholder="Contact Person" /></Field>
        <Field label="Mobile Number" required error={errors.mobile_number}><input type="tel" value={form.mobile_number} onChange={(e) => update("mobile_number", e.target.value)} placeholder="Mobile Number" /></Field>
        <Field label="Email ID" required error={errors.email_address}><input type="email" value={form.email_address} onChange={(e) => update("email_address", e.target.value)} placeholder="Email ID" /></Field>
        <Field label="Product / Software Name" required error={errors.product_software_name}><select disabled={!form.client_id || products.length === 0} value={form.product_software_name} onChange={(e) => update("product_software_name", e.target.value)}><option value="">-- Select Product --</option>{products.map((product) => <option key={product.id}>{product.product_name}</option>)}</select></Field>
        <Field label="Type of Service" required error={errors.type_of_service}><select value={form.type_of_service} onChange={(e) => update("type_of_service", e.target.value)}><option value="">-- Select Service Type --</option>{["Installation", "Training", "Complaint", "Maintenance", "Other"].map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Date of Service" required error={errors.date_of_service}><input type="date" value={form.date_of_service} onChange={(e) => update("date_of_service", e.target.value)} /></Field>
        <Field label="Support Engineer Name" required error={errors.support_engineer_name}><select value={form.support_engineer_name} onChange={(e) => update("support_engineer_name", e.target.value)}><option value="">-- Select Engineer --</option>{engineers.map((engineer) => <option key={engineer.id}>{engineer.engineer_name}</option>)}</select></Field>
        <ChoiceGroup className="punctual-choice" label="Was engineer punctual?" value={form.was_engineer_punctual} options={["Yes", "No"]} onChange={(value) => update("was_engineer_punctual", value)} />
        <ChoiceGroup label="Was issue resolved?" value={form.was_issue_resolved} options={["Fully", "Partially", "No", "N/A"]} onChange={(value) => update("was_issue_resolved", value === "No" ? "Not Resolved" : value === "N/A" ? "Not Applicable" : value)} />
      </div>
      <div className="feedback-rating-panel">
        <Rating label="Quality of Service" required value={form.quality_of_service} onChange={(value) => update("quality_of_service", value)} error={errors.quality_of_service} />
        <Rating label="Overall Satisfaction" required value={form.overall_satisfaction} onChange={(value) => update("overall_satisfaction", value)} error={errors.overall_satisfaction} />
        <Rating label="Behaviour & Professionalism" required value={form.engineers_behaviour} onChange={(value) => update("engineers_behaviour", value)} error={errors.engineers_behaviour} />
        <Rating label="Technical Knowledge" required value={form.engineers_technical_knowledge} onChange={(value) => update("engineers_technical_knowledge", value)} error={errors.engineers_technical_knowledge} />
        <p className="rating-scale-note"><CheckCircle2 size={11} /> Ratings: 1 = Very Poor, 2 = Poor, 3 = Average, 4 = Good, 5 = Excellent</p>
      </div>
      <div className="feedback-comments-grid">
        <TextField label="Feedback on Software / Product" value={form.feedback_on_software} onChange={(value) => update("feedback_on_software", value)} placeholder="Usability, performance, quality..." />
        <TextField label="Problems Still Pending, if Any" value={form.problems_still_pending} onChange={(value) => update("problems_still_pending", value)} placeholder="Pending issues or concerns..." />
        <TextField label="Suggestions for Improvement" value={form.suggestions_for_improvement} onChange={(value) => update("suggestions_for_improvement", value)} placeholder="Suggestions for product/service..." />
        <TextField label="Additional Requirements / Interest" value={form.additional_requirements} onChange={(value) => update("additional_requirements", value)} placeholder="Interest in other products..." optional />
        <TextField label="Potential Client References" value={form.references_for_clients} onChange={(value) => update("references_for_clients", value)} placeholder="Institution contact details..." optional />
        <TextField label="Any Other Comments" value={form.any_other_comments} onChange={(value) => update("any_other_comments", value)} placeholder="Additional feedback..." optional />
      </div>
      <div className="feedback-form-actions">
        <Link to="/my-feedback" className="feedback-cancel-button"><X size={12} /> Cancel</Link>
        <button type="submit" disabled={loading} className="feedback-submit-button">{loading ? <><LoaderCircle className="spin" size={13} /> Submitting...</> : <><Check size={13} /> Submit</>}</button>
      </div>
    </form>}
    <Toast toast={toast} onClose={clearToast} />
  </div>;
}

function Field({ label, required, error, children }) {
  return <label className={`form-field ${error ? "has-error" : ""}`}><span className="field-label"><span>{label}</span>{required && <b className="required">*</b>}</span>{children}{error && <small className="error-text">{error}</small>}</label>;
}
function ChoiceGroup({ className = "", label, error, options, value, onChange }) {
  const selectedValue = value === "Not Resolved" ? "No" : value === "Not Applicable" ? "N/A" : value;
  return <fieldset className={`choice-question ${className} ${error ? "has-error" : ""}`}><legend className="field-label">{label}</legend>
    <div className="choice-cards" role="radiogroup" aria-label={label}>{options.map((option) => <label className={`choice-card ${selectedValue === option ? "selected" : ""}`} key={option}><input type="radio" name={label} value={option} checked={selectedValue === option} onChange={() => onChange(option)} /><span className="choice-radio-dot" aria-hidden="true" /><span>{option}</span></label>)}</div>
    {error && <small className="error-text">{error}</small>}</fieldset>;
}
function Rating({ label, required, value, onChange, error }) {
  const rating = value || 1;
  const progress = `${((rating - 1) / 4) * 100}%`;
  return <div className={`rating-item ${error ? "has-error" : ""}`}>
    <div className="rating-label"><span>{label}{required && <b className="required">*</b>}</span><strong>{value ? `${value}/5` : "Select rating"}</strong></div>
    <input className="rating-range" type="range" min="1" max="5" step="1" value={rating} aria-label={label} aria-valuetext={value ? `${value} out of 5` : "Not rated"} style={{ "--rating-progress": progress }} onChange={(event) => onChange(Number(event.target.value))} />
    <div className="rating-range-captions"><span>Poor</span><span>Excellent</span></div>
    {error && <small className="error-text">{error}</small>}
  </div>;
}
function TextField({ label, value, onChange, placeholder, optional }) {
  return <label className="form-field text-area-field"><span className="field-label"><span>{label}</span>{optional && <small className="optional-badge">OPTIONAL</small>}</span>
    <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows="2" maxLength="3000" /></label>;
}
