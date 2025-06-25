import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { PlatformAuditLog } from '../../utils/auditLogger';

interface EditEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: string; // e.g. 'client'
  entityId: string;
  entityData: Record<string, any>;
  editableFields: string[]; // e.g. ['name', 'email', 'phone']
  currentUser: any;
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

  // Sync form when modal opens with latest data
  useEffect(() => {
    setForm(entityData);
  }, [entityData]);

  const handleSubmit = async () => {
    console.log('[DEBUG] Submitting form...', form);
    setIsSaving(true);

    try {
      await onSave(form);

      // Compute changed fields
      const changedFields = Object.keys(form).reduce((acc, key) => {
        if (form[key] !== entityData[key]) {
          acc[key] = { from: entityData[key], to: form[key] };
        }
        return acc;
      }, {} as Record<string, { from: any; to: any }>);

      const description = Object.entries(changedFields)
        .map(([key, { from, to }]) => `${key} from "${from}" to "${to}"`)
        .join(', ');

      console.log('[DEBUG] Changed fields:', changedFields);

      // Log audit only if changes happened
      if (Object.keys(changedFields).length > 0) {
        await PlatformAuditLog({
          actionType: 'UPDATE_' + entityType.toUpperCase(),
          actor: currentUser,
          targetEntityId: entityId,
          targetEntityType: entityType,
          targetEntityDescription: form.name || form.email || entityId,
          actionDescription: `Updated ${entityType} ${form.name || form.email || entityId}${description ? `: ${description}` : ''}`,
          details: changedFields,
        });
        console.log('[DEBUG] Audit logged successfully');
      } else {
        console.log('[DEBUG] No changes detected. Skipping audit log.');
      }

      onClose();
    } catch (err) {
      console.error('[DEBUG] Save failed:', err);
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
            <input
              aria-label={`Edit field ${field}`}
              value={form[field] || ''}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full border px-3 py-2 rounded text-black dark:text-white"
            />
          </div>
        ))}

        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded text-sm"
          >
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
