import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { Client, Property } from '../../types';
import { Edit3, Info } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import PaginatedTable from '../../components/ui/PaginatedTable';
import EditEntityModal from '../../components/ui/EditEntityModal';
import { useAuth } from '../../contexts/AuthContext';

const AllClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [propertiesMap, setPropertiesMap] = useState<Record<string, Property[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedClientProperties, setSelectedClientProperties] = useState<Property[]>([]);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5); // Default 5 rows per page
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const { currentUser } = useAuth();

  const fetchClientsAndProperties = async () => {
    try {
      const clientsSnapshot = await getDocs(collection(db, 'clients'));
      const clientsData: Client[] = [];
      const propertyMap: Record<string, Property[]> = {};

      for (const doc of clientsSnapshot.docs) {
        const raw = doc.data();
        const client: Client = {
          id: doc.id,
          name: raw.name || '',
          email: raw.email || '',
          phone: raw.phoneNumber || '',
          role: raw.role || 'client',
          subscribedServices: raw.subscribedServices || [],
          createdAt: raw.createdAt,
          profilePhotoUrl: raw.profilePhotoUrl || '',
          subscriptionStatus: raw.subscriptionStatus || '',
        };
        clientsData.push(client);

        const propQuery = query(collection(db, 'properties'), where('userId', '==', client.id));
        const propSnapshot = await getDocs(propQuery);
        const clientProps: Property[] = propSnapshot.docs.map((pdoc) => ({
          id: pdoc.id,
          ...pdoc.data(),
        })) as Property[];
        propertyMap[client.id] = clientProps;
      }

      setClients(clientsData);
      setPropertiesMap(propertyMap);
    } catch (error) {
      console.error('Error fetching clients and properties:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientsAndProperties();
  }, []);

  // Filter clients based on search term
  const filteredClients = clients.filter((client) => {
    const searchLower = searchTerm.toLowerCase();
    const fallbackPhone = propertiesMap[client.id]?.[0]?.phone || '';
    return (
      client.name.toLowerCase().includes(searchLower) ||
      client.email.toLowerCase().includes(searchLower) ||
      client.phone.toLowerCase().includes(searchLower) ||
      fallbackPhone.toLowerCase().includes(searchLower)
    );
  });

  const openInfoModal = (client: Client) => {
    setSelectedClient(client);
    setSelectedClientProperties(propertiesMap[client.id] || []);
    setIsInfoOpen(true);
  };

  const openEditModal = (client: Client) => {
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  const handleClientUpdate = async (updatedData: Partial<Client>) => {
    if (!selectedClient) return;

    try {
      const clientRef = doc(db, 'clients', selectedClient.id);
      await updateDoc(clientRef, {
        name: updatedData.name,
        email: updatedData.email,
        phone: updatedData.phone,
      });

      // Update properties with new phone number if it exists
      const clientProps = propertiesMap[selectedClient.id] || [];
      if (updatedData.phone) {
        const updatePromises = clientProps.map(prop =>
          updateDoc(doc(db, 'properties', prop.id), { phone: updatedData.phone })
        );
        await Promise.all(updatePromises);
      }

      // Refresh data after update
      await fetchClientsAndProperties();
      setIsEditOpen(false);
    } catch (error) {
      console.error('Error updating client:', error);
      setError('Failed to update client. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">All Clients</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-sm text-gray-700 dark:text-slate-300">Rows per page:</label>
          <select
            id="rowsPerPage"
            className="border px-2 py-1 rounded text-sm"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          className="w-full max-w-md border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {loading ? (
        <p>Loading clients...</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'services', label: 'Subscribed Services' },
            { key: 'properties', label: 'Properties' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={filteredClients} // Use filteredClients instead of clients
          rowsPerPage={rowsPerPage}
          renderRow={(client) => {
            const fallbackPhone = propertiesMap[client.id]?.[0]?.phone || 'None';
            return (
              <>
                <td className="px-4 py-2">
                  <div className="flex items-center">
                    <img
                      src={client.profilePhotoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name || 'User')}&background=random&color=fff`}
                      alt={client.name || 'Unknown'}
                      className="w-8 h-8 rounded-full mr-3 object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name || 'User')}&background=random&color=fff`;
                      }}
                    />
                    <span className="font-medium">{client.name || 'N/A'}</span>
                  </div>
                </td>
                <td className="px-4 py-2">{client.email}</td>
                <td className="px-4 py-2">{client.phone || fallbackPhone}</td>
                <td className="px-4 py-2">{client.subscribedServices?.length || 0} Services</td>
                <td className="px-4 py-2">{propertiesMap[client.id]?.length || 0} Properties</td>
                <td className="px-4 py-2 space-x-2 flex">
                  <button
                    title="Edit"
                    className="text-blue-600 hover:text-blue-800 transition"
                    onClick={() => openEditModal(client)}
                  >
                    <Edit3 size={18} />
                  </button>
                  <button
                    title="View Info"
                    className="text-green-600 hover:text-gray-800 transition"
                    onClick={() => openInfoModal(client)}
                  >
                    <Info size={18} />
                  </button>
                </td>
              </>
            );
          }}
        />
      )}

      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Client Information"
        size="lg"
      >
        {selectedClient ? (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <p><strong>Name:</strong> {selectedClient.name}</p>
            <p><strong>Email:</strong> {selectedClient.email}</p>
            <p><strong>Phone:</strong> {selectedClient.phone || selectedClientProperties?.[0]?.phone || 'None'}</p>
            <p><strong>Role:</strong> {selectedClient.role}</p>
            <p><strong>Created At:</strong> {selectedClient.createdAt?.toDate?.() ? format(selectedClient.createdAt.toDate(), 'dd-MM-yyyy HH:mm') : 'None'}</p>
            <div>
              <strong>Subscribed Services:</strong>
              <ul className="list-disc list-inside ml-4">
                {selectedClient.subscribedServices?.length
                  ? selectedClient.subscribedServices.map((srv, idx) => <li key={idx}>{srv}</li>)
                  : <li>None</li>}
              </ul>
            </div>
            <div>
              <strong>Properties:</strong>
              {selectedClientProperties.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  {selectedClientProperties.map((property, index) => (
                    <div key={index} className="p-3 border rounded shadow-sm">
                      <p><strong>Name:</strong> {property.name}</p>
                      <p><strong>Service:</strong> {property.service}</p>
                      <p><strong>Type:</strong> {property.propertyType}</p>
                      <p><strong>Size:</strong> {property.squareFeet} sq.ft</p>
                      <p><strong>Status:</strong> {property.status}</p>
                      <p><strong>Address:</strong> {property.address || '—'}</p>
                      {property.locationLink && (
                        <p>
                          <a href={property.locationLink} className="text-blue-600 underline" target="_blank" rel="noreferrer">📍 View on Map</a>
                        </p>
                      )}
                      {Array.isArray(property.photos) && property.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <p className="font-medium mb-2"><strong>Photos:</strong></p>
                          {property.photos.map((photoUrl, photoIdx) => (
                            <img
                              key={photoIdx}
                              src={photoUrl}
                              alt={`Property ${index} - ${photoIdx}`}
                              className="w-24 h-24 object-cover rounded cursor-pointer hover:scale-105 transition"
                              onClick={() => {
                                setSelectedImage(photoUrl);
                                setIsImageModalOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p>No properties found.</p>
              )}
            </div>
          </div>
        ) : (
          <p>No client selected.</p>
        )}
      </Modal>

      <Modal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        title="Property Photo"
        size="xl"
      >
        {selectedImage ? (
          <img src={selectedImage} alt="Full size" className="max-w-full max-h-[70vh] mx-auto rounded shadow" />
        ) : (
          <p>No image selected.</p>
        )}
      </Modal>

      {selectedClient && (
        <EditEntityModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          entityType="client"
          entityId={selectedClient.id}
          entityData={{
            name: selectedClient.name,
            email: selectedClient.email,
            phone: selectedClient.phone || '',
          }}
          editableFields={["name", "email", "phone"]}
          onSave={handleClientUpdate}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};
export default AllClientsPage;