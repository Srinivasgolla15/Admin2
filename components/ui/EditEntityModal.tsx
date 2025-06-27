import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../../types';

interface EditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  entityData: Record<string, any>;
  editableFields: string[];
  currentUser?: User | null; // Not used here, just passed through if needed
  onSave: (updatedData: Record<string, any>) => Promise<void>;
}

const EditEntityModal: React.FC<EditEntityModalProps> = ({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityData,
  editableFields,
  currentUser,
  onSave,
}) => {
  const [form, setForm] = useState(entityData);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setForm(entityData);
  }, [entityData]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error('[EditEntityModal] Save failed:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md w-full max-w-md p-6">
        <h2 className="text-lg font-bold mb-4">Edit {entityType}</h2>
        {editableFields.map((field) => (
          <div key={field} className="mb-3">
            <label className="block text-sm font-medium mb-1 capitalize">{field}</label>
            {field === 'role' ? (
              <select
              aria-label='Select Role'
                value={form[field] || ''}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full border px-3 py-2 rounded text-black dark:text-white"
              >
                <option value="">Select Role</option>
                <option value={UserRole.SuperAdmin}>Super Admin</option>
                <option value={UserRole.Admin}>Admin</option>
                <option value={UserRole.Sales}>Sales</option>
                <option value={UserRole.Operations}>Operations</option>
                <option value={UserRole.Finance}>Finance</option>
                <option value={UserRole.Employee}>Employee</option>
              </select>
            ) : (
              <input
              aria-label='Edit Entity Field'
                value={form[field] || ''}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                className="w-full border px-3 py-2 rounded text-black dark:text-white"
              />
            )}
          </div>
        ))}
        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className={`px-4 py-2 rounded text-sm text-white ${
              isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEntityModal;
