import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, Command, LockKeyhole, Mail, ShieldCheck, Sparkles, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";
import { errorMessage } from "../api";
import { Toast, useToast } from "../components/Toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast, showToast, clearToast } = useToast();
  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(user.role === "client" ? "/my-feedback" : user.role === "engineer" ? "/engineer" : "/dashboard", { replace: true });
    } catch (error) { showToast(errorMessage(error), "error"); }
    finally { setLoading(false); }
  }
  return <div className="login-page">
    <div className="login-brand"><div className="brand-mark"><Command size={20} /></div><span>BIYANI<span>.</span></span><small>TECHNOLOGIES</small></div>
    <div className="login-grid">
      <motion.section className="login-story" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
        <div className="eyebrow"><Sparkles size={14} /> YOUR EXPERIENCE, BETTER</div>
        <h1>Great service<br />starts with <em>listening.</em></h1>
        <p className="story-copy">A thoughtful space to share your experience, track every action, and help us make every service moment better.</p>
        <div className="story-proof"><div className="proof-avatars"><span>NS</span><span>RM</span><span>PS</span><span>+2k</span></div>
          <div><div className="proof-stars">★★★★★ <span>4.9</span></div><small>trusted by teams like yours</small></div></div>
        <div className="floating-review"><div className="review-icon"><Check size={15} /></div>
          <div><strong>Feedback that moves things forward</strong><small>Every response gets a real follow-up</small></div><ArrowRight size={15} />
        </div>
      </motion.section>
      <motion.section className="login-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .08 }}>
        <div className="login-card-top"><div className="login-icon"><ShieldCheck size={19} /></div><span>SECURE CLIENT PORTAL</span></div>
        <h2>Welcome back</h2><p>Sign in to your Biyani workspace.</p>
        <form onSubmit={submit} className="login-form">
          <label>Email address</label><div className="input-icon-wrap"><Mail size={17} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" required autoComplete="username" /></div>
          <div className="label-row"><label>Password</label><span className="secure-note"><LockKeyhole size={12} /> Encrypted</span></div>
          <div className="input-icon-wrap"><LockKeyhole size={17} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" /></div>
          <button className="btn btn-primary login-submit" disabled={loading}>{loading ? <span className="spinner" /> : <>Sign in to workspace <ArrowRight size={16} /></>}</button>
        </form>
        <div className="login-foot"><span><LockKeyhole size={13} /> Your data is private and secure</span><span>v1.0</span></div>
      </motion.section>
    </div>
    <footer className="login-footer"><span>© 2026 Biyani Technologies</span><span><Star size={12} fill="currentColor" /> Thoughtful technology. Better outcomes.</span><a href="mailto:support@biyani.com">Need help?</a></footer>
    <Toast toast={toast} onClose={clearToast} />
  </div>;
}
