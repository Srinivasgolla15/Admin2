import React, { useEffect, useRef, useState } from 'react';
import { User, UserRole } from '../../types';
import Modal from './Modal';

interface EditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string;
  entityId: string;
  entityData: Record<string, any>;
  editableFields: string[];
  currentUser?: User | null; // Not used here, just passed through if needed
  onSave: (updatedData: Record<string, any>) => Promise<void>;
  renderField?: (field: string, value: any, setValue: (v: any) => void) => React.ReactNode;
  requiredFields?: string[];
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
  renderField,
  requiredFields,
}) => {
  const [form, setForm] = useState(entityData);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const firstFieldRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => {
    setForm(entityData);
    setErrors({});
  }, [entityData]);

  const validate = (): boolean => {
    const nextErrors: Record<string, string> = {};
    editableFields.forEach((field) => {
      if (requiredFields?.includes(field)) {
        const value = form[field];
        if (value === undefined || value === null || String(value).trim() === '') {
          nextErrors[field] = 'This field is required';
        }
      }
    });
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      // Focus first invalid field
      firstFieldRef.current?.focus();
      return;
    }
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

  const footer = (
    <div className="flex justify-end gap-2">
      <button onClick={onClose} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm text-slate-900">
        Cancel
      </button>
      <button
        onClick={handleSubmit}
        disabled={isSaving}
        className={`px-4 py-2 rounded text-sm text-white ${isSaving ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isSaving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Edit ${entityType}`} size="md" footer={footer} closeOnOverlayClick={false}>
      <div className="grid grid-cols-1 gap-4">
        {editableFields.map((field, index) => {
          const isFirst = index === 0;
          const setValue = (v: any) => setForm({ ...form, [field]: v });
          const customField = typeof renderField === 'function' ? renderField(field, form[field], setValue) : undefined;
          const hasError = Boolean(errors[field]);
          const errorText = errors[field];

          return (
            <div key={field} className="flex flex-col gap-1">
              {customField === undefined && (
                <label className="text-sm font-medium capitalize">
                  {field}
                  {requiredFields?.includes(field) && <span className="text-red-500"> *</span>}
                </label>
              )}
              {customField !== undefined ? (
                customField
              ) : field === 'role' ? (
                <select
                  aria-label='Select Role'
                  ref={isFirst ? (firstFieldRef as any) : undefined}
                  value={form[field] || ''}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className={`w-full border px-3 py-2 rounded text-black dark:text-white ${hasError ? 'border-red-500' : ''}`}
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
                  ref={isFirst ? (firstFieldRef as any) : undefined}
                  value={form[field] || ''}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className={`w-full border px-3 py-2 rounded text-black dark:text-white ${hasError ? 'border-red-500' : ''}`}
                />
              )}
              {hasError && <span className="text-xs text-red-500">{errorText}</span>}
            </div>
          );
        })}
      </div>
    </Modal>
  );
};

export default EditEntityModal;
