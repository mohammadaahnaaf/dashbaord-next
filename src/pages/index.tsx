"use client";

import { useState } from "react";
import { UserRole } from "@/types";
import { Button } from "@/components/ui";
import { useAuth } from "@/contexts";

export default function LoginPage() {
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      login(selectedRole);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Dashboard
          </h2>
        </div>
        <div className="mt-8 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Select Role
              </label>
              <div className="mt-2 space-y-2">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="role"
                    value="admin"
                    checked={selectedRole === "admin"}
                    onChange={(e) =>
                      setSelectedRole(e.target.value as UserRole)
                    }
                  />
                  <span className="ml-2">Admin</span>
                </label>
                <br />
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    className="form-radio"
                    name="role"
                    value="moderator"
                    checked={selectedRole === "moderator"}
                    onChange={(e) =>
                      setSelectedRole(e.target.value as UserRole)
                    }
                  />
                  <span className="ml-2">Moderator</span>
                </label>
              </div>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            loading={isLoading}
            className="w-full"
            size="lg"
          >
            Sign in
          </Button>
        </div>
      </div>
    </div>
  );
}
