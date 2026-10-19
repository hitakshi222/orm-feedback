import { createContext, useContext, useMemo, useState } from "react";
import api from "../api";

const AuthContext = createContext(null);
const storedUser = () => {
  try { return JSON.parse(localStorage.getItem("biyani_user") || "null"); } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(storedUser);

  async function login(email, password) {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("biyani_token", data.access_token);
    localStorage.setItem("biyani_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem("biyani_token");
    localStorage.removeItem("biyani_user");
    setUser(null);
  }

  const value = useMemo(() => ({ user, login, logout }), [user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
