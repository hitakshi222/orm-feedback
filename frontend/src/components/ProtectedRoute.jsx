import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function ProtectedRoute({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={user.role === "client" ? "/my-feedback" : user.role === "engineer" ? "/engineer" : "/dashboard"} replace />;
  return <Outlet />;
}
