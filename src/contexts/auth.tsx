import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/router";
import { UserRole } from "@/types";

// Helper function to set cookie
function setCookie(name: string, value: string, days: number = 7) {
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
}

// Helper function to get cookie
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Helper function to delete cookie
function deleteCookie(name: string) {
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userRole: UserRole | null;
  login: (role: UserRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userRole: null,
  login: () => {},
  logout: () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Initialize auth state from cookies and localStorage on mount
  useEffect(() => {
    // Check cookie first (for server-side middleware), then localStorage (for client-side)
    const cookieRole = getCookie("userRole");
    const storedRole = localStorage.getItem("userRole") || cookieRole;
    
    if (storedRole && (storedRole === "admin" || storedRole === "moderator")) {
      const role = storedRole as UserRole;
      setIsAuthenticated(true);
      setUserRole(role);
      // Sync cookie and localStorage
      if (!cookieRole) {
        setCookie("userRole", role);
      }
      if (!localStorage.getItem("userRole")) {
        localStorage.setItem("userRole", role);
      }
    }
  }, []);

  // Handle route protection (middleware handles most of this, but keep client-side check)
  useEffect(() => {
    const publicPaths = ["/", "/track"];
    const isPublicPath = publicPaths.some((path) => router.pathname === path || router.pathname.startsWith(path + "/"));

    if (!isAuthenticated && !isPublicPath) {
      router.push("/");
    }
  }, [isAuthenticated, router.pathname, router]);

  const login = (role: UserRole) => {
    setIsAuthenticated(true);
    setUserRole(role);
    // Set both cookie (for middleware) and localStorage (for client-side)
    setCookie("userRole", role);
    localStorage.setItem("userRole", role);
    router.push("/orders");
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUserRole(null);
    // Remove both cookie and localStorage
    deleteCookie("userRole");
    localStorage.removeItem("userRole");
    router.push("/");
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userRole,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
