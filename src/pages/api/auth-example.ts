// Example API route showing how to use authentication utilities
import type { NextApiRequest, NextApiResponse } from "next";
import { getUserRoleFromCookie, isAuthenticated, hasRole } from "@/utils/auth-api";

type Data = {
  message: string;
  userRole?: string;
  isAdmin?: boolean;
};

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Example 1: Check if user is authenticated
  if (!isAuthenticated(req)) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Example 2: Get user role
  const userRole = getUserRoleFromCookie(req);

  // Example 3: Check for specific role
  if (!hasRole(req, "admin")) {
    return res.status(403).json({ 
      message: "Forbidden - Admin access required",
      userRole: userRole || undefined,
    });
  }

  // If all checks pass
  res.status(200).json({ 
    message: "Success",
    userRole: userRole || undefined,
    isAdmin: userRole === "admin"
  });
}

