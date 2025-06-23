import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../services/firebase';
import { Property } from '../../types';
import { Eye, Pencil } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import PaginatedTable from '../../components/ui/PaginatedTable';

const AllPropertiesPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editMode, setEditMode] = useState(false);

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      console.log('No authenticated user, skipping Firestore query');
      return;
    }

    const propertiesQuery = query(collection(db, 'properties'));

    const unsub = onSnapshot(
      propertiesQuery,
      (snapshot) => {
        console.log(`📦 Real-time collection read: 'properties' | Total documents fetched: ${snapshot.size}`);

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
      },
      (error) => {
        console.error('Error fetching properties:', error);
      }
    );

    return () => unsub();
  }, [user]);

  const fetchPropertyDetails = async (propertyId: string) => {
    try {
      const docRef = doc(db, 'properties', propertyId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const raw = docSnap.data();
        const propertyData = {
          id: docSnap.id,
          ...raw,
          timestamp: raw.timestamp?.toDate(),
          tenants: raw.tenants?.map((tenant: any) => ({
            ...tenant,
            moveInDate: tenant.moveInDate?.toDate(),
            timestamp: tenant.timestamp?.toDate(),
          })),
        } as Property;
        console.log('Fetched property details:', propertyData);
        setSelectedProperty(propertyData);
      } else {
        console.log('Property not found:', propertyId);
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
    }
  };

  return (
    <Card title="All Properties">
      <PaginatedTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'propertyType', label: 'Type' },
          { key: 'service', label: 'Service' },
          { key: 'status', label: 'Status' },
          { key: 'city', label: 'City' },
          { key: 'assignedEmployee', label: 'Assigned' },
          { key: 'actions', label: 'Actions' },
        ]}
        data={properties}
        rowsPerPage={6}
        renderRow={(property) => (
          <>
            <td className="px-4 py-2">{property.name}</td>
            <td>{property.propertyType}</td>
            <td>{property.service}</td>
            <td><Badge status={property.status} /></td>
            <td>{property.city || '-'}</td>
            <td>{property.assignedEmployee || 'Unassigned'}</td>
            <td className="flex space-x-2">
              <button
                aria-label="View Property"
                onClick={() => {
                  setEditMode(false);
                  fetchPropertyDetails(property.id);
                }}
              >
                <Eye className="w-4 h-4 text-blue-500 hover:text-blue-700" />
              </button>
              <button
                aria-label="Edit Property"
                onClick={() => {
                  setEditMode(true);
                  fetchPropertyDetails(property.id);
                }}
              >
                <Pencil className="w-4 h-4 text-yellow-500 hover:text-yellow-700" />
              </button>
            </td>
          </>
        )}
      />

      {selectedProperty && (
        <div className="fixed top-20 right-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 shadow-lg rounded-lg w-96 p-4 z-50">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">{editMode ? 'Edit Property' : 'Property Info'}</h2>
            <button onClick={() => setSelectedProperty(null)}>✖</button>
          </div>

          {!editMode ? (
            <div className="space-y-2 text-sm">
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
            <form className="space-y-3">
              <div>
                <label>Status</label>
                <select
                  aria-label="select"
                  defaultValue={selectedProperty.status}
                  className="w-full p-2 rounded border"
                >
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div>
                <label>Assigned Employee</label>
                <input
                  aria-label="Assigned Employee"
                  type="text"
                  defaultValue={selectedProperty.assignedEmployee || ''}
                  className="w-full p-2 rounded border"
                />
              </div>
              <Button className="w-full">Save</Button>
            </form>
          )}
        </div>
      )}
    </Card>
  );
};

export default AllPropertiesPage;
