import React, { useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Table, TableColumn } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Product } from '../../shared/types';
import { Search, Plus, Edit, X, Box, Tag, AlertTriangle, Eye, PowerOff } from 'lucide-react';

export const InventoryPage: React.FC = () => {
  const { products, categories, suppliers, units, brands, addProduct, updateProduct, deactivateProduct, notify } = useErp();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // View & Form state
  const [view, setView] = useState<'list' | 'form' | 'profile'>('list');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});
  
  // Validation & UI State
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);

  const handleCreateNew = () => {
    setSelectedProduct(null);
    setFormData({ 
      status: 'active',
      purchase_cost: 0,
      sale_price: 0,
      wholesale_price: 0,
      retail_price: 0,
      stock_quantity: 0,
      minimum_stock: 0
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors({});
    setView('form');
  };

  const handleEdit = (prod: Product) => {
    setSelectedProduct(prod);
    setFormData({
      ...prod,
      purchase_cost: prod.purchase_cost ?? 0,
      sale_price: prod.sale_price ?? 0,
      stock_quantity: prod.stock_quantity ?? 0,
    });
    setErrorMsg(null);
    setSuccessMsg(null);
    setFieldErrors({});
    setView('form');
  };

  const handleViewProfile = (prod: Product) => {
    setSelectedProduct(prod);
    setView('profile');
    setSuccessMsg(null);
  };

  const handleDeactivate = async (id: string) => {
    setPendingDeactivateId(id);
  };

  const confirmDeactivate = async () => {
    if (!pendingDeactivateId) return;
    const ok = await deactivateProduct(pendingDeactivateId);
    setPendingDeactivateId(null);
    if (ok) {
      notify('success', 'Product deactivated successfully.');
      setView('list');
    } else {
      notify('error', 'Failed to deactivate product.');
    }
  };

  const handleFormChange = (key: keyof Product, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    // clear field error on change
    if (fieldErrors[key]) {
      setFieldErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[key];
        return newErrs;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!formData.sku?.trim()) errors.sku = 'SKU is required';
    if (!formData.name?.trim()) errors.name = 'Product name is required';
    if (!formData.category_id) errors.category_id = 'Category is required';
    if (!formData.supplier_id) errors.supplier_id = 'Supplier is required';
    if (!formData.unit_id) errors.unit_id = 'Unit is required';

    const cost = Number(formData.purchase_cost);
    const sale = Number(formData.sale_price);
    const stock = Number(formData.stock_quantity);
    const minStock = Number(formData.minimum_stock);

    if (isNaN(cost) || cost < 0) errors.purchase_cost = 'Must be ≥ 0';
    if (isNaN(sale) || sale <= 0) errors.sale_price = 'Must be > 0';
    if (isNaN(stock) || stock < 0) errors.stock_quantity = 'Must be ≥ 0';
    if (isNaN(minStock) || minStock < 0) errors.minimum_stock = 'Must be ≥ 0';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!validateForm()) {
      setErrorMsg('Please fix the highlighted errors before saving.');
      return;
    }

    setIsSaving(true);

    try {
      // Prepare payload
      const payload = {
        ...formData,
        purchase_cost: Number(formData.purchase_cost),
        sale_price: Number(formData.sale_price),
        stock_quantity: Number(formData.stock_quantity),
        minimum_stock: Number(formData.minimum_stock),
        category_name: categories.find(c => c.id === formData.category_id)?.name || '',
        supplier_name: suppliers.find(s => s.id === formData.supplier_id)?.name || '',
        brand_name: brands.find(b => b.id === formData.brand_id)?.name || '',
        unit_name: units.find(u => u.id === formData.unit_id)?.name || ''
      };

      let result;
      if (selectedProduct?.id) {
        result = await updateProduct(payload);
      } else {
        result = await addProduct(payload);
      }

      if (result.success) {
        setSuccessMsg(selectedProduct?.id ? 'Product updated successfully.' : 'Product created successfully.');
        setTimeout(() => {
          setView('list');
          setSelectedProduct(null);
        }, 1000);
      } else {
        setErrorMsg(result.message || 'Failed to save product. Ensure SKU is unique.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Database error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter Logic
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      (p.name?.toLowerCase() || '').includes(search.toLowerCase()) || 
      (p.sku?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (p.barcode?.toLowerCase() || '').includes(search.toLowerCase());
    
    const matchesCat = categoryFilter ? p.category_id === categoryFilter : true;
    const matchesSup = supplierFilter ? p.supplier_id === supplierFilter : true;
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    const matchesLowStock = lowStockOnly ? (p.stock_quantity || 0) <= (p.minimum_stock || 0) : true;
    
    return matchesSearch && matchesCat && matchesSup && matchesStatus && matchesLowStock;
  });

  const columns: TableColumn<Product>[] = [
    {
      header: 'SKU / Name',
      accessor: (p) => (
        <div>
          <button onClick={() => handleViewProfile(p)} className="font-bold text-primary-blue hover:underline text-left cursor-pointer">
            {p.name}
          </button>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            SKU: {p.sku} {p.barcode ? `| BC: ${p.barcode}` : ''}
          </div>
        </div>
      )
    },
    {
      header: 'Category / Supplier',
      accessor: (p) => (
        <div>
          <span className="text-sm font-semibold">{p.category_name || 'N/A'}</span>
          <div className="text-xs text-slate-500">{p.supplier_name || 'No Supplier'}</div>
        </div>
      )
    },
    {
      header: 'Stock',
      accessor: (p) => {
        const qty = p.stock_quantity ?? 0;
        const min = p.minimum_stock ?? 0;
        const isLow = qty <= min;
        return (
          <div>
            <Badge variant={isLow ? 'danger' : 'success'}>
              {qty} {p.unit_name || 'Units'}
            </Badge>
            <div className="text-[10px] text-slate-400 mt-1">Min: {min}</div>
          </div>
        );
      }
    },
    {
      header: 'Pricing',
      accessor: (p) => (
        <div>
          <div className="text-sm font-bold text-slate-700">Rs. {p.sale_price ?? 0}</div>
          <div className="text-[10px] text-slate-500">Cost: Rs. {p.purchase_cost ?? 0}</div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (p) => (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
          p.status === 'active' ? 'bg-success-green/10 text-success-green' : 'bg-slate-100 text-slate-500'
        }`}>
          {p.status || 'ACTIVE'}
        </span>
      )
    },
    {
      header: 'Actions',
      accessor: (p) => (
        <div className="flex items-center gap-2">
          <button onClick={() => handleViewProfile(p)} title="View Profile" className="text-slate-400 hover:text-primary-blue transition-colors cursor-pointer p-1">
            <Eye className="w-4 h-4" />
          </button>
          <button onClick={() => handleEdit(p)} title="Edit Product" className="text-slate-400 hover:text-warning-amber transition-colors cursor-pointer p-1">
            <Edit className="w-4 h-4" />
          </button>
          {p.status === 'active' && (
            <button onClick={() => handleDeactivate(p.id)} title="Deactivate" className="text-slate-400 hover:text-danger-red transition-colors cursor-pointer p-1">
              <PowerOff className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className={`grid grid-cols-1 ${view !== 'list' ? 'lg:grid-cols-3' : ''} gap-6`}>
      {pendingDeactivateId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-lg w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Deactivate Product</h3>
            <p className="text-xs text-slate-600">This product will be marked inactive and hidden from active operations.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setPendingDeactivateId(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDeactivate}>Deactivate</Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Product List */}
      <div className={view !== 'list' ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>
        <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-sm space-y-3">
          
          <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                className="erp-input pl-9 w-full"
                placeholder="Search SKU, Barcode, Name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {view === 'list' && (
              <Button variant="primary" onClick={handleCreateNew} className="flex items-center gap-2 cursor-pointer whitespace-nowrap">
                <Plus className="w-4 h-4" />
                Add Product
              </Button>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center gap-3">
            <select className="erp-input text-sm py-1.5" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            
            <select className="erp-input text-sm py-1.5" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select className="erp-input text-sm py-1.5" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <button 
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] border cursor-pointer transition-colors ${
                lowStockOnly ? 'bg-danger-red/10 text-danger-red border-danger-red/20' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Low Stock
            </button>
          </div>
        </div>

        <Table
          columns={columns}
          data={filteredProducts}
          keyExtractor={(p) => p.id}
          emptyMessage="No products found matching filters."
        />
      </div>

      {/* Right side: Form or Profile */}
      {view !== 'list' && (
        <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5 h-fit sticky top-6">
          {view === 'form' ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Box className="w-4 h-4 text-primary-blue" />
                  {formData.id ? 'Edit Product' : 'Add New Product'}
                </h3>
                <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {errorMsg && (
                <div className="bg-danger-red/10 text-danger-red p-3 rounded-[4px] text-xs font-semibold border border-danger-red/20">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="bg-success-green/10 text-success-green p-3 rounded-[4px] text-xs font-semibold border border-success-green/20">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleSaveProduct} className="space-y-6">
                
                {/* SECTION 1: Basic Info */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">1. Basic Info</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input label="SKU *" id="sku" value={formData.sku || ''} onChange={(e) => handleFormChange('sku', e.target.value)} />
                      {fieldErrors.sku && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.sku}</p>}
                    </div>
                    <Input label="Barcode" id="barcode" value={formData.barcode || ''} onChange={(e) => handleFormChange('barcode', e.target.value)} />
                  </div>
                  <div>
                    <Input label="Product Name *" id="name" value={formData.name || ''} onChange={(e) => handleFormChange('name', e.target.value)} />
                    {fieldErrors.name && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.name}</p>}
                  </div>
                  <Select label="Status" id="status" options={[{label:'Active', value:'active'}, {label:'Inactive', value:'inactive'}]} value={formData.status || 'active'} onChange={(e) => handleFormChange('status', e.target.value)} />
                </div>

                {/* SECTION 2: Classification */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">2. Classification</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Select label="Category *" id="category_id" options={[
                        { value: '', label: 'Select Category' },
                        ...categories.map(c => ({ value: c.id, label: c.name }))
                      ]} value={formData.category_id || ''} onChange={(e) => handleFormChange('category_id', e.target.value)} />
                      {fieldErrors.category_id && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.category_id}</p>}
                    </div>
                    <div>
                      <Select label="Supplier *" id="supplier_id" options={[
                        { value: '', label: 'Select Supplier' },
                        ...suppliers.map(s => ({ value: s.id, label: s.name }))
                      ]} value={formData.supplier_id || ''} onChange={(e) => handleFormChange('supplier_id', e.target.value)} />
                      {fieldErrors.supplier_id && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.supplier_id}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select label="Brand" id="brand_id" options={[
                      { value: '', label: 'No Brand' },
                      ...brands.map(b => ({ value: b.id, label: b.name }))
                    ]} value={formData.brand_id || ''} onChange={(e) => handleFormChange('brand_id', e.target.value)} />
                    <div>
                      <Select label="Unit *" id="unit_id" options={[
                        { value: '', label: 'Select Unit' },
                        ...units.map(u => ({ value: u.id, label: `${u.name} (${u.abbreviation})` }))
                      ]} value={formData.unit_id || ''} onChange={(e) => handleFormChange('unit_id', e.target.value)} />
                      {fieldErrors.unit_id && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.unit_id}</p>}
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Pricing */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">3. Pricing</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Input label="Purchase Cost (Rs) *" id="purchase_cost" type="number" step="0.01" value={formData.purchase_cost?.toString() || '0'} onChange={(e) => handleFormChange('purchase_cost', e.target.value)} />
                      {fieldErrors.purchase_cost && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.purchase_cost}</p>}
                    </div>
                    <div>
                      <Input label="Sale Price (Rs) *" id="sale_price" type="number" step="0.01" value={formData.sale_price?.toString() || '0'} onChange={(e) => handleFormChange('sale_price', e.target.value)} />
                      {fieldErrors.sale_price && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.sale_price}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Wholesale Price (Rs)" id="wholesale_price" type="number" step="0.01" value={formData.wholesale_price?.toString() || '0'} onChange={(e) => handleFormChange('wholesale_price', e.target.value)} />
                    <Input label="Retail Price (Rs)" id="retail_price" type="number" step="0.01" value={formData.retail_price?.toString() || '0'} onChange={(e) => handleFormChange('retail_price', e.target.value)} />
                  </div>
                </div>

                {/* SECTION 4: Stock */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">4. Stock & Location</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Input label="Current Stock" id="stock_quantity" type="number" value={formData.stock_quantity?.toString() || '0'} onChange={(e) => handleFormChange('stock_quantity', e.target.value)} />
                      {fieldErrors.stock_quantity && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.stock_quantity}</p>}
                    </div>
                    <div>
                      <Input label="Min Alert" id="minimum_stock" type="number" value={formData.minimum_stock?.toString() || '0'} onChange={(e) => handleFormChange('minimum_stock', e.target.value)} />
                      {fieldErrors.minimum_stock && <p className="text-[10px] text-danger-red mt-1 font-semibold">{fieldErrors.minimum_stock}</p>}
                    </div>
                    <Input label="Rack/Bin" id="rack_location" value={formData.rack_location || ''} onChange={(e) => handleFormChange('rack_location', e.target.value)} />
                  </div>
                </div>

                {/* SECTION 5: Optional */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">5. Optional</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Batch No" id="batch_number" value={formData.batch_number || ''} onChange={(e) => handleFormChange('batch_number', e.target.value)} />
                    <Input label="Expiry Date" id="expiry_date" type="date" value={formData.expiry_date || ''} onChange={(e) => handleFormChange('expiry_date', e.target.value)} />
                  </div>
                </div>

                <div className="pt-2">
                  <Button type="submit" variant="primary" fullWidth disabled={isSaving} className="py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer">
                    {isSaving ? 'Saving...' : 'Save Product'}
                  </Button>
                </div>
              </form>
            </div>
          ) : view === 'profile' && selectedProduct ? (
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary-blue" />
                  Product Profile
                </h3>
                <div className="flex gap-2">
                  <button onClick={() => handleEdit(selectedProduct)} className="text-primary-blue hover:underline text-xs flex items-center gap-1 cursor-pointer">
                    <Edit className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => setView('list')} className="text-slate-400 hover:text-slate-600 cursor-pointer ml-2">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-4 text-sm">
                <div className="text-center bg-slate-50 p-4 rounded-[6px] border border-slate-200">
                  <h2 className="text-lg font-bold text-slate-800">{selectedProduct.name}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">SKU: {selectedProduct.sku} {selectedProduct.barcode ? `| BC: ${selectedProduct.barcode}` : ''}</p>
                  <div className="mt-2 inline-block">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${selectedProduct.status === 'active' ? 'bg-success-light text-success-green' : 'bg-slate-200 text-slate-600'}`}>
                      {selectedProduct.status || 'ACTIVE'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-[6px] border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sale Price</p>
                    <p className="text-lg font-extrabold text-primary-blue mt-1">Rs. {selectedProduct.sale_price ?? 0}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Cost: Rs. {selectedProduct.purchase_cost ?? 0}</p>
                  </div>
                  <div className="bg-white p-3 rounded-[6px] border border-slate-200 shadow-sm text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Stock</p>
                    <p className={`font-extrabold mt-1 text-lg ${(selectedProduct.stock_quantity ?? 0) <= (selectedProduct.minimum_stock ?? 0) ? 'text-danger-red' : 'text-slate-800'}`}>
                      {selectedProduct.stock_quantity ?? 0} {selectedProduct.unit_name}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Min Alert: {selectedProduct.minimum_stock ?? 0}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-800">{selectedProduct.category_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Supplier:</span>
                    <span className="font-semibold text-slate-800">{selectedProduct.supplier_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Brand:</span>
                    <span className="font-semibold text-slate-800">{selectedProduct.brand_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Unit:</span>
                    <span className="font-semibold text-slate-800">{selectedProduct.unit_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Rack Location:</span>
                    <span className="font-semibold text-slate-800">{selectedProduct.rack_location || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50 text-xs">
                    <span className="text-slate-500">Last Updated:</span>
                    <span className="font-semibold text-slate-800">{selectedProduct.updated_at ? new Date(selectedProduct.updated_at).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>

                {/* Future Placeholder for History */}
                <div className="mt-4 p-4 border border-dashed border-slate-300 rounded-[6px] bg-slate-50 flex items-center justify-center">
                  <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">Stock Movement History (Coming Soon)</p>
                </div>

                <div className="pt-4">
                  {selectedProduct.status === 'active' && (
                    <Button variant="danger" fullWidth onClick={() => handleDeactivate(selectedProduct.id)} className="cursor-pointer">
                      Deactivate Product
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

    </div>
  );
};
