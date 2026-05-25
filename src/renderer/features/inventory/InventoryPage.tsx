import React, { useMemo, useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Table, TableColumn } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Product } from '../../shared/types';
import {
  Search,
  Plus,
  Edit,
  X,
  Box,
  AlertTriangle,
  Eye,
  PowerOff,
  Power,
  History,
  ScanBarcode,
  ArrowUpDown,
  ArrowRightLeft,
  FileCode2
} from 'lucide-react';
import { IconActionButton } from '../../shared/ui/IconActionButton';

type DetailTab = 'overview' | 'stock' | 'movements' | 'pricing' | 'audit';

export const InventoryPage: React.FC = () => {
  const {
    products,
    categories,
    suppliers,
    units,
    brands,
    addProduct,
    updateProduct,
    deactivateProduct,
    reactivateProduct,
    notify,
    hasPermission,
    activeBranchId
  } = useErp();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('overview');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({});

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingDeactivateId, setPendingDeactivateId] = useState<string | null>(null);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [productMovements, setProductMovements] = useState<Array<Record<string, any>>>([]);
  const [productBranchStock, setProductBranchStock] = useState<Array<Record<string, any>>>([]);
  const [productAudit, setProductAudit] = useState<Array<Record<string, any>>>([]);

  const canManageProducts = hasPermission('inventory.product.edit');
  const canAdjustStock = hasPermission('inventory.adjust');
  const canTransferStock = hasPermission('inventory.transfer');

  const openCreateModal = () => {
    setEditingProduct(null);
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
    setFieldErrors({});
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      ...prod,
      purchase_cost: prod.purchase_cost ?? 0,
      sale_price: prod.sale_price ?? 0,
      stock_quantity: prod.stock_quantity ?? 0,
      minimum_stock: prod.minimum_stock ?? 0,
      wholesale_price: prod.wholesale_price ?? 0,
      retail_price: prod.retail_price ?? 0
    });
    setErrorMsg(null);
    setFieldErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setFormData({});
    setErrorMsg(null);
    setFieldErrors({});
  };

  const openDetail = (prod: Product, tab: DetailTab = 'overview') => {
    setSelectedProduct(prod);
    setDetailTab(tab);
    setDetailOpen(true);
    loadProductProfile(prod.id);
  };

  const closeDetail = () => {
    setDetailOpen(false);
  };

  const loadProductProfile = async (productId: string) => {
    setLoadingProfile(true);
    try {
      const [movements, branchStock, audit, freshProduct] = await Promise.all([
        window.api.products.getStockMovements(productId, { branch_id: activeBranchId || undefined }),
        window.api.products.getBranchStock(productId),
        window.api.products.getAuditTrail(productId),
        window.api.products.getById(productId)
      ]);
      setProductMovements(movements || []);
      setProductBranchStock(branchStock || []);
      setProductAudit(audit || []);
      setSelectedProduct(freshProduct || null);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load product profile details.');
      setProductMovements([]);
      setProductBranchStock([]);
      setProductAudit([]);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleDeactivate = (id: string) => setPendingDeactivateId(id);

  const confirmDeactivate = async () => {
    if (!pendingDeactivateId) return;
    const ok = await deactivateProduct(pendingDeactivateId);
    setPendingDeactivateId(null);
    if (ok) {
      notify('success', 'Product deactivated successfully.');
      if (selectedProduct?.id === pendingDeactivateId) {
        await loadProductProfile(pendingDeactivateId);
      }
    } else {
      notify('error', 'Failed to deactivate product.');
    }
  };

  const handleFormChange = (key: keyof Product, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
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

    if (Number.isNaN(cost) || cost < 0) errors.purchase_cost = 'Must be >= 0';
    if (Number.isNaN(sale) || sale < 0) errors.sale_price = 'Must be >= 0';
    if (Number.isNaN(stock) || stock < 0) errors.stock_quantity = 'Must be >= 0';
    if (Number.isNaN(minStock) || minStock < 0) errors.minimum_stock = 'Must be >= 0';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!validateForm()) {
      setErrorMsg('Please fix highlighted fields.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        purchase_cost: Number(formData.purchase_cost),
        sale_price: Number(formData.sale_price),
        stock_quantity: Number(formData.stock_quantity),
        minimum_stock: Number(formData.minimum_stock),
        wholesale_price: Number(formData.wholesale_price || 0),
        retail_price: Number(formData.retail_price || 0),
        category_name: categories.find((c) => c.id === formData.category_id)?.name || '',
        supplier_name: suppliers.find((s) => s.id === formData.supplier_id)?.name || '',
        brand_name: brands.find((b) => b.id === formData.brand_id)?.name || '',
        unit_name: units.find((u) => u.id === formData.unit_id)?.name || ''
      };

      const result = editingProduct?.id ? await updateProduct(payload) : await addProduct(payload);
      if (!result.success) {
        setErrorMsg(result.message || 'Failed to save product.');
        return;
      }

      notify('success', editingProduct?.id ? 'Product updated successfully.' : 'Product created successfully.');
      const selectedId = selectedProduct?.id || editingProduct?.id;
      closeModal();

      if (selectedId) {
        const refreshed = await window.api.products.getById(selectedId);
        if (refreshed) {
          setSelectedProduct(refreshed);
          if (detailOpen) await loadProductProfile(selectedId);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Database error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
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
  }, [products, search, categoryFilter, supplierFilter, statusFilter, lowStockOnly]);

  const columns: TableColumn<Product>[] = [
    { header: 'SKU', accessor: (p) => <span className="font-mono text-xs">{p.sku}</span> },
    { header: 'Barcode', accessor: (p) => <span className="font-mono text-xs">{p.barcode || '-'}</span> },
    {
      header: 'Product',
      accessor: (p) => (
        <button onClick={() => openDetail(p)} className="font-semibold text-primary-blue hover:underline text-left">
          {p.name}
        </button>
      )
    },
    {
      header: 'Category / Supplier',
      accessor: (p) => (
        <div>
          <div className="text-xs font-semibold text-slate-800">{p.category_name || 'N/A'}</div>
          <div className="text-[11px] text-slate-500">{p.supplier_name || 'No Supplier'}</div>
        </div>
      )
    },
    {
      header: 'Stock',
      accessor: (p) => {
        const qty = Number(p.stock_quantity || 0);
        const min = Number(p.minimum_stock || 0);
        const isLow = qty <= min;
        return (
          <div>
            <Badge variant={isLow ? 'danger' : 'success'}>{qty}</Badge>
            <div className="text-[10px] text-slate-400">Min: {min}</div>
          </div>
        );
      }
    },
    {
      header: 'Pricing',
      accessor: (p) => (
        <div className="text-xs">
          <div>Sale: Rs. {Number(p.sale_price || 0).toLocaleString()}</div>
          <div className="text-slate-500">Cost: Rs. {Number(p.purchase_cost || 0).toLocaleString()}</div>
        </div>
      )
    },
    { header: 'Status', accessor: (p) => <Badge variant={p.status === 'active' ? 'success' : 'warning'}>{p.status || 'active'}</Badge> },
    {
      header: 'Actions',
      accessor: (p) => (
        <div className="flex items-center gap-1">
          <IconActionButton icon={<Eye className="w-3.5 h-3.5" />} tooltip="View product" variant="primary" onClick={() => openDetail(p)} />
          <IconActionButton icon={<Edit className="w-3.5 h-3.5" />} tooltip="Edit record" onClick={() => openEditModal(p)} disabled={!canManageProducts} disabledTooltip="Only admin/manager can perform this action" />
          {p.status === 'active' ? (
            <IconActionButton icon={<PowerOff className="w-3.5 h-3.5" />} tooltip="Deactivate record" danger onClick={() => handleDeactivate(p.id)} disabled={!canManageProducts} disabledTooltip="Only admin/manager can perform this action" />
          ) : (
            <IconActionButton icon={<Power className="w-3.5 h-3.5" />} tooltip="Reactivate record" onClick={async () => {
              if (!canManageProducts) return;
              await reactivateProduct(p.id);
              notify('success', 'Product reactivated.');
              if (selectedProduct?.id === p.id) await loadProductProfile(p.id);
            }} disabled={!canManageProducts} disabledTooltip="Only admin/manager can perform this action" />
          )}
        </div>
      )
    }
  ];

  const marginAmount = selectedProduct ? Number(selectedProduct.sale_price || 0) - Number(selectedProduct.purchase_cost || 0) : 0;
  const marginPercent = selectedProduct && Number(selectedProduct.sale_price || 0) > 0
    ? ((marginAmount / Number(selectedProduct.sale_price || 1)) * 100).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-4">
      {pendingDeactivateId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-slate-200 shadow-lg w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Deactivate Product</h3>
            <p className="text-xs text-slate-600">This product will be marked inactive and hidden from active operations.</p>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setPendingDeactivateId(null)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDeactivate}>Deactivate</Button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-[6px] shadow-lg w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Box className="w-4 h-4 text-primary-blue" />
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h3>
              <button onClick={closeModal} className="text-slate-500 hover:text-slate-700"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-5 text-xs">
              {errorMsg && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-[4px]">{errorMsg}</div>}

              <section className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-500">Basic Info</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Input label="SKU *" id="sku" value={formData.sku || ''} onChange={(e) => handleFormChange('sku', e.target.value)} />
                    {fieldErrors.sku && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.sku}</p>}
                  </div>
                  <Input label="Barcode" id="barcode" value={formData.barcode || ''} onChange={(e) => handleFormChange('barcode', e.target.value)} />
                  <Select label="Status" id="status" options={[{ label: 'Active', value: 'active' }, { label: 'Inactive', value: 'inactive' }]} value={formData.status || 'active'} onChange={(e) => handleFormChange('status', e.target.value)} />
                </div>
                <div>
                  <Input label="Product Name *" id="name" value={formData.name || ''} onChange={(e) => handleFormChange('name', e.target.value)} />
                  {fieldErrors.name && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.name}</p>}
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-500">Classification</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Select label="Category *" id="category_id" options={[{ value: '', label: 'Select Category' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]} value={formData.category_id || ''} onChange={(e) => handleFormChange('category_id', e.target.value)} />
                    {fieldErrors.category_id && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.category_id}</p>}
                  </div>
                  <div>
                    <Select label="Supplier *" id="supplier_id" options={[{ value: '', label: 'Select Supplier' }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))]} value={formData.supplier_id || ''} onChange={(e) => handleFormChange('supplier_id', e.target.value)} />
                    {fieldErrors.supplier_id && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.supplier_id}</p>}
                  </div>
                  <Select label="Brand" id="brand_id" options={[{ value: '', label: 'No Brand' }, ...brands.map((b) => ({ value: b.id, label: b.name }))]} value={formData.brand_id || ''} onChange={(e) => handleFormChange('brand_id', e.target.value)} />
                  <div>
                    <Select label="Unit *" id="unit_id" options={[{ value: '', label: 'Select Unit' }, ...units.map((u) => ({ value: u.id, label: `${u.name} (${u.abbreviation})` }))]} value={formData.unit_id || ''} onChange={(e) => handleFormChange('unit_id', e.target.value)} />
                    {fieldErrors.unit_id && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.unit_id}</p>}
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-500">Pricing</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <Input label="Purchase Cost" id="purchase_cost" type="number" step="0.01" value={String(formData.purchase_cost ?? 0)} onChange={(e) => handleFormChange('purchase_cost', e.target.value)} />
                    {fieldErrors.purchase_cost && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.purchase_cost}</p>}
                  </div>
                  <div>
                    <Input label="Sale Price" id="sale_price" type="number" step="0.01" value={String(formData.sale_price ?? 0)} onChange={(e) => handleFormChange('sale_price', e.target.value)} />
                    {fieldErrors.sale_price && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.sale_price}</p>}
                  </div>
                  <Input label="Wholesale Price" id="wholesale_price" type="number" step="0.01" value={String(formData.wholesale_price ?? 0)} onChange={(e) => handleFormChange('wholesale_price', e.target.value)} />
                  <Input label="Retail Price" id="retail_price" type="number" step="0.01" value={String(formData.retail_price ?? 0)} onChange={(e) => handleFormChange('retail_price', e.target.value)} />
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-500">Stock</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Input label="Current Stock" id="stock_quantity" type="number" value={String(formData.stock_quantity ?? 0)} onChange={(e) => handleFormChange('stock_quantity', e.target.value)} />
                    {fieldErrors.stock_quantity && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.stock_quantity}</p>}
                  </div>
                  <div>
                    <Input label="Minimum Stock" id="minimum_stock" type="number" value={String(formData.minimum_stock ?? 0)} onChange={(e) => handleFormChange('minimum_stock', e.target.value)} />
                    {fieldErrors.minimum_stock && <p className="text-[10px] text-red-600 mt-1">{fieldErrors.minimum_stock}</p>}
                  </div>
                  <Input label="Rack / Location" id="rack_location" value={formData.rack_location || ''} onChange={(e) => handleFormChange('rack_location', e.target.value)} />
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="text-[11px] font-bold uppercase text-slate-500">Expiry / Batch</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input label="Batch Number" id="batch_number" value={formData.batch_number || ''} onChange={(e) => handleFormChange('batch_number', e.target.value)} />
                  <Input label="Expiry Date" id="expiry_date" type="date" value={formData.expiry_date || ''} onChange={(e) => handleFormChange('expiry_date', e.target.value)} />
                </div>
              </section>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <Button type="button" variant="secondary" onClick={closeModal}>Cancel</Button>
                <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Product'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailOpen && selectedProduct && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={closeDetail}>
          <aside className="absolute right-0 top-0 h-full w-full max-w-[520px] bg-white border-l border-slate-200 shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{selectedProduct.name}</h3>
                <p className="text-[11px] text-slate-500 font-mono">SKU: {selectedProduct.sku} {selectedProduct.barcode ? `| BC: ${selectedProduct.barcode}` : ''}</p>
              </div>
              <div className="flex items-center gap-1">
                <IconActionButton icon={<Edit className="w-3.5 h-3.5" />} tooltip="Edit record" onClick={() => openEditModal(selectedProduct)} disabled={!canManageProducts} disabledTooltip="Only admin/manager can perform this action" />
                <IconActionButton icon={<ArrowUpDown className="w-3.5 h-3.5" />} tooltip="Stock adjustment" onClick={() => notify('info', 'Use Warehouse > Adjustments for controlled stock adjustments.')} disabled={!canAdjustStock} disabledTooltip="Only admin/manager can perform this action" />
                <IconActionButton icon={<ArrowRightLeft className="w-3.5 h-3.5" />} tooltip="Transfer stock" onClick={() => notify('info', 'Use Warehouse > Transfers for stock transfer workflow.')} disabled={!canTransferStock} disabledTooltip="Only admin/manager can perform this action" />
                <IconActionButton icon={<ScanBarcode className="w-3.5 h-3.5" />} tooltip="Print barcode" onClick={() => notify('info', 'Barcode print placeholder ready for next phase.')} />
                <IconActionButton icon={<History className="w-3.5 h-3.5" />} tooltip="View movements" onClick={() => setDetailTab('movements')} />
                {selectedProduct.status === 'active' ? (
                  <IconActionButton icon={<PowerOff className="w-3.5 h-3.5" />} tooltip="Deactivate record" danger onClick={() => handleDeactivate(selectedProduct.id)} disabled={!canManageProducts} disabledTooltip="Only admin/manager can perform this action" />
                ) : (
                  <IconActionButton icon={<Power className="w-3.5 h-3.5" />} tooltip="Reactivate record" onClick={async () => {
                    if (!canManageProducts) return;
                    await reactivateProduct(selectedProduct.id);
                    notify('success', 'Product reactivated.');
                    await loadProductProfile(selectedProduct.id);
                  }} disabled={!canManageProducts} disabledTooltip="Only admin/manager can perform this action" />
                )}
                <button className="ml-1 text-slate-500 hover:text-slate-700" onClick={closeDetail}><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="px-3 py-2 border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
              {([
                ['overview', 'Overview'],
                ['stock', 'Stock'],
                ['movements', 'Movements'],
                ['pricing', 'Pricing'],
                ['audit', 'Audit']
              ] as Array<[DetailTab, string]>).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setDetailTab(key)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-[4px] whitespace-nowrap ${detailTab === key ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 text-xs">
              {loadingProfile && <p className="text-slate-500">Loading product details...</p>}

              {!loadingProfile && detailTab === 'overview' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="border border-slate-200 rounded-[4px] p-3">
                      <p className="text-[10px] uppercase text-slate-500">Status</p>
                      <Badge variant={selectedProduct.status === 'active' ? 'success' : 'warning'}>{selectedProduct.status || 'active'}</Badge>
                    </div>
                    <div className="border border-slate-200 rounded-[4px] p-3">
                      <p className="text-[10px] uppercase text-slate-500">Low Stock</p>
                      <Badge variant={Number(selectedProduct.stock_quantity || 0) <= Number(selectedProduct.minimum_stock || 0) ? 'danger' : 'success'}>
                        {Number(selectedProduct.stock_quantity || 0) <= Number(selectedProduct.minimum_stock || 0) ? 'Low' : 'Healthy'}
                      </Badge>
                    </div>
                  </div>
                  <InfoRow label="Category" value={selectedProduct.category_name || 'N/A'} />
                  <InfoRow label="Supplier" value={selectedProduct.supplier_name || 'N/A'} />
                  <InfoRow label="Brand" value={selectedProduct.brand_name || 'N/A'} />
                  <InfoRow label="Unit" value={selectedProduct.unit_name || 'N/A'} />
                  <InfoRow label="Last Updated" value={selectedProduct.updated_at ? new Date(selectedProduct.updated_at).toLocaleString() : 'N/A'} />
                </div>
              )}

              {!loadingProfile && detailTab === 'stock' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Current Stock" value={`${Number(selectedProduct.stock_quantity || 0)}`} />
                    <MetricCard label="Minimum Stock" value={`${Number(selectedProduct.minimum_stock || 0)}`} />
                  </div>
                  <div className="border border-slate-200 rounded-[4px] overflow-hidden">
                    <div className="px-3 py-2 bg-slate-50 font-semibold">Branch Stock Summary</div>
                    {productBranchStock.length === 0 ? <p className="p-3 text-slate-500">No branch stock records found.</p> : (
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 border-t border-slate-200"><tr><th className="px-2 py-1 text-left">Branch</th><th className="px-2 py-1 text-right">On Hand</th><th className="px-2 py-1 text-right">Reserved</th><th className="px-2 py-1 text-right">Available</th></tr></thead>
                        <tbody>
                          {productBranchStock.map((row) => (
                            <tr key={`${row.branch_id}-${row.product_id}`} className="border-t border-slate-100">
                              <td className="px-2 py-1">{row.branch_code} - {row.branch_name}</td>
                              <td className="px-2 py-1 text-right">{Number(row.quantity_on_hand || 0)}</td>
                              <td className="px-2 py-1 text-right">{Number(row.quantity_reserved || 0)}</td>
                              <td className="px-2 py-1 text-right">{Number(row.available_quantity || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {!loadingProfile && detailTab === 'movements' && (
                <div className="border border-slate-200 rounded-[4px] overflow-hidden">
                  {productMovements.length === 0 ? <p className="p-3 text-slate-500">No stock movement found for this product.</p> : (
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50"><tr><th className="px-2 py-1 text-left">Date</th><th className="px-2 py-1 text-left">Type</th><th className="px-2 py-1 text-right">In</th><th className="px-2 py-1 text-right">Out</th><th className="px-2 py-1 text-left">Reference</th></tr></thead>
                      <tbody>
                        {productMovements.map((row) => (
                          <tr key={row.id} className="border-t border-slate-100">
                            <td className="px-2 py-1">{row.date || '-'}</td>
                            <td className="px-2 py-1">{row.movement_type || '-'}</td>
                            <td className="px-2 py-1 text-right">{Number(row.quantity_in || 0)}</td>
                            <td className="px-2 py-1 text-right">{Number(row.quantity_out || 0)}</td>
                            <td className="px-2 py-1">{row.reference_type || ''} {row.reference_id || ''}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {!loadingProfile && detailTab === 'pricing' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <MetricCard label="Purchase Cost" value={`Rs. ${Number(selectedProduct.purchase_cost || 0).toLocaleString()}`} />
                    <MetricCard label="Sale Price" value={`Rs. ${Number(selectedProduct.sale_price || 0).toLocaleString()}`} />
                    <MetricCard label="Gross Margin" value={`Rs. ${marginAmount.toLocaleString()}`} tone={marginAmount < 0 ? 'danger' : 'success'} />
                    <MetricCard label="Margin %" value={`${marginPercent}%`} tone={marginAmount < 0 ? 'danger' : 'default'} />
                  </div>
                  <InfoRow label="Wholesale Price" value={`Rs. ${Number(selectedProduct.wholesale_price || 0).toLocaleString()}`} />
                  <InfoRow label="Retail Price" value={`Rs. ${Number(selectedProduct.retail_price || 0).toLocaleString()}`} />
                </div>
              )}

              {!loadingProfile && detailTab === 'audit' && (
                <div className="border border-slate-200 rounded-[4px] overflow-hidden">
                  <div className="px-3 py-2 bg-slate-50 font-semibold flex items-center gap-2"><FileCode2 className="w-3.5 h-3.5" /> Audit History</div>
                  {productAudit.length === 0 ? <p className="p-3 text-slate-500">No audit history found.</p> : (
                    <div className="p-3 space-y-2">
                      {productAudit.map((row) => (
                        <div key={row.id} className="text-[11px] border-b border-slate-100 pb-2">
                          <div className="font-semibold text-slate-800">{row.action}</div>
                          <div className="text-slate-600">{row.details}</div>
                          <div className="text-slate-400">{row.created_at ? new Date(row.created_at).toLocaleString() : '-'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}

      <div className="bg-white p-4 rounded-[6px] border border-slate-200 shadow-sm space-y-3">
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
          <Button variant="primary" onClick={openCreateModal} className="flex items-center gap-2 whitespace-nowrap" disabled={!canManageProducts}>
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select className="erp-input text-sm py-1.5" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <select className="erp-input text-sm py-1.5" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <select className="erp-input text-sm py-1.5" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[4px] border transition-colors ${
              lowStockOnly ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Stock
          </button>
        </div>
      </div>

      <Table columns={columns} data={filteredProducts} keyExtractor={(p) => p.id} emptyMessage="No products found matching filters." />
    </div>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center justify-between border-b border-slate-100 pb-1">
    <span className="text-slate-500">{label}</span>
    <span className="font-medium text-slate-800">{value}</span>
  </div>
);

const MetricCard: React.FC<{ label: string; value: string; tone?: 'default' | 'success' | 'danger' }> = ({ label, value, tone = 'default' }) => (
  <div className="border border-slate-200 rounded-[4px] p-3">
    <p className="text-[10px] uppercase text-slate-500">{label}</p>
    <p className={`text-sm font-bold mt-1 ${tone === 'danger' ? 'text-red-700' : tone === 'success' ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
  </div>
);
