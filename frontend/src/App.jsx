import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Masters from "./pages/Masters";
import { useAuth } from "./state/AuthContext";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Feedbacks = lazy(() => import("./pages/Feedbacks"));
const FeedbackForm = lazy(() => import("./pages/FeedbackForm"));
const ClientHome = lazy(() => import("./pages/ClientHome"));
const EngineerHome = lazy(() => import("./pages/EngineerHome"));
export default function App() {
  const { user } = useAuth();
  const home = user?.role === "client" ? "/my-feedback" : user?.role === "engineer" ? "/engineer" : "/dashboard";
  return <Suspense fallback={<div className="route-loading"><span className="spinner spinner-dark" /> Loading your workspace…</div>}><Routes>
    <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<Shell />}>
        <Route index element={<Navigate to={home} replace />} />
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="dashboard" element={<Dashboard />} />
        </Route>
        <Route element={<ProtectedRoute roles={["admin", "engineer"]} />}>
          <Route path="feedbacks" element={<Feedbacks />} />
        </Route>
        <Route element={<ProtectedRoute roles={["engineer"]} />}>
          <Route path="engineer" element={<EngineerHome />} />
        </Route>
        <Route element={<ProtectedRoute roles={["admin"]} />}>
          <Route path="clients" element={<Masters type="clients" />} />
          <Route path="engineers" element={<Masters type="engineers" />} />
          <Route path="products" element={<Masters type="products" />} />
        </Route>
        <Route element={<ProtectedRoute roles={["client"]} />}>
          <Route path="my-feedback" element={<ClientHome />} />
          <Route path="new-feedback" element={<FeedbackForm />} />
        </Route>
      </Route>
    </Route>
    <Route path="*" element={<Navigate to={home} replace />} />
  </Routes></Suspense>;
}
