'use client';

import { useState } from 'react';
import { Button, Input, Modal, Textarea } from '@/components/ui';
import useStore from '@/store';
import { generateProductCode, callGeminiAPI, showToast } from '@/components/utils';
import { Product } from '@/types';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface ProductFormData {
  name: string;
  description: string;
  buying_price: string;
  selling_price: string;
  stock: string;
}

interface ProductModalProps {
  isEdit?: boolean;
}

const getInitialFormState = (): ProductFormData => ({
  name: '',
  description: '',
  buying_price: '',
  selling_price: '',
  stock: '',
});

const parseNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseInteger = (value: string): number => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
};

export default function CatalogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const { products } = useStore();

  const [formData, setFormData] = useState<ProductFormData>(() => getInitialFormState());

  const resetFormData = () => setFormData(getInitialFormState());

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreateProduct = () => {
    const buyingPrice = parseNumber(formData.buying_price);
    const sellingPrice = parseNumber(formData.selling_price);
    const stock = parseInteger(formData.stock);
    const timestamp = new Date().toISOString();
    const nextId =
      products.reduce((maxId, product) => Math.max(maxId, product.id), 0) + 1;

    const newProduct: Product = {
      id: nextId,
      code: generateProductCode(formData.name),
      name: formData.name,
      description: formData.description,
      base_price_bdt: buyingPrice,
      sell_price_bdt: sellingPrice,
      image_url: '',
      is_active: true,
      buying_price: buyingPrice,
      selling_price: sellingPrice,
      stock,
      created_at: timestamp,
      updated_at: timestamp,
    };

    useStore.setState({ products: [...products, newProduct] });
    showToast('Product created successfully', 'success');
    setIsCreateModalOpen(false);
    resetFormData();
  };

  const handleEditProduct = () => {
    if (!editingProduct) return;

    const buyingPrice = parseNumber(formData.buying_price);
    const sellingPrice = parseNumber(formData.selling_price);
    const stock = parseInteger(formData.stock);

    useStore.setState({
      products: products.map(product =>
        product.id === editingProduct.id
          ? {
              ...product,
              name: formData.name,
              description: formData.description,
              base_price_bdt: buyingPrice,
              sell_price_bdt: sellingPrice,
              buying_price: buyingPrice,
              selling_price: sellingPrice,
              stock,
              updated_at: new Date().toISOString(),
            }
          : product
      ),
    });

    showToast('Product updated successfully', 'success');
    setIsEditModalOpen(false);
    setEditingProduct(null);
    resetFormData();
  };

  const handleDeleteProduct = (productId: number) => {
    useStore.setState({
      products: products.filter(product => product.id !== productId),
    });
    showToast('Product deleted successfully', 'success');
  };

  const handleSuggestDescription = async () => {
    if (!formData.name) {
      showToast('Please enter a product name first', 'error');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const description = await callGeminiAPI(
        `Generate a concise but detailed product description for: ${formData.name}`
      );
      setFormData(prev => ({ ...prev, description }));
      showToast('Description generated successfully', 'success');
    } catch (error) {
      showToast('Failed to generate description', 'error');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const ProductModal = ({ isEdit = false }: ProductModalProps) => (
    <Modal
      isOpen={isEdit ? isEditModalOpen : isCreateModalOpen}
      onClose={() => {
        if (isEdit) {
          setIsEditModalOpen(false);
          setEditingProduct(null);
        } else {
          setIsCreateModalOpen(false);
        }
        resetFormData();
      }}
      title={isEdit ? 'Edit Product' : 'Create New Product'}
    >
      <div className="space-y-4">
        <Input
          label="Product Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
        />

        <div className="flex gap-2">
          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={handleSuggestDescription}
            loading={isGeneratingDescription}
            className="mt-6"
          >
            Suggest
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Input
            label="Buying Price"
            type="number"
            value={formData.buying_price}
            onChange={(e) => setFormData(prev => ({ ...prev, buying_price: e.target.value }))}
          />
          <Input
            label="Selling Price"
            type="number"
            value={formData.selling_price}
            onChange={(e) => setFormData(prev => ({ ...prev, selling_price: e.target.value }))}
          />
          <Input
            label="Stock"
            type="number"
            value={formData.stock}
            onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              if (isEdit) {
                setIsEditModalOpen(false);
                setEditingProduct(null);
              } else {
                setIsCreateModalOpen(false);
              }
              resetFormData();
            }}
          >
            Cancel
          </Button>
          <Button onClick={isEdit ? handleEditProduct : handleCreateProduct}>
            {isEdit ? 'Update' : 'Create'} Product
          </Button>
        </div>
      </div>
    </Modal>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Product Catalog</h1>
        <Button
          onClick={() => {
            setEditingProduct(null);
            resetFormData();
            setIsCreateModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              className="pl-10"
              placeholder="Search products by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Buying Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Selling Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const buyingPrice = product.buying_price ?? product.base_price_bdt;
                const sellingPrice = product.selling_price ?? product.sell_price_bdt;
                const stock = product.stock;
                const displayStock = stock ?? 0;
                const stockInputValue = stock !== undefined ? stock.toString() : '';

                return (
                  <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-md truncate">
                      {product.description}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {buyingPrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sellingPrice}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {displayStock}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingProduct(product);
                            setFormData({
                              name: product.name,
                              description: product.description,
                              buying_price: buyingPrice.toString(),
                              selling_price: sellingPrice.toString(),
                              stock: stockInputValue,
                            });
                            setIsEditModalOpen(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal isEdit={false} />
      <ProductModal isEdit={true} />
    </div>
  );
}
