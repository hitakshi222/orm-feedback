import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarDays, CircleHelp, Download, MessageSquareText, RefreshCw, Search, Star, TrendingUp, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api, { errorMessage } from "../api";
import { Toast, useToast } from "../components/Toast";

const today = new Date().toISOString().slice(0, 10);
const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
const palette = ["#3e876e", "#88b39e", "#e5b56b", "#df896d", "#bd5b51"];
const initialFilters = { date_from: monthStart, date_to: today, client_id: "", product: "", engineer_id: "", status: "", priority: "", search: "" };

function queryString(filters) {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ""));
}
function Stars({ value }) { return <span className="table-stars">{"★".repeat(value || 0)}<span>{"★".repeat(5 - (value || 0))}</span></span>; }
function ChartCard({ title, caption, children, className = "" }) {
  return <section className={`panel chart-card ${className}`}><div className="panel-heading"><div><h3>{title}</h3><p>{caption}</p></div><button className="icon-btn muted-icon" aria-label="Chart information"><CircleHelp size={16} /></button></div>{children}</section>;
}

export default function Dashboard() {
  const [filters, setFilters] = useState(initialFilters);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const { toast, showToast, clearToast } = useToast();
  const params = useMemo(() => queryString(filters), [filters]);

  useEffect(() => {
    Promise.all([api.get("/clients"), api.get("/products"), api.get("/engineers")])
      .then(([c, p, e]) => { setClients(c.data); setProducts(p.data); setEngineers(e.data); })
      .catch((error) => showToast(errorMessage(error), "error"));
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.get("/dashboard/kpis", { params }),
      api.get("/dashboard/charts/quality", { params }),
      api.get("/dashboard/charts/satisfaction", { params }),
      api.get("/dashboard/charts/nps", { params }),
      api.get("/dashboard/charts/service-type", { params }),
      api.get("/dashboard/charts/engineer-performance", { params }),
      api.get("/feedback", { params }),
    ]).then((results) => {
      if (active) setData({ kpis: results[0].data, quality: results[1].data, satisfaction: results[2].data,
        nps: results[3].data, service: results[4].data, engineers: results[5].data, feedback: results[6].data });
    }).catch((error) => showToast(errorMessage(error), "error")).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setFilter("search", searchInput), 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  function setFilter(key, value) { setFilters((current) => ({ ...current, [key]: value })); }
  const npsTotal = data?.nps.reduce((sum, item) => sum + item.count, 0) || 0;
  const promoters = data?.nps.find((item) => item.category === "Promoter")?.count || 0;
  const passives = data?.nps.find((item) => item.category === "Passive")?.count || 0;
  const detractors = data?.nps.find((item) => item.category === "Detractor")?.count || 0;
  const nps = npsTotal ? Math.round((promoters - detractors) / npsTotal * 100) : 0;

  return <div className="dashboard-page">
    <div className="page-header"><div><div className="eyebrow page-eyebrow">CLIENT EXPERIENCE <span className="eyebrow-line" /></div>
      <h1>Good morning, <span>team.</span></h1><p>Here's how your clients are feeling about the service you deliver.</p></div>
      <div className="header-actions"><div className="updated-note"><span className="pulse-dot" /> Live insights</div>
        <button className="btn btn-outline" onClick={() => window.print()}><Download size={15} /> Export report</button></div></div>

    <section className="filter-panel">
      <div className="filter-title"><div className="filter-symbol"><CalendarDays size={16} /></div><div><strong>Explore feedback</strong><small>Refine insights by what matters</small></div></div>
      <div className="filter-controls">
        <label className="filter-field"><span>From</span><input type="date" value={filters.date_from} onChange={(e) => setFilter("date_from", e.target.value)} /></label>
        <label className="filter-field"><span>To</span><input type="date" value={filters.date_to} onChange={(e) => setFilter("date_to", e.target.value)} /></label>
        <label className="filter-field"><span>Client</span><select value={filters.client_id} onChange={(e) => setFilter("client_id", e.target.value)}><option value="">All clients</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.institution_name}</option>)}</select></label>
        <label className="filter-field"><span>Product</span><select value={filters.product} onChange={(e) => setFilter("product", e.target.value)}><option value="">All products</option>{products.map((product) => <option key={product.id}>{product.product_name}</option>)}</select></label>
        <label className="filter-field"><span>Engineer</span><select value={filters.engineer_id} onChange={(e) => setFilter("engineer_id", e.target.value)}><option value="">All engineers</option>{engineers.map((eng) => <option key={eng.id} value={eng.id}>{eng.engineer_name}</option>)}</select></label>
        <label className="filter-field"><span>Status</span><select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}><option value="">Any status</option>{["Submitted", "Reviewed", "Action Taken", "Closed"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="filter-field"><span>Priority</span><select value={filters.priority} onChange={(e) => setFilter("priority", e.target.value)}><option value="">Any priority</option>{["High", "Medium", "Low"].map((x) => <option key={x}>{x}</option>)}</select></label>
        <label className="filter-field dashboard-search"><span>Search</span><div><Search size={13} /><input type="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Client, product, ticket…" /></div></label>
      </div>
      <button className="filter-reset" onClick={() => { setFilters(initialFilters); setSearchInput(""); }}><RefreshCw size={13} /> Reset</button>
    </section>

    <div className="kpi-grid">
      <Kpi icon={MessageSquareText} label="Feedback this month" value={data?.kpis.total_feedbacks ?? "—"} trend="Every voice counts" color="green" />
      <Kpi icon={Star} label="Average service quality" value={`${data?.kpis.avg_quality ?? "—"}${data ? "/5" : ""}`} trend="Across all responses" color="amber" />
      <Kpi icon={TrendingUp} label="Client satisfaction" value={`${data?.kpis.avg_satisfaction ?? "—"}${data ? "/5" : ""}`} trend="Overall experience" color="blue" />
      <Kpi icon={UsersRound} label="Follow-ups to close" value={data?.kpis.pending_follow_ups ?? "—"} trend="Clients awaiting action" color="rose" />
    </div>

    <div className="charts-grid">
      <ChartCard title="Quality, in their words" caption="How many clients believe in quality"><ChartFrame loading={loading} empty={!data?.quality.length}>
        <ResponsiveContainer width="100%" height="100%"><BarChart data={[1,2,3,4,5].map((rating) => ({ rating: `${rating} star`, count: data?.quality.find((row) => row.rating === rating)?.count || 0 }))} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#edf0ec" /><XAxis dataKey="rating" axisLine={false} tickLine={false} tick={{ fill: "#929991", fontSize: 11 }} /><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#929991", fontSize: 11 }} />
          <Tooltip cursor={{ fill: "#f5f8f5" }} contentStyle={{ borderRadius: 12, border: "1px solid #e7ebe5", boxShadow: "0 8px 24px #18221a12" }} />
          <Bar dataKey="count" name="Feedback" radius={[6,6,0,0]}>{[1,2,3,4,5].map((n) => <Cell key={n} fill={palette[n-1]} />)}</Bar></BarChart></ResponsiveContainer>
      </ChartFrame></ChartCard>

      <ChartCard title="Satisfaction snapshot" caption="Ratings across every service visit"><ChartFrame loading={loading} empty={!data?.satisfaction.length}>
        <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={[1,2,3,4,5].map((rating) => ({ name: `${rating} star${rating > 1 ? "s" : ""}`, value: data?.satisfaction.find((row) => row.rating === rating)?.count || 0 }))} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius="62%" outerRadius="90%" paddingAngle={4} stroke="none">{palette.map((color) => <Cell key={color} fill={color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
          <div className="donut-center"><strong>{data?.kpis.avg_satisfaction || "—"}</strong><span>out of 5</span></div></div>
        <div className="legend-list">{[5,4,3,2,1].map((rating) => <div key={rating}><span><i style={{ background: palette[rating-1] }} />{rating} star{rating>1?"s":""}</span><b>{data?.satisfaction.find((row) => row.rating === rating)?.count || 0}</b></div>)}</div>
      </ChartFrame></ChartCard>

      <ChartCard title="Would they recommend us?" caption="A pulse on client advocacy"><ChartFrame loading={loading} empty={!npsTotal}>
        <div className="nps-score"><span>YOUR NPS</span><strong>{nps > 0 ? "+" : ""}{nps}</strong><small>{nps >= 50 ? "Excellent momentum" : nps >= 0 ? "Room to delight" : "Needs attention"}</small></div>
        <div className="nps-meter"><i style={{ width: `${Math.max(0, Math.min(100, (nps+100)/2))}%` }} /></div>
        <div className="nps-legend"><span><i className="dot-green" /> Promoters <b>{promoters}</b></span><span><i className="dot-amber" /> Passive <b>{passives}</b></span><span><i className="dot-rose" /> Detractors <b>{detractors}</b></span></div>
      </ChartFrame></ChartCard>

      <ChartCard title="Service experience" caption="Average satisfaction by service type"><ChartFrame loading={loading} empty={!data?.service.length}>
        <ResponsiveContainer width="100%" height="100%"><LineChart data={data?.service || []} margin={{ top: 10, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#edf0ec" /><XAxis dataKey="service_type" axisLine={false} tickLine={false} tick={{ fill: "#929991", fontSize: 10 }} /><YAxis domain={[0,5]} axisLine={false} tickLine={false} tick={{ fill: "#929991", fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e7ebe5" }} /><Line type="monotone" dataKey="avg_satisfaction" name="Satisfaction" stroke="#3e876e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} /></LineChart></ResponsiveContainer>
      </ChartFrame></ChartCard>
    </div>
    <section className="panel performance-panel">
      <div className="panel-heading"><div><h3>People behind the experience</h3><p>Engineer performance based on client feedback</p></div><span className="data-label">{data?.engineers.length || 0} ENGINEERS</span></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>ENGINEER</th><th>FEEDBACK</th><th>PUNCTUALITY</th><th>BEHAVIOUR</th><th>TECHNICAL KNOW-HOW</th></tr></thead><tbody>
        {data?.engineers.map((row, index) => <tr key={row.engineer_name}><td><div className="engineer-cell"><div className={`avatar avatar-${index % 3}`}>{row.engineer_name.split(" ").map((s) => s[0]).join("")}</div><strong>{row.engineer_name}</strong></div></td><td>{row.total_feedbacks} <span className="subtle">reviews</span></td><td><div className="percent-cell"><span>{row.punctual_percent}%</span><div className="mini-progress"><i style={{ width: `${row.punctual_percent}%` }} /></div></div></td><td><Stars value={Math.round(row.avg_behaviour)} /><small>{row.avg_behaviour}/5</small></td><td><Stars value={Math.round(row.avg_technical_knowledge)} /><small>{row.avg_technical_knowledge}/5</small></td></tr>)}
        {!data?.engineers.length && <tr><td colSpan="5" className="empty-row">No engineer feedback matches these filters.</td></tr>}
      </tbody></table></div>
    </section>
    <section className="panel recent-panel"><div className="panel-heading"><div><h3>Latest client feedback</h3><p>A quick look at what clients are sharing</p></div><a className="text-link" href="/feedbacks">View all feedback <ArrowUpRight size={14} /></a></div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>CLIENT / DATE</th><th>PRODUCT</th><th>ENGINEER</th><th>QUALITY</th><th>SATISFACTION</th><th>STATUS</th></tr></thead><tbody>
        {data?.feedback.slice(0, 5).map((row) => <tr key={row.id}><td><strong>{row.client_name}</strong><small className="cell-sub">{row.date_of_service}</small></td><td>{row.product_software_name}</td><td>{row.support_engineer_name}</td><td><Stars value={row.quality_of_service} /></td><td><Stars value={row.overall_satisfaction} /></td><td><span className={`status-badge status-${row.feedback_status.toLowerCase().replace(" ", "-")}`}>{row.feedback_status}</span></td></tr>)}
      </tbody></table></div>
    </section>
    <Toast toast={toast} onClose={clearToast} />
  </div>;
}

function Kpi({ icon: Icon, label, value, trend, color }) {
  return <motion.div className="panel kpi-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
    <div className={`kpi-icon kpi-${color}`}><Icon size={18} /></div><span className="kpi-label">{label}</span>
    <strong className="kpi-value">{value}</strong><div className="kpi-foot"><span className="kpi-trend"><ArrowUpRight size={13} /> {trend}</span><span className="kpi-period">THIS PERIOD</span></div>
  </motion.div>;
}
function ChartFrame({ loading, empty, children }) {
  if (loading) return <div className="chart-state"><span className="spinner spinner-dark" /></div>;
  if (empty) return <div className="chart-state chart-empty"><span>No feedback data for this period</span></div>;
  return <div className="chart-content">{children}</div>;
}
