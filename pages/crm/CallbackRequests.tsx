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
              <td className="px-4 py-3 text-slate-800 dark:text-white">{req.name}</td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Mail size={14} /> {req.email}
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Phone size={14} /> {req.phone}
              </td>
              <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-medium">{req.serviceNeeded}</td>
              <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{req.message}</td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
                <CalendarDays size={14} />
                {req.timestamp?.toDate
                  ? format(req.timestamp.toDate(), 'dd MMM yyyy, hh:mm a')
                  : '—'}
              </td>
            </>
          )}
        />
      )}
    </div>
  );
};

export default CallbackRequestsPage;
