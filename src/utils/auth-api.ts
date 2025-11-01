import type { NextApiRequest } from "next";
import { UserRole } from "@/types";

/**
 * Get user role from cookie in API routes
 */
export function getUserRoleFromCookie(req: NextApiRequest): UserRole | null {
  const userRole = req.cookies.userRole;
  if (userRole === "admin" || userRole === "moderator") {
    return userRole as UserRole;
  }
  return null;
}

/**
 * Check if user is authenticated in API routes
 */
export function isAuthenticated(req: NextApiRequest): boolean {
  return getUserRoleFromCookie(req) !== null;
}

/**
 * Check if user has required role in API routes
 */
export function hasRole(req: NextApiRequest, requiredRole: UserRole | UserRole[]): boolean {
  const userRole = getUserRoleFromCookie(req);
  if (!userRole) return false;
  
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }
  return userRole === requiredRole;
}

