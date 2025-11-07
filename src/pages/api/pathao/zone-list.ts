import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { city_id } = req.query;

  if (!city_id || typeof city_id !== "string") {
    return res.status(400).json({ error: "city_id is required" });
  }

  // Get token from Authorization header
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ error: "Authorization token required" });
  }

  try {
    const pathaoBaseUrl =
      process.env.PATHAO_BASE_URL || "https://api-hermes.pathao.com";

    const response = await fetch(
      `${pathaoBaseUrl}/aladdin/api/v1/cities/${city_id}/zone-list`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP error! status: ${response.status}`,
      }));
      return res.status(response.status).json(errorData);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Pathao zone list API error:", error);
    return res.status(500).json({
      error: "Failed to fetch zone list",
      details:
        process.env.NODE_ENV === "development" ? String(error) : undefined,
    });
  }
}

