import React, { useState } from 'react';
import Modal from './Modal';
import { storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface PropertyDetails {
  id?: string;
  name?: string;
  propertyType: string;
  street?: string;
  landmark?: string;
  address?: string;
  areaSize?: number;
  city?: string;
  location?: string;
  phoneNo?: string;
  photos?: string[];
  price?: number | null;
  rentPrice?: number;
  rentType?: string;
  service?: string;
  status: string;
  submittedBy?: string;
  timestamp?: any;
  userId?: string;
  imageUrls: string[];
  assignedEmployee: string;
  email: string;
  message: string;
}

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: PropertyDetails) => Promise<void>;
  initialData?: Partial<PropertyDetails>;
}

const AddPropertyModal: React.FC<AddPropertyModalProps> = ({ isOpen, onClose, onSave, initialData = {} }) => {
  const [form, setForm] = useState<PropertyDetails>(() => ({
    name: '',
    propertyType: initialData?.propertyType || '',
    street: initialData?.address || '',
    landmark: initialData?.location || '',
    imageUrls: initialData?.photos || [],
    photos: initialData?.photos || [],
    assignedEmployee: '',
    status: initialData?.status || 'active',
    phoneNo: initialData?.phoneNo || '',
    email: initialData?.submittedBy || '',
    message: '',
    price: initialData?.price || null,
    rentPrice: initialData?.rentPrice,
    rentType: initialData?.rentType,
    service: initialData?.service,
    address: initialData?.address,
    areaSize: initialData?.areaSize,
    city: initialData?.city,
    location: initialData?.location,
    submittedBy: initialData?.submittedBy,
    userId: initialData?.userId,
    ...initialData
  }));
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImageFiles(Array.from(e.target.files));
    }
  };

  const handleRemoveImage = (idx: number) => {
    setForm((prev) => ({ ...prev, imageUrls: prev.imageUrls.filter((_, i) => i !== idx) }));
    setImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let imageUrls: string[] = [];
    if (imageFiles.length > 0) {
      imageUrls = await Promise.all(
        imageFiles.map(async (file) => {
          const storageRef = ref(storage, `sale/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          return await getDownloadURL(storageRef);
        })
      );
    }
    await onSave({ ...form, imageUrls });
    setSaving(false);
    onClose();
    setForm({
      name: '',
      propertyType: '',
      street: '',
      landmark: '',
      imageUrls: [],
      photos: [],
      assignedEmployee: '',
      status: 'active',
      phoneNo: '',
      email: '',
      message: '',
      price: null,
    } as PropertyDetails);
    setImageFiles([]);
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
          <input name="landmark" value={form.landmark || ''} onChange={handleChange} className="w-full mt-1 p-2 border border-slate-200 dark:border-slate-700 rounded bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100" />
        </div>
        <div>
          <label htmlFor="phoneNo" className="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Phone
          </label>
          <input
            type="tel"
            id="phoneNo"
            name="phoneNo"
            value={form.phoneNo || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Upload Images</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="block w-full mt-1"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {imageFiles.map((file, idx) => (
              <div key={idx} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt="preview"
                  className="w-20 h-20 object-cover rounded border border-slate-200 dark:border-slate-700"
                />
                <button
                  type="button"
                  className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  onClick={() => handleRemoveImage(idx)}
                  aria-label="Remove image"
                >
                  ×
                </button>
              </div>
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
