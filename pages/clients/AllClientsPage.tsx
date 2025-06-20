import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { User } from '../../types';
import { Edit3, Info } from 'lucide-react';
import Modal from '../../components/ui/Modal';

const AllClientsPage: React.FC = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<User | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const fetchClients = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'clients'));
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

  const openInfoModal = (client: User) => {
    setSelectedClient(client);
    setIsInfoOpen(true);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">All Clients</h1>
      {loading ? (
        <p>Loading clients...</p>
      ) : (
        <div className="overflow-x-auto rounded-lg shadow">
          <table className="min-w-full bg-white dark:bg-slate-800 text-sm">
            <thead className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              <tr>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Phone</th>
                <th className="px-4 py-2 text-left">Subscribed Services</th>
                <th className="px-4 py-2 text-left">Properties</th>
                <th className="px-4 py-2 text-left">Created At</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => (
                <tr key={client.id} className="border-b dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-4 py-2">{client.name}</td>
                  <td className="px-4 py-2">{client.email}</td>
                  <td className="px-4 py-2">{client.phone || '—'}</td>
                  <td className="px-4 py-2">
                    {Array.isArray(client.subscribedServices) && client.subscribedServices.length > 0
                      ? client.subscribedServices.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {Array.isArray(client.properties) && client.properties.length > 0
                      ? client.properties.join(', ')
                      : '—'}
                  </td>
                  <td className="px-4 py-2">
                    {client.createdAt
                      ? format(
                          (client.createdAt && typeof client.createdAt.toDate === 'function')
                            ? client.createdAt.toDate()
                            : new Date(
                                typeof client.createdAt === 'string'
                                  ? client.createdAt
                                  : ''
                              ),
                          'dd-MM-yyyy HH:mm'
                        )
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

                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
            <p><strong>Created At:</strong> {selectedClient.createdAt?.toDate?.() ? format(selectedClient.createdAt.toDate(), 'dd-MM-yyyy HH:mm') : '—'}</p>
          </div>
        ) : (
          <p>No client selected.</p>
        )}
      </Modal>
    </div>
  );
};

export default AllClientsPage;
