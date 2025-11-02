import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    client_id,
    client_secret,
    grant_type,
    username,
    password,
  } = req.body;

  // Validate required fields
  if (!client_id || !client_secret || !grant_type || !username || !password) {
    return res.status(400).json({
      error: "Missing required fields: client_id, client_secret, grant_type, username, password",
    });
  }

  try {
    const pathaoBaseUrl =
      process.env.PATHAO_BASE_URL || "https://api-hermes.pathao.com";
    
    const response = await fetch(`${pathaoBaseUrl}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id,
        client_secret,
        grant_type,
        username,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP error! status: ${response.status}`,
      }));
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Pathao token API error:", error);
    return res.status(500).json({
      error: "Failed to get Pathao token",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

