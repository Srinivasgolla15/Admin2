import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { Client } from '../../types';
import { Edit3, Info } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import PaginatedTable from '../../components/ui/PaginatedTable';

const AllClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const fetchClients = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'clients'));
      console.log(`📦 Read from collection: 'clients' | Total documents fetched: ${snapshot.size}`);

      const data = snapshot.docs.map(doc => {
        const raw = doc.data();
        return {
          id: doc.id,
          name: raw.name || '',
          email: raw.email || '',
          phone: raw.phoneNumber || '',
          role: raw.role || 'client',
          subscribedServices: raw.subscribedServices || [],
          properties: raw.properties || [],
          createdAt: raw.createdAt,
          subscriptionStatus: raw.subscriptionStatus || 'inactive', // Add default or fetched value
        };
      });
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const openInfoModal = (client: Client) => {
    setSelectedClient(client);
    setIsInfoOpen(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">All Clients</h1>
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
            { key: 'createdAt', label: 'Created At' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={clients}
          rowsPerPage={5}
          renderRow={(client) => (
            <>
              <td className="px-4 py-2">{client.name}</td>
              <td className="px-4 py-2">{client.email}</td>
              <td className="px-4 py-2">{client.phone || '—'}</td>
              <td className="px-4 py-2">
                {client.subscribedServices?.length
                  ? client.subscribedServices.join(', ')
                  : '—'}
              </td>
              <td className="px-4 py-2">
                {client.properties?.length
                  ? client.properties.join(', ')
                  : '—'}
              </td>
              <td className="px-4 py-2">
                {client.createdAt?.toDate?.()
                  ? format(client.createdAt.toDate(), 'dd-MM-yyyy HH:mm')
                  : '—'}
              </td>
              <td className="px-4 py-2 space-x-2 flex">
                <button
                  title="Edit"
                  className="text-blue-600 hover:text-blue-800 transition"
                  onClick={() => console.log('Edit', client.id)}
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
          )}
        />
      )}

      {/* Modal for Info View */}
      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Client Information"
        size="lg"
      >
        {selectedClient ? (
          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-200">
            <p><strong>Name:</strong> {selectedClient.name}</p>
            <p><strong>Email:</strong> {selectedClient.email}</p>
            <p><strong>Phone:</strong> {selectedClient.phone}</p>
            <p><strong>Role:</strong> {selectedClient.role}</p>
            <p><strong>Subscribed Services:</strong> {selectedClient.subscribedServices?.join(', ') || '—'}</p>
            <p><strong>Properties:</strong> {selectedClient.properties?.join(', ') || '—'}</p>
            <p><strong>Created At:</strong> {selectedClient.createdAt?.toDate?.()
              ? format(selectedClient.createdAt.toDate(), 'dd-MM-yyyy HH:mm')
              : '—'}
            </p>
          </div>
        ) : (
          <p>No client selected.</p>
        )}
      </Modal>
    </div>
  );
};

export default AllClientsPage;
