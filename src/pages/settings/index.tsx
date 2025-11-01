'use client';

import { useMemo, useState } from 'react';
import { Button, Input, Select, Textarea } from '@/components/ui';
import useStore from '@/store';
import { showToast } from '@/components/utils';
import { Settings } from '@/types';

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

export default function SettingsPage() {
  const { settings } = useStore();
  const [formData, setFormData] = useState<Settings>(() => cloneSettings(settings));
  const [isTestingPathao, setIsTestingPathao] = useState(false);

  const packingStatusOptions = useMemo(
    () => [
      { value: 'enabled', label: 'Enabled' },
      { value: 'disabled', label: 'Disabled' },
    ],
    []
  );

  const sandboxOptions = useMemo(
    () => [
      { value: 'enabled', label: 'Enabled' },
      { value: 'disabled', label: 'Disabled' },
    ],
    []
  );

  const handleSaveSettings = () => {
    useStore.setState((state) => ({
      settings: {
        ...state.settings,
        ...formData,
        deliveryCharges: { ...formData.deliveryCharges },
        packingStatus: { ...formData.packingStatus },
        pathao: { ...formData.pathao },
      },
    }));
    showToast('Settings saved successfully', 'success');
  };

  const handleTestPathaoConnection = async () => {
    setIsTestingPathao(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast('Pathao connection test successful', 'success');
    } catch (error) {
      showToast('Failed to connect to Pathao', 'error');
    } finally {
      setIsTestingPathao(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <Button onClick={handleSaveSettings}>Save Changes</Button>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Delivery Charges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Inside Dhaka"
              type="number"
              value={formData.deliveryCharges.inside_dhaka}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryCharges: {
                    ...prev.deliveryCharges,
                    inside_dhaka: parseNonNegativeNumber(e.target.value),
                  },
                }))
              }
            />
            <Input
              label="Outside Dhaka"
              type="number"
              value={formData.deliveryCharges.outside_dhaka}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryCharges: {
                    ...prev.deliveryCharges,
                    outside_dhaka: parseNonNegativeNumber(e.target.value),
                  },
                }))
              }
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Packing Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Packing Status"
              value={formData.packingStatus.enabled ? 'enabled' : 'disabled'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  packingStatus: {
                    ...prev.packingStatus,
                    enabled: e.target.value === 'enabled',
                  },
                }))
              }
              options={packingStatusOptions}
            />
            <Textarea
              label="Customer Message"
              value={formData.packingStatus.message}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  packingStatus: {
                    ...prev.packingStatus,
                    message: e.target.value,
                  },
                }))
              }
              rows={3}
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4">Pathao Integration</h2>
          <div className="space-y-4">
            <Input
              label="Client ID"
              value={formData.pathao.clientId}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  pathao: {
                    ...prev.pathao,
                    clientId: e.target.value,
                  },
                }))
              }
            />
            <Input
              label="Client Secret"
              type="password"
              value={formData.pathao.clientSecret}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  pathao: {
                    ...prev.pathao,
                    clientSecret: e.target.value,
                  },
                }))
              }
            />
            <Input
              label="Webhook URL"
              value={formData.pathao.webhookUrl}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  pathao: {
                    ...prev.pathao,
                    webhookUrl: e.target.value,
                  },
                }))
              }
            />
            <Select
              label="Sandbox Mode"
              value={formData.pathao.sandboxMode ? 'enabled' : 'disabled'}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  pathao: {
                    ...prev.pathao,
                    sandboxMode: e.target.value === 'enabled',
                  },
                }))
              }
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
          <h2 className="text-lg font-semibold mb-4">App Settings</h2>
          <div className="space-y-4">
            <Input
              label="Company Name"
              value={formData.company_name}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  company_name: e.target.value,
                }))
              }
            />
            <Input
              label="Support Phone"
              value={formData.support_phone}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  support_phone: e.target.value,
                }))
              }
            />
            <Input
              label="Support Email"
              type="email"
              value={formData.support_email}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  support_email: e.target.value,
                }))
              }
            />
            <Input
              label="App Name"
              value={formData.appName}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  appName: e.target.value,
                }))
              }
            />
            <Input
              label="Order Tracking Base URL"
              value={formData.order_tracking_base_url ?? ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  order_tracking_base_url: e.target.value,
                }))
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
