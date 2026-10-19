import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, Building2, Check, ChevronRight, Eye, Mail, MapPin, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import api, { errorMessage } from "../api";
import { Toast, useToast } from "../components/Toast";

const settings = {
  clients: { title: "Clients", singular: "client", intro: "The institutions who trust us with their service experience.", endpoint: "/clients", icon: Building2 },
  engineers: { title: "Engineers", singular: "engineer", intro: "The people who turn great support into great experiences.", endpoint: "/engineers", icon: Building2 },
  products: { title: "Products", singular: "product", intro: "The solutions at the heart of every client relationship.", endpoint: "/products", icon: Building2 },
};
const emptyValues = { institution_name: "", contact_person: "", mobile: "", email: "", address: "", city: "", engineer_name: "", product_name: "", product_name_unused: "", product_name_field: "", description: "", username: "", password: "", product_ids: [], client_ids: [] };
const MASTER_CACHE_TTL = 30_000;
const masterDataCache = new Map();
const masterDataRequests = new Map();

function fetchMasterData(type, force = false) {
  const pending = masterDataRequests.get(type);
  if (pending) return pending;
  const cached = masterDataCache.get(type);
  if (!force && cached && Date.now() - cached.fetchedAt < MASTER_CACHE_TTL) {
    return Promise.resolve(cached);
  }

  const config = settings[type];
  const request = Promise.all([
    api.get(config.endpoint),
    type === "clients" ? api.get("/products") : Promise.resolve({ data: [] }),
  ]).then(([rows, products]) => {
    const result = { rows: rows.data, products: products.data, fetchedAt: Date.now() };
    masterDataCache.set(type, result);
    return result;
  }).finally(() => {
    masterDataRequests.delete(type);
  });

  masterDataRequests.set(type, request);
  return request;
}

export function prefetchMasterData(type) {
  return fetchMasterData(type);
}

