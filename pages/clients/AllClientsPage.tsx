import React, { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query, where, updateDoc, doc, Timestamp, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { Client, Property } from '../../types';
import { Edit3, Info } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { PlatformAuditLog } from '../../utils/auditLogger';
import PaginatedTable from '../../components/ui/PaginatedTable';
import EditEntityModal from '../../components/ui/EditEntityModal';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce'; // Import lodash debounce

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
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0); // 0-based for PaginatedTable
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [prevCursors, setPrevCursors] = useState<DocumentSnapshot[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser, isLoadingAuth } = useAuth();

  const fetchClientsAndProperties = async (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    console.log('[DEBUG] AllClientsPage: Fetching clients and properties for page:', page, 'Direction:', direction);
    setLoading(true);
    try {
      let q;
      if (direction === 'next' && lastVisible) {
        q = query(
          collection(db, 'clients'),
          orderBy('createdAt'),
          startAfter(lastVisible),
          limit(rowsPerPage)
        );
      } else if (direction === 'prev' && prevCursors[page - 1]) {
        q = query(
          collection(db, 'clients'),
          orderBy('createdAt'),
          startAfter(prevCursors[page - 1]),
          limit(rowsPerPage)
        );
      } else {
        q = query(
          collection(db, 'clients'),
          orderBy('createdAt'),
          limit(rowsPerPage)
        );
      }

      const clientsSnapshot = await getDocs(q);
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

      console.log('[DEBUG] AllClientsPage: Clients fetched:', clientsData);
      setClients(clientsData);
      setPropertiesMap(propertyMap);
      setHasMore(clientsData.length === rowsPerPage);

      const newLastVisible = clientsSnapshot.docs[clientsSnapshot.docs.length - 1];
      if (direction === 'next' && newLastVisible) {
        setPrevCursors((prev) => [...prev.slice(0, currentPage), lastVisible].filter((cursor): cursor is DocumentSnapshot => cursor !== null));
        setLastVisible(newLastVisible);
      } else if (direction === 'prev') {
        setLastVisible(prevCursors[page] || null);
        setPrevCursors((prev) => prev.slice(0, page));
      } else if (direction === 'first') {
        setLastVisible(newLastVisible || null);
        setPrevCursors([]);
      }
    } catch (error) {
      console.error('[DEBUG] AllClientsPage: Error fetching clients and properties:', error);
      setError('Failed to fetch clients. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runSearchQuery = async (term: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'clients'),
        orderBy('name'),
        where('name', '>=', term.toLowerCase()),
        where('name', '<=', term.toLowerCase() + '\uf8ff')
      );

      const snapshot = await getDocs(q);
      const clientsData: Client[] = [];
      const propertyMap: Record<string, Property[]> = {};

      for (const docSnap of snapshot.docs) {
        const raw = docSnap.data();
        const client: Client = {
          id: docSnap.id,
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

      console.log('[DEBUG] AllClientsPage: Search results fetched:', clientsData);
      setClients(clientsData);
      setPropertiesMap(propertyMap);
      setHasMore(false); // Disable pagination for search results
    } catch (error) {
      console.error('[DEBUG] Error in search query:', error);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search handler
  const debouncedSearch = debounce((term: string) => {
    if (term.trim()) {
      runSearchQuery(term);
    } else {
      setCurrentPage(0);
      fetchClientsAndProperties(0, 'first');
    }
  }, 100);

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel(); // Cleanup debounce on unmount
  }, [searchTerm, rowsPerPage]);

  const handlePageChange = (newPage: number) => {
    if (searchTerm.trim()) {
      // Ignore page changes during search
      return;
    }
    const direction = newPage > currentPage ? 'next' : newPage < currentPage ? 'prev' : 'first';
    setCurrentPage(newPage);
    fetchClientsAndProperties(newPage, direction);
  };

  const openInfoModal = (client: Client) => {
    console.log('[DEBUG] AllClientsPage: Opening info modal for client:', client.id);
    setSelectedClient(client);
    setSelectedClientProperties(propertiesMap[client.id] || []);
    setIsInfoOpen(true);
  };

  const openEditModal = (client: Client) => {
    console.log('[DEBUG] AllClientsPage: Opening edit modal for client:', client.id);
    setSelectedClient(client);
    setIsEditOpen(true);
  };

  const handleClientUpdate = async (updatedData: Partial<Client>) => {
    if (!selectedClient || !currentUser) return;

    const clientRef = doc(db, 'clients', selectedClient.id);
    const currentTime = Timestamp.fromDate(new Date());

    try {
      await updateDoc(clientRef, updatedData);

      const clientProps = propertiesMap[selectedClient.id] || [];
      if (updatedData.phone) {
        const updatePromises = clientProps.map((prop) =>
          updateDoc(doc(db, 'properties', prop.id), { phoneNo: updatedData.phone })
        );
        await Promise.all(updatePromises);
      }

      const changes = Object.keys(updatedData).reduce((acc, key) => {
        const oldVal = selectedClient[key as keyof Client];
        const newVal = updatedData[key as keyof Client];
        if (oldVal !== newVal) {
          acc[key] = { from: oldVal, to: newVal };
        }
        return acc;
      }, {} as Record<string, { from: any; to: any }>);

      if (Object.keys(changes).length > 0) {
        await PlatformAuditLog({
          actionType: 'UPDATE_CLIENT',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            phone: currentUser.phone || '',
          },
          targetEntityId: selectedClient.id,
          targetEntityType: 'client',
          targetEntityDescription: selectedClient.name || selectedClient.email || selectedClient.id,
          actionDescription: `Updated client: ${Object.entries(changes)
            .map(([key, { from, to }]) => `${key} from "${from}" to "${to}"`)
            .join(', ')}`,
          timestamp: currentTime,
          details: changes,
        });
      }

      if (searchTerm.trim()) {
        await runSearchQuery(searchTerm);
      } else {
        await fetchClientsAndProperties(currentPage);
      }
      setIsEditOpen(false);
      console.log('[AllClientsPage] Client updated successfully');
    } catch (error) {
      console.error('[AllClientsPage] Error updating client:', error);
      setError('Failed to update client. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">All Clients</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-sm text-gray-700 dark:text-slate-300">
            Rows per page:
          </label>
          <select
            id="rowsPerPage"
            className="border px-2 py-1 rounded text-sm"
            value={rowsPerPage}
            onChange={(e) => {
              setRowsPerPage(Number(e.target.value));
              setCurrentPage(0);
              setPrevCursors([]);
              setLastVisible(null);
              setHasMore(true);
            }}
            disabled={searchTerm.trim() !== ''} // Disable during search
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name..."
          className="w-full max-w-md border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {loading ? (
        <p>Loading clients...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
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
          data={clients}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          hasMore={hasMore}
          renderRow={(client) => {
            const fallbackPhone = propertiesMap[client.id]?.[0]?.phone || 'None';
            return (
              <>
                <td className="px-4 py-2">
                  <div className="flex items-center">
                    <img
                      src={
                        client.profilePhotoUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          client.name || 'User'
                        )}&background=random&color=fff`
                      }
                      alt={client.name || 'Unknown'}
                      className="w-8 h-8 rounded-full mr-3 object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                          client.name || 'User'
                        )}&background=random&color=fff`;
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
            <p>
              <strong>Name:</strong> {selectedClient.name}
            </p>
            <p>
              <strong>Email:</strong> {selectedClient.email}
            </p>
            <p>
              <strong>Phone:</strong>{' '}
              {selectedClient.phone || selectedClientProperties?.[0]?.phone || 'None'}
            </p>
            <p>
              <strong>Role:</strong> {selectedClient.role}
            </p>
            <p>
              <strong>Created At:</strong>{' '}
              {selectedClient.createdAt?.toDate?.()
                ? format(selectedClient.createdAt.toDate(), 'dd-MM-yyyy HH:mm')
                : 'None'}
            </p>
            <div>
              <strong>Subscribed Services:</strong>
              <ul className="list-disc list-inside ml-4">
                {selectedClient.subscribedServices?.length ? (
                  selectedClient.subscribedServices.map((srv, idx) => <li key={idx}>{srv}</li>)
                ) : (
                  <li>None</li>
                )}
              </ul>
            </div>
            <div>
              <strong>Properties:</strong>
              {selectedClientProperties.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 mt-2">
                  {selectedClientProperties.map((property, index) => (
                    <div key={index} className="p-3 border rounded shadow-sm">
                      <p>
                        <strong>Name:</strong> {property.name}
                      </p>
                      <p>
                        <strong>Service:</strong> {property.service}
                      </p>
                      <p>
                        <strong>Type:</strong> {property.propertyType}
                      </p>
                      <p>
                        <strong>Size:</strong> {property.squareFeet} sq.ft
                      </p>
                      <p>
                        <strong>Status:</strong> {property.status}
                      </p>
                      <p>
                        <strong>Address:</strong> {property.address || '—'}
                      </p>
                      {property.locationLink && (
                        <p>
                          <a
                            href={property.locationLink}
                            className="text-blue-600 underline"
                            target="_blank"
                            rel="noreferrer"
                          >
                            📍 View on Map
                          </a>
                        </p>
                      )}
                      {Array.isArray(property.photos) && property.photos.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          <p className="font-medium mb-2">
                            <strong>Photos:</strong>
                          </p>
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
          <img
            src={selectedImage}
            alt="Full size"
            className="max-w-full max-h-[70vh] mx-auto rounded shadow"
          />
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
          editableFields={['name', 'email', 'phone']}
          onSave={handleClientUpdate}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default AllClientsPage;