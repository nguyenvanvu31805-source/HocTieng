import {Navigate, Outlet, useLocation} from "react-router-dom";
import {useAuth} from "../context/useAuth";

export default function ProtectedRoute() {
  const {user} = useAuth();
  const location = useLocation();
  if (!user || user.role !== "ADMIN") {
    return <Navigate to="/login" replace state={{from: location}} />;
  }
  return <Outlet />;
}
