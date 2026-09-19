import {useState} from "react";
import {useNavigate} from "react-router-dom";
import api from "../services/api";
import {AuthContext} from "./auth-context";

const storedUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("admin_user")) || null;
  } catch {
    return null;
  }
};

export function AuthProvider({children}) {
  const navigate = useNavigate();
  const [user, setUser] = useState(storedUser);
  const [loading, setLoading] = useState(false);

  const login = async (credentials) => {
    setLoading(true);
    try {
      const {data} = await api.post("/auth/login", credentials);
      const loggedInUser = data.data.user;
      if (loggedInUser.role !== "ADMIN") {
        throw new Error("Tài khoản này không có quyền truy cập Admin Web.");
      }
      sessionStorage.setItem("admin_token", data.data.token);
      sessionStorage.setItem("admin_user", JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      navigate("/dashboard", {replace: true});
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.clear();
    setUser(null);
    navigate("/login", {replace: true});
  };

  return (
    <AuthContext.Provider value={{user, loading, login, logout}}>
      {children}
    </AuthContext.Provider>
  );
}
