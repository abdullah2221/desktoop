import React, { useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Table, TableColumn } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Select } from '../../shared/ui/Select';
import { Supplier } from '../../shared/types';
import { ShoppingBag, Plus, User, Edit, Phone, Mail, Building, MapPin, X } from 'lucide-react';

export const SuppliersPage: React.FC = () => {
  const { suppliers, reloadSuppliers } = useErp();
  
  // Local state
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'profile' | 'form'>('profile');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<Partial<Supplier>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateNew = () => {
    setSelectedSupplier(null);
    setFormData({ status: 'active', opening_balance: 0 });
    setErrorMsg(null);
    setView('form');
  };

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setFormData(supplier);
    setErrorMsg(null);
    setView('form');
  };

  const handleViewProfile = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setView('profile');
  };

  const handleFormChange = (key: keyof Supplier, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!formData.name) {
      setErrorMsg('Supplier Name is required.');
      return;
    }

    try {
      if (formData.id) {
        // Update
        await window.api.suppliers.update(formData);
      } else {
        // Create
        await window.api.suppliers.create(formData);
      }
      await reloadSuppliers();
      setView('profile');
      if (!formData.id) {
         setSelectedSupplier(null);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to save supplier. Please check your connection.');
    }
  };

  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    (s.phone && s.phone.includes(search))
  );

  const columns: TableColumn<Supplier>[] = [
    {
      header: 'Supplier Name',
      accessor: (s) => (
        <button onClick={() => handleViewProfile(s)} className="font-bold text-primary-blue hover:underline text-left cursor-pointer">
          {s.name}
        </button>
      )
    },
    {
      header: 'Contact',
      accessor: (s) => <span className="font-mono text-slate-500">{s.phone || 'N/A'}</span>
    },
    {
      header: 'Status',
      accessor: (s) => (
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
          s.status === 'active' ? 'bg-success-green/10 text-success-green' : 'bg-slate-100 text-slate-500'
        }`}>
          {s.status.toUpperCase()}
        </span>
      )
    },
    {
      header: 'Payable',
      accessor: (s) => (
        <span className={`font-bold ${s.current_balance > 0 ? 'text-warning-amber' : 'text-slate-600'}`}>
          Rs. {s.current_balance?.toLocaleString() || 0}
        </span>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left side: Supplier List */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between items-center">
          <div className="relative w-full md:w-72">
            <input 
              type="text"
              className="erp-input w-full"
              placeholder="Search by name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button variant="primary" onClick={handleCreateNew} className="flex items-center gap-2 cursor-pointer">
            <Plus className="w-4 h-4" />
            Add Supplier
          </Button>
        </div>

        <Table
          columns={columns}
          data={filteredSuppliers}
          keyExtractor={(s) => s.id}
          emptyMessage="No suppliers found."
        />
      </div>

      {/* Right side: Form or Profile */}
      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5 h-fit">
        {view === 'form' ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Edit className="w-4 h-4 text-primary-blue" />
                {formData.id ? 'Edit Supplier' : 'New Supplier'}
              </h3>
              <button onClick={() => setView('profile')} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3 rounded text-sm border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <Input label="Business/Supplier Name *" id="name" value={formData.name || ''} onChange={(e) => handleFormChange('name', e.target.value)} required />
              <Input label="Contact Person" id="contact" value={formData.contact_person || ''} onChange={(e) => handleFormChange('contact_person', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="Phone" id="phone" value={formData.phone || ''} onChange={(e) => handleFormChange('phone', e.target.value)} />
                <Input label="WhatsApp" id="whatsapp" value={formData.whatsapp || ''} onChange={(e) => handleFormChange('whatsapp', e.target.value)} />
              </div>
              <Input label="Email" id="email" type="email" value={formData.email || ''} onChange={(e) => handleFormChange('email', e.target.value)} />
              <Input label="Address" id="address" value={formData.address || ''} onChange={(e) => handleFormChange('address', e.target.value)} />
              <div className="grid grid-cols-2 gap-2">
                <Input label="City" id="city" value={formData.city || ''} onChange={(e) => handleFormChange('city', e.target.value)} />
                <Input label="NTN / Tax No" id="ntn" value={formData.ntn || ''} onChange={(e) => handleFormChange('ntn', e.target.value)} />
              </div>
              {!formData.id && (
                <Input label="Opening Balance (Rs)" id="open_bal" type="number" value={formData.opening_balance?.toString() || '0'} onChange={(e) => handleFormChange('opening_balance', parseFloat(e.target.value))} />
              )}
              <Select label="Status" id="status" options={[{label:'Active', value:'active'}, {label:'Inactive', value:'inactive'}]} value={formData.status || 'active'} onChange={(e) => handleFormChange('status', e.target.value)} />
              
              <Button type="submit" variant="primary" fullWidth className="mt-4 cursor-pointer">
                Save Supplier
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary-blue" />
                Supplier Profile
              </span>
              {selectedSupplier && (
                <button onClick={() => handleEdit(selectedSupplier)} className="text-primary-blue hover:underline text-xs flex items-center gap-1 cursor-pointer">
                  <Edit className="w-3 h-3" /> Edit
                </button>
              )}
            </h3>

            {selectedSupplier ? (
              <div className="space-y-4 text-sm">
                <div className="text-center bg-slate-50 p-4 rounded-lg border border-slate-100">
                  <h2 className="text-lg font-bold text-slate-800">{selectedSupplier.name}</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">{selectedSupplier.id}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-warning-amber/10 p-3 rounded-lg border border-warning-amber/20">
                    <p className="text-[10px] text-warning-amber font-bold uppercase tracking-wider">Current Payable</p>
                    <p className="text-lg font-bold text-slate-800 mt-1">Rs. {selectedSupplier.current_balance?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Status</p>
                    <p className={`font-bold mt-1 ${selectedSupplier.status === 'active' ? 'text-success-green' : 'text-slate-500'}`}>
                      {selectedSupplier.status.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3 text-slate-600">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{selectedSupplier.contact_person || 'No Contact Person'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="font-mono">{selectedSupplier.phone || 'No Phone'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span>{selectedSupplier.email || 'No Email'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{selectedSupplier.address ? `${selectedSupplier.address}, ${selectedSupplier.city}` : 'No Address'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <Building className="w-4 h-4 text-slate-400" />
                    <span className="font-mono">NTN: {selectedSupplier.ntn || 'N/A'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400">
                <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Select a supplier from the list<br/>or add a new one.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
