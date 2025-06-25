import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { CallbackRequest } from '../../types';
import { CalendarDays, Phone, Mail } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';

const CallbackRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCallbackRequests = async () => {
    try {
      const q = query(collection(db, 'callbackRequests'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      console.log(`📦 Read from collection: 'callbackRequests' | Total documents fetched: ${snapshot.size}`);

      const data = snapshot.docs.map(doc => {
        const raw = doc.data();
        return {
          id: doc.id,
          name: raw.name || '',
          email: raw.email || '',
          phone: raw.phone || '',
          serviceNeeded: raw.serviceNeeded || '',
          message: raw.message || '',
          timestamp: raw.timestamp,
        };
      });
      setRequests(data);
    } catch (error) {
      console.error('Error fetching callback requests:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallbackRequests();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Callback Requests</h1>
      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length === 0 ? (
        <p>No callback requests found.</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'serviceNeeded', label: 'Service Needed' },
            { key: 'message', label: 'Message' },
            { key: 'timestamp', label: 'Requested At' },
          ]}
          data={requests}
          rowsPerPage={5}
          renderRow={(req) => (
            <>
              <td className="px-4 py-3">
                <div className="flex items-center">
                  <span className="text-slate-800 dark:text-white">{req.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Mail size={14} />
                  <span>{req.email}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <Phone size={14} />
                  <span>{req.phone}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  {req.serviceNeeded || '—'}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="text-slate-700 dark:text-slate-200 line-clamp-2">
                  {req.message || '—'}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm w-full">
                  <CalendarDays size={14} className="flex-shrink-0 mr-2" />
                  <span className="inline-block min-w-[150px]">
                    {req.timestamp?.toDate
                      ? format(req.timestamp.toDate(), 'dd MMM yyyy, hh:mm a')
                      : '—'}
                  </span>
                </div>
              </td>
            </>
          )}
        />
      )}
    </div>
  );
};

export default CallbackRequestsPage;
