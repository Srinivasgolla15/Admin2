import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Payment } from '../../types';
import { format } from 'date-fns';
import PaginatedTable from '../../components/ui/PaginatedTable';

const PaymentsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'premium_subscriptions'));
        console.log(`📦 Read from 'premium_subscriptions' | Total documents: ${snapshot.size}`);

        const data: Payment[] = snapshot.docs.map(doc => {
        const raw = doc.data();
        console.log('📄 Raw payment doc:', doc.id, raw);

        return {
            id: doc.id,
            endDate: raw.endDate?.toDate?.() ?? null,
            numberOfProperties: raw.numberOfProperties ?? 0,
            propertyIds: raw.propertyIds || [],
            serviceType: raw.serviceType ?? '',
            startDate: raw.startDate?.toDate?.() ?? null,
            status: raw.status ?? 'awaiting_verification',
            submittedBy: raw.submittedBy ?? '',
            subscribedAt: raw.subscribedAt?.toDate?.() ?? null,
            transactionScreenshot: raw.transactionScreenshot ?? '',
            updatedAt: raw.updatedAt?.toDate?.() ?? null,
        };
        });


        setPayments(data);
      } catch (err) {
        console.error('Error fetching payments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);
   


  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Premium Payments</h1>

      {loading ? (
        <p className="text-gray-500">Loading payments...</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'submittedBy', label: 'Submitted By' },
            { key: 'serviceType', label: 'Service' },
            { key: 'numberOfProperties', label: '# Properties' },
            { key: 'status', label: 'Status' },
            { key: 'subscribedAt', label: 'Subscribed At' },
            { key: 'startDate', label: 'Start Date' },
            { key: 'endDate', label: 'End Date' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={payments}
          rowsPerPage={5}
          renderRow={(payment) => (
            <>
              <td className="px-4 py-2">{payment.submittedBy}</td>
              <td>{payment.serviceType}</td>
              <td>{payment.numberOfProperties}</td>
              <td>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : payment.status === 'verified'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {payment.status}
                </span>
              </td>
              <td>{format(payment.subscribedAt, 'dd MMM yyyy')}</td>
              <td>{format(payment.startDate, 'dd MMM yyyy')}</td>
              <td>{format(payment.endDate, 'dd MMM yyyy')}</td>
              <td>
                <a
                  href={payment.transactionScreenshot}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-xs"
                >
                  View Receipt
                </a>
              </td>
            </>
          )}
        />
      )}
    </div>
  );
};

export default PaymentsPage;
