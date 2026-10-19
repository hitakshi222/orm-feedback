import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, X, XCircle } from "lucide-react";

export function Toast({ toast, onClose }) {
  return (
    <AnimatePresence>
      {toast && <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
        className={`toast ${toast.type === "error" ? "toast-error" : ""}`} role="status">
        {toast.type === "error" ? <XCircle size={18} /> : <CheckCircle2 size={18} />}
        <span>{toast.message}</span><button onClick={onClose} aria-label="Dismiss notification"><X size={16} /></button>
      </motion.div>}
    </AnimatePresence>
  );
}

export function useToast() {
  const [toast, setToast] = React.useState(null);
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    window.setTimeout(() => setToast(null), 3600);
  };
  return { toast, showToast, clearToast: () => setToast(null) };
}

import React from "react";
