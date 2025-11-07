/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { UserRole } from "@/types";
import { Button, Input } from "@/components/ui";
import { useAuth } from "@/contexts";
import axios from "axios";
import { storePathaoTokens } from "@/utils/pathao-token";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("admin");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [pathaoLoading, setPathaoLoading] = useState(false);

  async function getPathaoToken() {
    try {
      setPathaoLoading(true);
      const response = await axios.post("/api/pathao/issue-token", {
        client_id: process.env.NEXT_PUBLIC_PATHAO_CLIENT_ID,
        client_secret: process.env.NEXT_PUBLIC_PATHAO_CLIENT_SECRET,
        grant_type: "password",
        username: "anamulhoquerafi118399@gmail.com",
        password: "Test@11",
      });
      setPathaoLoading(false);

      // Store tokens with expiry information
      storePathaoTokens({
        token_type: response.data.token_type || "Bearer",
        expires_in: response.data.expires_in || 432000,
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
      });

      alert("Pathao token generated successfully");
    } catch (error: any) {
      setPathaoLoading(false);
      console.error(error);
      alert(
        error.response?.data?.error ||
          error.message ||
          "Failed to get Pathao token"
      );
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    try {
      await getPathaoToken();
      await login(email, password, selectedRole);
    } catch (err: any) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill for demo
  const fillDefaultCredentials = (role: UserRole) => {
    setSelectedRole(role);
    if (role === "admin") {
      setEmail("admin@example.com");
    } else {
      setEmail("moderator@example.com");
    }
    setPassword("admin123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Use default credentials for demo
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div>
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Select Role
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    name="role"
                    value="admin"
                    checked={selectedRole === "admin"}
                    onChange={(e) => {
                      const role = e.target.value as UserRole;
                      setSelectedRole(role);
                      fillDefaultCredentials(role);
                    }}
                  />
                  <span className="text-sm text-gray-700">Admin</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    className="form-radio h-4 w-4 text-blue-600"
                    name="role"
                    value="moderator"
                    checked={selectedRole === "moderator"}
                    onChange={(e) => {
                      const role = e.target.value as UserRole;
                      setSelectedRole(role);
                      fillDefaultCredentials(role);
                    }}
                  />
                  <span className="text-sm text-gray-700">Moderator</span>
                </label>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => fillDefaultCredentials("admin")}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Fill Admin Credentials
                </button>
                <span className="text-xs text-gray-400">|</span>
                <button
                  type="button"
                  onClick={() => fillDefaultCredentials("moderator")}
                  className="text-xs text-blue-600 hover:text-blue-700 underline"
                >
                  Fill Moderator Credentials
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          <Button
            type="submit"
            loading={isLoading}
            className="w-full"
            size="lg"
          >
            Sign in
          </Button>
        </form>
      </div>
    </div>
  );
}
