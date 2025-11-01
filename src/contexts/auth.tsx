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
  if (typeof document === "undefined") return null;
  const nameEQ = name + "=";
  const ca = document.cookie.split(";");
  for (let i = 0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === " ") c = c.substring(1, c.length);
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

  // Initialize state from localStorage using lazy initialization
  const getInitialAuthState = (): boolean => {
    if (typeof window === "undefined") return false;
    const storedRole = localStorage.getItem("userRole");
    if (storedRole && (storedRole === "admin" || storedRole === "moderator")) {
      // Sync cookie with localStorage (for server-side middleware compatibility)
      const cookieRole = getCookie("userRole");
      if (!cookieRole) {
        setCookie("userRole", storedRole);
      }
      return true;
    }
    return false;
  };

  const getInitialUserRole = (): UserRole | null => {
    if (typeof window === "undefined") return null;
    const storedRole = localStorage.getItem("userRole");
    if (storedRole && (storedRole === "admin" || storedRole === "moderator")) {
      return storedRole as UserRole;
    }
    return null;
  };

  const [isAuthenticated, setIsAuthenticated] = useState(getInitialAuthState);
  const [userRole, setUserRole] = useState<UserRole | null>(getInitialUserRole);

  // Handle route protection (middleware handles most of this, but keep client-side check)
  useEffect(() => {
    const publicPaths = ["/", "/track"];
    const isPublicPath = publicPaths.some(
      (path) =>
        router.pathname === path || router.pathname.startsWith(path + "/")
    );

    if (!isAuthenticated && !isPublicPath) {
      router.push("/");
    }
  }, [isAuthenticated, router.pathname, router]);

  const login = (role: UserRole) => {
    // Store in localStorage first
    localStorage.setItem("userRole", role);

    // Then update state
    setIsAuthenticated(true);
    setUserRole(role);

    // Also set cookie for middleware compatibility
    setCookie("userRole", role);

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

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

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
