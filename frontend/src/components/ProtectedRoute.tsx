import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  // Check if session was restored or exists in sessionStorage to prevent bounce during transition
  const hasStoredSession = Boolean(sessionStorage.getItem("sophia_auth"));

  if (!isAuthenticated && !hasStoredSession) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}