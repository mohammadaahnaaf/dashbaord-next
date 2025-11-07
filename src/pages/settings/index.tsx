"use client";

import { useMemo, useState, useEffect } from "react";
import { Button, Input, Select, Textarea } from "@/components/ui";

import { showToast } from "@/components/utils";
import { Settings } from "@/types";
import { useAuth } from "@/contexts";
import { getValidPathaoToken } from "@/utils/pathao-token";

const parseNonNegativeNumber = (value: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

const cloneSettings = (settings: Settings): Settings => ({
  ...settings,
  deliveryCharges: { ...settings.deliveryCharges },
  packingStatus: { ...settings.packingStatus },
  pathao: { ...settings.pathao },
});

interface PathaoStore {
  store_id: string;
  store_name: string;
  store_address: string;
  is_active: number;
  city_id: string;
  zone_id: string;
  hub_id: string;
  is_default_store: boolean;
  is_default_return_store: boolean;
}

export default function SettingsPage() {
  const { pathaoStoreId, setPathaoStoreId } = useAuth();
  const [formData, setFormData] = useState<Settings>();
  const [isTestingPathao, setIsTestingPathao] = useState(false);
  const [pathaoStores, setPathaoStores] = useState<PathaoStore[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);
  const [storeData, setStoreData] = useState<{
    name: string;
    contact_name: string;
    contact_number: string;
    secondary_contact: string | null;
    otp_number: string;
    address: string;
    city_id: number;
    area_id: number;
    zone_id: number;
  }>({
    name: "Versity Supplies",
    contact_name: "Anamul Hoque Rafi",
    contact_number: "01648859687",
    secondary_contact: null,
    otp_number: "01648859687",
    address: "254, Eden Garden , Road:9,  Block:C, Bashundhara R/A",
    city_id: 1,
    area_id: 195,
    zone_id: 6,
  });

  const packingStatusOptions = useMemo(
    () => [
      { value: "enabled", label: "Enabled" },
      { value: "disabled", label: "Disabled" },
    ],
    []
  );

  const sandboxOptions = useMemo(
    () => [
      { value: "enabled", label: "Enabled" },
      { value: "disabled", label: "Disabled" },
    ],
    []
  );

  const handleTestPathaoConnection = async () => {
    setIsTestingPathao(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast("Pathao connection test successful", "success");
    } catch (error) {
      showToast("Failed to connect to Pathao", "error");
    } finally {
      setIsTestingPathao(false);
    }
  };

  const fetchPathaoStores = async () => {
    setIsLoadingStores(true);
    try {
      const token = await getValidPathaoToken();
      if (!token) {
        showToast(
          "No valid Pathao token. Please generate a token first.",
          "error"
        );
        return;
      }

      const response = await fetch("/api/pathao/stores", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: `HTTP error! status: ${response.status}`,
        }));
        throw new Error(errorData.error || "Failed to fetch stores");
      }

      const data = await response.json();
      if (data.code === 200 && data.data?.data) {
        setPathaoStores(data.data.data);
        // If no store is selected, select the default store or first active store
        if (!pathaoStoreId) {
          const defaultStore =
            data.data.data.find(
              (store: PathaoStore) => store.is_default_store
            ) ||
            data.data.data.find((store: PathaoStore) => store.is_active === 1);
          if (defaultStore) {
            setPathaoStoreId(defaultStore.store_id);
          }
        }
      } else {
        throw new Error(data.message || "Failed to fetch stores");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("Error fetching Pathao stores:", error);
      showToast(error.message || "Failed to fetch Pathao stores", "error");
    } finally {
      setIsLoadingStores(false);
    }
  };

  useEffect(() => {
    fetchPathaoStores();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        {/* <Button onClick={handleSaveSettings}>Save Changes</Button> */}
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Delivery Charges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Inside Dhaka"
              type="number"
              // value={formData.deliveryCharges.inside_dhaka}
              // onChange={(e) =>
              //   setFormData((prev) => ({
              //     ...prev,
              //     deliveryCharges: {
              //       ...prev.deliveryCharges,
              //       inside_dhaka: parseNonNegativeNumber(e.target.value),
              //     },
              //   }))
              // }
            />
            <Input
              label="Outside Dhaka"
              type="number"
              // value={formData.deliveryCharges.outside_dhaka}
              // onChange={(e) =>
              //   setFormData((prev) => ({
              //     ...prev,
              //     deliveryCharges: {
              //       ...prev.deliveryCharges,
              //       outside_dhaka: parseNonNegativeNumber(e.target.value),
              //     },
              //   }))
              // }
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Packing Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Packing Status"
              // value={formData.packingStatus.enabled ? "enabled" : "disabled"}
              // onChange={(e) =>
              //   setFormData((prev) => ({
              //     ...prev,
              //     packingStatus: {
              //       ...prev.packingStatus,
              //       enabled: e.target.value === "enabled",
              //     },
              //   }))
              // }
              options={packingStatusOptions}
            />
            <Textarea
              label="Customer Message"
              // value={formData.packingStatus.message}
              // onChange={(e) =>
              //   setFormData((prev) => ({
              //     ...prev,
              //     packingStatus: {
              //       ...prev.packingStatus,
              //       message: e.target.value,
              //     },
              //   }))
              // }
              rows={3}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Pathao Integration</h2>
          <div className="space-y-4">
            <Input
              label="Client ID"
              // value={formData.pathao.clientId}
              // onChange={(e) =>
              //   setFormData((prev) => ({
              //     ...prev,
              //     pathao: {
              //       ...prev.pathao,
              //       clientId: e.target.value,
              //     },
              //   }))
              // }
            />
            <Input
              label="Client Secret"
              type="password"
              // value={formData.pathao.clientSecret}
              // onChange={(e) =>
              //   setFormData((prev) => ({
              //     ...prev,
              //     pathao: {
              //       ...prev.pathao,
              //       clientSecret: e.target.value,
              //     },
              //   }))
              // }
            />
            <Input
              label="Webhook URL"
              // value={formData.pathao.webhookUrl}
              // onChange={(e) =>
              //   setFormData((prev) => ({
              //     ...prev,
              //     pathao: {
              //       ...prev.pathao,
              //       webhookUrl: e.target.value,
              //     },
              //   }))
              // }
            />
            <Select
              label="Sandbox Mode"
              // value={formData.pathao.sandboxMode ? "enabled" : "disabled"}
              // onChange={(e) =>
              //   setFormData((prev) => ({
              //     ...prev,
              //     pathao: {
              //       ...prev.pathao,
              //       sandboxMode: e.target.value === "enabled",
              //     },
              //   }))
              // }
              options={sandboxOptions}
            />
            <Button
              variant="secondary"
              onClick={handleTestPathaoConnection}
              loading={isTestingPathao}
            >
              Test Connection
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Pathao Store Selection</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Select
                label="Select Store"
                value={pathaoStoreId || ""}
                onChange={(e) => {
                  if (e.target.value) {
                    setPathaoStoreId(e.target.value);
                    showToast("Store selected successfully", "success");
                  }
                }}
                options={[
                  {
                    value: "",
                    label: isLoadingStores
                      ? "Loading stores..."
                      : "Select a store",
                  },
                  ...pathaoStores
                    .filter((store) => store.is_active === 1)
                    .map((store) => ({
                      value: store.store_id,
                      label: `${store.store_name}${
                        store.is_default_store ? " (Default)" : ""
                      }`,
                    })),
                ]}
                disabled={isLoadingStores}
              />
              <Button
                variant="secondary"
                onClick={fetchPathaoStores}
                loading={isLoadingStores}
                disabled={isLoadingStores}
                className="mt-6"
              >
                Refresh Stores
              </Button>
            </div>
            {pathaoStoreId && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Selected Store ID:</span>{" "}
                  {pathaoStoreId}
                </p>
                {pathaoStores.find((s) => s.store_id === pathaoStoreId) && (
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-semibold">Address:</span>{" "}
                    {
                      pathaoStores.find((s) => s.store_id === pathaoStoreId)
                        ?.store_address
                    }
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">App Settings</h2>
          <div className="space-y-4">
            <Input
              label="Company Name"
              value={storeData.name}
              onChange={(e) =>
                setStoreData((prev) => ({
                  ...prev,
                  name: e.target.value,
                }))
              }
            />
            <Input
              label="Support Phone"
              value={storeData.contact_number}
              onChange={(e) =>
                setStoreData((prev) => ({
                  ...prev,
                  contact_number: e.target.value,
                }))
              }
            />
            <Input
              label="Support Email"
              type="email"
              value={storeData.contact_name}
              onChange={(e) =>
                setStoreData((prev) => ({
                  ...prev,
                  contact_name: e.target.value,
                }))
              }
            />
            <Input
              label="App Name"
              value={storeData.otp_number}
              onChange={(e) =>
                setStoreData((prev) => ({
                  ...prev,
                  otp_number: e.target.value,
                }))
              }
            />
            <Input
              label="Order Tracking Base URL"
              value={storeData.address ?? ""}
              onChange={(e) =>
                setStoreData((prev) => ({
                  ...prev,
                  address: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
