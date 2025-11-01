import { CustomerEditFormData } from "@/pages/customers";
import { Button, Input, Modal } from "../ui";

export function CustomerModal({
  formData,
  setFormData,
  isEdit,
  handleCreateCustomer,
  handleEditCustomer,
  isEditModalOpen,
  setIsEditModalOpen,
  isCreateModalOpen,
  setIsCreateModalOpen,
  setEditingCustomer,
}: {
  formData: CustomerEditFormData;
  setFormData: (data: CustomerEditFormData) => void;
  isEdit: boolean;
  handleCreateCustomer: () => void;
  handleEditCustomer: () => void;
  isEditModalOpen: boolean;
  setIsEditModalOpen: (value: boolean) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (value: boolean) => void;
  setEditingCustomer: (value: CustomerEditFormData | null) => void;
}) {
  return (
    <Modal
      isOpen={isEdit ? isEditModalOpen : isCreateModalOpen}
      onClose={() => {
        if (isEdit) {
          setIsEditModalOpen(false);
          setEditingCustomer(null);
        } else {
          setIsCreateModalOpen(false);
        }
        setFormData({
          name: "",
          phone: "",
          email: "",
          address: "",
        });
      }}
      title={isEdit ? "Edit Customer" : "Create New Customer"}
    >
      <div className="space-y-4">
        <Input
          label="Name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          required
        />

        <Input
          label="Phone"
          value={formData.phone}
          onChange={(e) =>
            setFormData({ ...formData, phone: e.target.value })
          }
          required
        />

        <Input
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) =>
            setFormData({ ...formData, email: e.target.value })
          }
        />

        <Input
          label="Address"
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
        />

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (isEdit) {
                setIsEditModalOpen(false);
                setEditingCustomer(null);
              } else {
                setIsCreateModalOpen(false);
              }
              setFormData({
                ...formData,
                name: "",
                phone: "",
                email: "",
                address: "",
              });
            }}
          >
            Cancel
          </Button>
          <Button onClick={isEdit ? handleEditCustomer : handleCreateCustomer}>
            {isEdit ? "Update" : "Create"} Customer
          </Button>
        </div>
      </div>
    </Modal>
  );
}
