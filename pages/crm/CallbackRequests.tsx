import React, { useEffect, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { CallbackRequest } from '../../types';
import { CalendarDays, Phone, Mail } from 'lucide-react';


const CallbackRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCallbackRequests = async () => {
    try {
      const q = query(collection(db, 'callbackRequests'), orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white dark:bg-slate-800 shadow rounded-lg p-5 space-y-2">
              <div className="text-lg font-medium text-slate-800 dark:text-white">{req.name}</div>
              <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Mail size={14} /> {req.email}
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                <Phone size={14} /> {req.phone}
              </div>
              <div className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {req.serviceNeeded}
              </div>
              <div className="text-sm text-slate-700 dark:text-slate-200">{req.message}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 pt-2">
                <CalendarDays size={14} />
                {req.timestamp?.toDate
                  ? format(req.timestamp.toDate(), 'dd MMM yyyy, hh:mm a')
                  : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CallbackRequestsPage;
