import React, { useState } from 'react';
import Modal from './Modal';

interface PropertyDetails {
  name: string;
  propertyType: string;
  street: string;
  landmark: string;
  imageUrls: string[];
  assignedEmployee: string;
  status: string;
  phone: string;
  email: string;
  message: string;
}

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: PropertyDetails) => Promise<void>;
}

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ isOpen, onClose, onSave }) => {
  const [form, setForm] = useState<PropertyDetails>({
    name: '',
    propertyType: '',
    street: '',
    landmark: '',
    imageUrls: [],
    assignedEmployee: '',
    status: 'active',
    phone: '',
    email: '',
    message: '',
  });
  const [imageInput, setImageInput] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddImage = () => {
    if (imageInput.trim()) {
      setForm((prev) => ({ ...prev, imageUrls: [...prev.imageUrls, imageInput.trim()] }));
      setImageInput('');
    }
  };

  const handleRemoveImage = (idx: number) => {
    setForm((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
    setForm({
      name: '',
      propertyType: '',
      street: '',
      landmark: '',
      imageUrls: [],
      assignedEmployee: '',
      status: 'active',
      phone: '',
      email: '',
      message: '',
    });
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Property">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">Name</label>
          <input name="name" value={form.name} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Property Type</label>
          <input name="propertyType" value={form.propertyType} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Street</label>
          <input name="street" value={form.street} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" required />
        </div>
        <div>
          <label className="block text-sm font-medium">Landmark</label>
          <input name="landmark" value={form.landmark} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium">Image URLs</label>
          <div className="flex gap-2">
            <input value={imageInput} onChange={e => setImageInput(e.target.value)} className="flex-1 border border-slate-200 dark:border-slate-700 p-2 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
            <button type="button" className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" onClick={handleAddImage}>Add</button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {form.imageUrls.map((url, idx) => (
              <span key={idx} className="bg-gray-200 px-2 py-1 rounded text-xs flex items-center">
                {url} <button type="button" className="ml-1 text-red-500" onClick={() => handleRemoveImage(idx)}>x</button>
              </span>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium">Assigned Employee</label>
          <input name="assignedEmployee" value={form.assignedEmployee} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium">Status</label>
          <select name="status" value={form.status} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input name="phone" value={form.phone} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email</label>
          <input name="email" value={form.email} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>
        <div>
          <label className="block text-sm font-medium">Message</label>
          <input name="message" value={form.message} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" className="px-3 py-2 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded hover:bg-slate-300 dark:hover:bg-slate-600" onClick={onClose}>Cancel</button>
          <button type="submit" className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPropertyModal;
