import {useState} from "react";
import {useNavigate} from "react-router-dom";
import api from "../services/api";
import {AuthContext} from "./auth-context";

const storedUser = () => {
  try {
    return JSON.parse(sessionStorage.getItem("user_profile")) || null;
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
      const loggedUser = data.data.user;
      sessionStorage.setItem("user_token", data.data.token);
      sessionStorage.setItem("user_profile", JSON.stringify(loggedUser));
      setUser(loggedUser);
      navigate("/", {replace: true});
    } finally {
      setLoading(false);
    }
  };
  const register = async (payload) => {
    setLoading(true);
    try {
      await api.post("/auth/register", payload);
      await login({identifier: payload.email, password: payload.password});
    } finally {
      setLoading(false);
    }
  };
  const logout = () => {
    sessionStorage.clear();
    setUser(null);
    navigate("/", {replace: true});
  };
  const updateUser = (nextUser) => {
    sessionStorage.setItem("user_profile", JSON.stringify(nextUser));
    setUser(nextUser);
  };
  return (
    <AuthContext.Provider
      value={{user, loading, login, register, logout, updateUser}}
    >
      {children}
    </AuthContext.Provider>
  );
}
