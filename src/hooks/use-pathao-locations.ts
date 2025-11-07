import { useState, useEffect, useCallback } from "react";
import { getValidPathaoToken } from "@/utils/pathao-token";

interface City {
  city_id: number;
  city_name: string;
}

interface Zone {
  zone_id: number;
  zone_name: string;
}

interface Area {
  area_id: number;
  area_name: string;
}

export function usePathaoLocations() {
  const [cities, setCities] = useState<City[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch cities
  const fetchCities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = await getValidPathaoToken();
      if (!token) {
        throw new Error("No valid Pathao token. Please generate a token first.");
      }

      const response = await fetch("/api/pathao/city-list", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(errorData.error || "Failed to fetch cities");
      }

      const data = await response.json();
      if (data.code === 200 && data.data?.data) {
        setCities(data.data.data);
      } else {
        throw new Error(data.message || "Failed to fetch cities");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch cities";
      setError(errorMessage);
      console.error("Error fetching cities:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch zones for a city
  const fetchZones = useCallback(async (cityId: number) => {
    if (!cityId) {
      setZones([]);
      setAreas([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getValidPathaoToken();
      if (!token) {
        throw new Error("No valid Pathao token. Please generate a token first.");
      }

      const response = await fetch(`/api/pathao/zone-list?city_id=${cityId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(errorData.error || "Failed to fetch zones");
      }

      const data = await response.json();
      if (data.code === 200 && data.data?.data) {
        setZones(data.data.data);
        setAreas([]); // Clear areas when city changes
      } else {
        throw new Error(data.message || "Failed to fetch zones");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch zones";
      setError(errorMessage);
      console.error("Error fetching zones:", err);
      setZones([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch areas for a zone
  const fetchAreas = useCallback(async (zoneId: number) => {
    if (!zoneId) {
      setAreas([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getValidPathaoToken();
      if (!token) {
        throw new Error("No valid Pathao token. Please generate a token first.");
      }

      const response = await fetch(`/api/pathao/area-list?zone_id=${zoneId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(errorData.error || "Failed to fetch areas");
      }

      const data = await response.json();
      if (data.code === 200 && data.data?.data) {
        setAreas(data.data.data);
      } else {
        throw new Error(data.message || "Failed to fetch areas");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch areas";
      setError(errorMessage);
      console.error("Error fetching areas:", err);
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load cities on mount
  useEffect(() => {
    fetchCities();
  }, [fetchCities]);

  return {
    cities,
    zones,
    areas,
    loading,
    error,
    fetchCities,
    fetchZones,
    fetchAreas,
  };
}

