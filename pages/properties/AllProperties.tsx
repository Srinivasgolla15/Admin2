import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Property } from '../../types';
import { Eye, Pencil } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { getAuth } from 'firebase/auth';

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

    // Query only the necessary fields for the table
    const propertiesQuery = query(
      collection(db, 'properties'),
      // Optionally add filters based on user role, e.g., where('status', '==', 'verified') for non-admins
    );

    const unsub = onSnapshot(propertiesQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const raw = doc.data();
        const propertyData = {
          id: doc.id,
          name: raw.name,
          propertyType: raw.propertyType,
          service: raw.service,
          status: raw.status,
          city: raw.city,
          assignedEmployee: raw.assignedEmployee,
          timestamp: raw.timestamp?.toDate(),
          // Exclude tenants to reduce reads; fetch only when needed
        } as Property;
        return propertyData;
      });

      console.log('Fetched properties:', data.map(p => ({
        id: p.id,
        name: p.name,
        propertyType: p.propertyType,
        service: p.service,
        status: p.status,
        city: p.city,
        assignedEmployee: p.assignedEmployee,
        timestamp: p.timestamp?.toISOString(),
      })));

      setProperties(data);
    }, (error) => {
      console.error('Error fetching properties:', error);
    });

    return () => unsub();
  }, [user]);

  // Fetch additional property details (including tenants) when viewing
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
        console.log('Fetched property details:', {
          id: propertyData.id,
          name: propertyData.name,
          propertyType: propertyData.propertyType,
          service: propertyData.service,
          status: propertyData.status,
          city: propertyData.city,
          assignedEmployee: propertyData.assignedEmployee,
          phone: propertyData.phone,
          address: propertyData.address,
          detailedAddress: propertyData.detailedAddress,
          squareFeet: propertyData.squareFeet,
          price: propertyData.price,
          submittedBy: propertyData.submittedBy,
          timestamp: propertyData.timestamp?.toISOString(),
          tenants: propertyData.tenants?.map(t => ({
            ...t,
            moveInDate: t.moveInDate?.toISOString(),
            timestamp: t.timestamp?.toISOString(),
          })),
        });
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
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b border-gray-200 dark:border-slate-700">
              <th className="px-4 py-2">Name</th>
              <th>Type</th>
              <th>Service</th>
              <th>Status</th>
              <th>City</th>
              <th>Assigned</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id} className="border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info/Edit Panel */}
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