export default function Masters({ type }) {
  const config = settings[type];
  const [rows, setRows] = useState(() => masterDataCache.get(type)?.rows || []);
  const [products, setProducts] = useState(() => masterDataCache.get(type)?.products || []);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [clientFeedbacks, setClientFeedbacks] = useState([]);
  const [values, setValues] = useState(emptyValues);
  const [busy, setBusy] = useState(false);
  const { toast, showToast, clearToast } = useToast();

  async function load(force = false) {
    try {
      const data = await fetchMasterData(type, force);
      setRows(data.rows);
      setProducts(data.products);
    } catch (error) { showToast(errorMessage(error), "error"); }
  }
  useEffect(() => {
    const cached = masterDataCache.get(type);
    setRows(cached?.rows || []);
    setProducts(cached?.products || []);
    load();
  }, [type]);
  const filtered = rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search.toLowerCase()));

  function openModal(row = null) {
    setEditing(row);
    setValues(row ? {
      institution_name: row.institution_name || "", contact_person: row.contact_person || "", mobile: row.mobile || "", email: row.email || "",
      address: row.address || "", city: row.city || "", engineer_name: row.engineer_name || "",
      product_name_field: row.product_name || "", description: row.description || "", username: "", password: "",
      product_ids: row.product_ids || [], client_ids: [],
    } : emptyValues);
    setModal(true);
  }
  async function save(event) {
    event.preventDefault(); setBusy(true);
    const payload = type === "clients" ? {
      institution_name: values.institution_name, contact_person: values.contact_person, mobile: values.mobile,
      email: values.email, address: values.address, city: values.city, product_ids: values.product_ids,
      ...(values.username ? { username: values.username, password: values.password } : {}),
    } : type === "engineers" ? { engineer_name: values.engineer_name, mobile: values.mobile || null, email: values.email || null } :
      { product_name: values.product_name_field, description: values.description, client_ids: values.client_ids };
    try {
      if (editing) await api.put(`${config.endpoint}/${editing.id}`, payload);
      else await api.post(config.endpoint, payload);
      showToast(`${config.singular[0].toUpperCase()}${config.singular.slice(1)} ${editing ? "updated" : "added"} successfully.`);
      setModal(false); await load(true);
    } catch (error) { showToast(errorMessage(error), "error"); }
    finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Delete ${row.institution_name || row.engineer_name || row.product_name}? This cannot be undone.`)) return;
    try { await api.delete(`${config.endpoint}/${row.id}`); showToast(`${config.singular} deleted.`); await load(true); }
    catch (error) { showToast(errorMessage(error), "error"); }
  }
  async function showClient(row) {
    setDetail(row);
    try { setClientFeedbacks((await api.get("/feedback", { params: { client_id: row.id } })).data); }
    catch (error) { showToast(errorMessage(error), "error"); }
  }

  return <div className="content-page">
    <div className="page-header"><div><div className="eyebrow page-eyebrow">YOUR SERVICE DIRECTORY <span className="eyebrow-line" /></div>
      <h1>{config.title} <span>& relationships.</span></h1><p>{config.intro}</p></div>
      <button className="btn btn-primary" onClick={() => openModal()}><Plus size={16} /> Add {config.singular}</button></div>
    <div className="master-toolbar panel"><div className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${config.title.toLowerCase()}…`} /></div><span className="result-count">{filtered.length} {config.title.toLowerCase()}</span></div>
    <section className="panel master-panel"><div className="table-scroll">
      {type === "clients" ? <table className="data-table master-table"><thead><tr><th>INSTITUTION</th><th>CONTACT PERSON</th><th>MOBILE / EMAIL</th><th>PRODUCTS</th><th>FEEDBACK</th><th>AVG. RATING</th><th>ACTIONS</th></tr></thead><tbody>
        {filtered.map((row) => { const institutionName = typeof row.institution_name === "string" ? row.institution_name : ""; return <tr key={row.id} className="clickable-row" onClick={() => showClient(row)}><td><div className="institution-cell"><div className="institution-avatar">{institutionName.slice(0, 1) || "?"}</div><div><strong>{institutionName || "Unnamed client"}</strong><small>{row.city || "Institution"}</small></div></div></td>
          <td>{row.contact_person || "—"}</td><td><div className="contact-cell">{row.mobile || "—"}<small>{row.email || "—"}</small></div></td>
          <td><div className="product-chips">{Array.isArray(row.products) && row.products.slice(0, 2).map((p) => <span key={p.id}>{p.product_name}</span>)}{row.products?.length > 2 && <i>+{row.products.length - 2}</i>}</div></td>
          <td><span className="feedback-count">{row.total_feedbacks}</span></td><td>{row.avg_rating ? <span className="rating-pill"><span>★</span> {row.avg_rating}</span> : <span className="not-needed">No ratings</span>}</td>
          <td onClick={(e) => e.stopPropagation()}><div className="row-actions"><button className="icon-btn" onClick={() => showClient(row)} title="View feedback"><Eye size={16} /></button><button className="icon-btn" onClick={() => openModal(row)} title="Edit client"><Pencil size={15} /></button><button className="icon-btn danger-icon" onClick={() => remove(row)} title="Delete client"><Trash2 size={15} /></button></div></td></tr>; })}
        {filtered.length === 0 && <Empty colspan="7" label="No clients found" />}
      </tbody></table> : type === "engineers" ? <table className="data-table master-table"><thead><tr><th>ENGINEER</th><th>MOBILE</th><th>EMAIL</th><th>FEEDBACK</th><th>ACTIONS</th></tr></thead><tbody>
        {filtered.map((row) => { const name = row.engineer_name || "Unnamed engineer"; return <tr key={row.id}><td><div className="institution-cell"><div className="engineer-avatar">{name.split(/\s+/).map((v) => v[0]).join("")}</div><strong>{name}</strong></div></td><td>{row.mobile || "—"}</td><td>{row.email || "—"}</td><td><span className="feedback-count">{row.feedback_count || 0}</span></td><td><RowActions onEdit={() => openModal(row)} onDelete={() => remove(row)} /></td></tr>; })}
        {filtered.length === 0 && <Empty colspan="5" label="No engineers found" />}
      </tbody></table> : <table className="data-table master-table"><thead><tr><th>PRODUCT</th><th>DESCRIPTION</th><th>CLIENTS USING</th><th>ACTIONS</th></tr></thead><tbody>
        {filtered.map((row) => <tr key={row.id}><td><div className="product-name-cell"><div className="product-dot"><span /></div><strong>{row.product_name}</strong></div></td><td className="description-cell">{row.description || "—"}</td><td><span className="feedback-count">{row.client_count || "—"}</span></td><td><RowActions onEdit={() => openModal(row)} onDelete={() => remove(row)} /></td></tr>)}
        {filtered.length === 0 && <Empty colspan="4" label="No products found" />}
      </tbody></table>}
    </div><div className="table-footer"><span>Showing <strong>{filtered.length}</strong> {config.title.toLowerCase()}</span><span>Managed by your team</span></div></section>
    <AnimatePresence>{modal && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setModal(false); }}><motion.form className="master-modal" onSubmit={save} initial={{ opacity: 0, y: 12, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10 }}>
      <div className="modal-heading"><div><span className="drawer-kicker">DIRECTORY MANAGEMENT</span><h2>{editing ? "Edit" : "Add"} {config.singular}</h2></div><button type="button" className="icon-btn" onClick={() => setModal(false)} aria-label="Close"><X size={18} /></button></div>
      <div className="modal-fields">
        {type === "clients" && <>
          <ModalField label="Institution name"><input required value={values.institution_name} onChange={(e) => setValues({ ...values, institution_name: e.target.value })} placeholder="e.g. Biyani School" /></ModalField>
          <ModalField label="Contact person"><input required value={values.contact_person} onChange={(e) => setValues({ ...values, contact_person: e.target.value })} placeholder="Full name" /></ModalField>
          <ModalField label="Mobile number"><input required value={values.mobile} onChange={(e) => setValues({ ...values, mobile: e.target.value })} placeholder="+91 98765 43210" /></ModalField>
          <ModalField label="Email address"><input required type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} placeholder="contact@institution.edu" /></ModalField>
          <ModalField label="City"><input value={values.city} onChange={(e) => setValues({ ...values, city: e.target.value })} placeholder="City" /></ModalField>
          <ModalField label="Address"><input value={values.address} onChange={(e) => setValues({ ...values, address: e.target.value })} placeholder="Street, area, city" /></ModalField>
          <ModalField label="Linked products"><div className="check-options">{products.map((product) => <label key={product.id}><input type="checkbox" checked={values.product_ids.includes(product.id)} onChange={(e) => setValues({ ...values, product_ids: e.target.checked ? [...values.product_ids, product.id] : values.product_ids.filter((id) => id !== product.id) })} />{product.product_name}</label>)}</div></ModalField>
          {!editing && <div className="modal-login-details"><h4>Client portal access <span>OPTIONAL</span></h4><div className="modal-two"><ModalField label="Username"><input value={values.username} onChange={(e) => setValues({ ...values, username: e.target.value })} placeholder="Portal username" /></ModalField><ModalField label="Temporary password"><input minLength="8" type="password" value={values.password} onChange={(e) => setValues({ ...values, password: e.target.value })} placeholder="At least 8 characters" /></ModalField></div><small>Leave blank to add portal access later.</small></div>}
        </>}
        {type === "engineers" && <><ModalField label="Engineer name"><input required value={values.engineer_name} onChange={(e) => setValues({ ...values, engineer_name: e.target.value })} placeholder="Full name" /></ModalField><ModalField label="Mobile number"><input value={values.mobile} onChange={(e) => setValues({ ...values, mobile: e.target.value })} placeholder="+91 98765 43210" /></ModalField><ModalField label="Email address"><input type="email" value={values.email} onChange={(e) => setValues({ ...values, email: e.target.value })} placeholder="engineer@biyani.com" /></ModalField></>}
        {type === "products" && <><ModalField label="Product name"><input required value={values.product_name_field} onChange={(e) => setValues({ ...values, product_name_field: e.target.value })} placeholder="e.g. Attendance System" /></ModalField><ModalField label="Description"><textarea value={values.description} onChange={(e) => setValues({ ...values, description: e.target.value })} rows="3" placeholder="What does this product help clients do?" /></ModalField><ModalField label="Available to clients"><div className="check-options">{rows.filter((row) => type !== "clients").map(() => null)}{products.length ? <span className="field-hint">Link products to clients from the Clients page.</span> : <span className="field-hint">Add clients before linking products.</span>}</div></ModalField></>}
      </div>
      <div className="modal-actions"><button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? <span className="spinner" /> : <><Check size={15} /> {editing ? "Save changes" : `Add ${config.singular}`}</>}</button></div>
    </motion.form></div>}</AnimatePresence>
    <AnimatePresence>{detail && <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setDetail(null); }}><motion.section className="client-detail-modal" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
      <div className="modal-heading"><button className="icon-btn back-icon" onClick={() => setDetail(null)}><ArrowLeft size={18} /></button><div><span className="drawer-kicker">CLIENT RELATIONSHIP</span><h2>{detail.institution_name}</h2></div><button className="icon-btn" onClick={() => setDetail(null)}><X size={18} /></button></div>
      <div className="client-detail-contact"><span><Mail size={14} /> {detail.email}</span><span><MapPin size={14} /> {detail.city || "—"}</span><span>{detail.mobile}</span></div>
      <div className="detail-stat-row"><div><strong>{detail.total_feedbacks}</strong><span>Feedback entries</span></div><div><strong>{detail.avg_rating ? `★ ${detail.avg_rating}` : "—"}</strong><span>Average satisfaction</span></div><div><strong>{detail.last_feedback_date || "—"}</strong><span>Last feedback</span></div></div>
      <h3 className="detail-list-title">Feedback history <span>{clientFeedbacks.length}</span></h3>
      <div className="client-detail-list">{clientFeedbacks.map((item) => <div className="detail-feedback-item" key={item.id}><div><strong>{item.product_software_name}</strong><span>{item.type_of_service} · {item.date_of_service}</span></div><span className="detail-rating">★ {item.overall_satisfaction}.0</span><span className={`status-badge status-${item.feedback_status.toLowerCase().replace(" ", "-")}`}>{item.feedback_status}</span><ChevronRight size={15} /></div>)}
        {!clientFeedbacks.length && <div className="empty-row">No feedback history for this client yet.</div>}</div>
      <button className="btn btn-outline detail-done" onClick={() => setDetail(null)}>Done</button>
    </motion.section></div>}</AnimatePresence>
    <Toast toast={toast} onClose={clearToast} />
  </div>;
}
function RowActions({ onEdit, onDelete }) { return <div className="row-actions"><button className="icon-btn" onClick={onEdit} title="Edit"><Pencil size={15} /></button><button className="icon-btn danger-icon" onClick={onDelete} title="Delete"><Trash2 size={15} /></button></div>; }
function ModalField({ label, children }) { return <label className="form-field"><span className="field-label">{label}</span>{children}</label>; }
function Empty({ colspan, label }) { return <tr><td colSpan={colspan} className="empty-row"><Building2 size={21} /><strong>{label}</strong><span>Add a record or try another search.</span></td></tr>; }
