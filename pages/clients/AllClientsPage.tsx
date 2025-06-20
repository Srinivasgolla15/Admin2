import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { User } from '../../types';

const AllClientsPage: React.FC = () => {
  const [clients, setClients] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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
          role: raw.role || 'client', // Provide a default or map as needed
          subscribedServices: raw.subscribedServices || [],
          properties: raw.properties || [],
        //   avatarUrl: raw.avatarUrl || '',
          createdAt: raw.createdAt, // Keep original Timestamp for User type
          // Optionally, add a formatted date property if needed for display
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
                  <td className="px-4 py-2 space-x-2">
                    <button
                      onClick={() => console.log('Edit', client.id)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => console.log('View', client.id)}
                      className="px-3 py-1 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded"
                    >
                      Info
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AllClientsPage;
