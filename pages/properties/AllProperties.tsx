import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../services/firebase';
import { Property } from '../../types';
import { Eye, Pencil } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';

const AllPropertiesPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editMode, setEditMode] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'properties'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          name: raw.name,
          propertyType: raw.propertyType,
          service: raw.service,
          status: raw.status,
          city: raw.city,
          assignedEmployee: raw.assignedEmployee,
          timestamp: raw.timestamp?.toDate(),
        } as Property;
      });
      setProperties(data);
    });

    return () => unsub();
  }, [user]);

  const fetchPropertyDetails = async (id: string) => {
    const docRef = doc(db, 'properties', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const raw = docSnap.data();
      setSelectedProperty({
        id: docSnap.id,
        ...raw,
        timestamp: raw.timestamp?.toDate(),
        tenants: raw.tenants?.map((tenant: any) => ({
          ...tenant,
          moveInDate: tenant.moveInDate?.toDate(),
        })),
      } as Property);
    }
  };

  const handleClose = () => {
    setSelectedProperty(null);
    setEditMode(false);
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">All Properties</h1>

      <PaginatedTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'propertyType', label: 'Type' },
          { key: 'service', label: 'Service' },
          { key: 'status', label: 'Status' },
          { key: 'city', label: 'City' },
          { key: 'assignedEmployee', label: 'Assigned To' },
          { key: 'actions', label: 'Actions' },
        ]}
        data={properties}
        rowsPerPage={5}
        renderRow={(p) => (
          <>
            <td className="px-4 py-2">{p.name}</td>
            <td>{p.propertyType}</td>
            <td>{p.service}</td>
            <td><Badge status={p.status} /></td>
            <td>{p.city || '-'}</td>
            <td>{p.assignedEmployee || 'Unassigned'}</td>
            <td className="flex gap-2">
              <button
              aria-label='View Property Details'
                className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
                onClick={() => {
                  setEditMode(false);
                  fetchPropertyDetails(p.id);
                }}
              >
                <Eye className="text-blue-600 w-4 h-4" />
              </button>
              <button
              aria-label='Edit Property'
                className="p-1 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900"
                onClick={() => {
                  setEditMode(true);
                  fetchPropertyDetails(p.id);
                }}
              >
                <Pencil className="text-yellow-600 w-4 h-4" />
              </button>
            </td>
          </>
        )}
      />

      <Modal
        isOpen={!!selectedProperty}
        onClose={handleClose}
        title={editMode ? 'Edit Property' : 'Property Details'}
        size="lg"
        footer={
          editMode ? (
            <Button onClick={handleClose} className="w-full">Save Changes</Button>
          ) : null
        }
      >
        {selectedProperty && (
          <div className="space-y-4">
            {!editMode ? (
              <div className="grid grid-cols-1 gap-3 text-sm">
                <p><strong>Name:</strong> {selectedProperty.name}</p>
                <p><strong>Phone:</strong> {selectedProperty.phone || '-'}</p>
                <p><strong>Type:</strong> {selectedProperty.propertyType}</p>
                <p><strong>Service:</strong> {selectedProperty.service}</p>
                <p><strong>Status:</strong> <Badge status={selectedProperty.status} /></p>
                <p><strong>Address:</strong> {selectedProperty.address || selectedProperty.detailedAddress?.apartmentName || '-'}</p>
                <p><strong>Square Feet:</strong> {selectedProperty.squareFeet ?? '-'}</p>
                <p><strong>Price:</strong> ₹{selectedProperty.price?.toLocaleString() ?? '-'}</p>
                <p><strong>Assigned To:</strong> {selectedProperty.assignedEmployee ?? 'Not Assigned'}</p>
                <p><strong>Submitted By:</strong> {selectedProperty.submittedBy}</p>
              </div>
            ) : (
              <form className="space-y-4">
                <div>
                  <label className="block mb-1 font-medium">Status</label>
                  <select
                  aria-label='Property Status'
                   defaultValue={selectedProperty.status} className="w-full p-2 rounded border bg-white dark:bg-slate-800">
                    <option value="verified">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block mb-1 font-medium">Assigned Employee</label>
                  <input
                  aria-label='Assigned Employee'
                    type="text"
                    defaultValue={selectedProperty.assignedEmployee || ''}
                    className="w-full p-2 rounded border bg-white dark:bg-slate-800"
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AllPropertiesPage;
