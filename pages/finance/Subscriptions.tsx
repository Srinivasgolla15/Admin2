import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, startAfter, DocumentSnapshot, updateDoc, doc, Timestamp, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Payment } from '../../types';
import { format } from 'date-fns';
import { Eye, Pencil } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import EditEntityModal from '../../components/ui/EditEntityModal';
import { PlatformAuditLog } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce';

const SubscriptionsPage: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [prevCursors, setPrevCursors] = useState<DocumentSnapshot[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser, isLoadingAuth } = useAuth();

  const fetchPayments = (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    if (!currentUser || isLoadingAuth) return;

    console.log('[DEBUG] PaymentsPage: Fetching payments for page:', page, 'Direction:', direction);
    setLoading(true);

    let q;
    if (direction === 'next' && lastVisible) {
      q = query(
        collection(db, 'premium_subscriptions'),
        orderBy('subscribedAt', 'desc'),
        startAfter(lastVisible),
        limit(rowsPerPage)
      );
    } else if (direction === 'prev' && prevCursors[page - 1]) {
      q = query(
        collection(db, 'premium_subscriptions'),
        orderBy('subscribedAt', 'desc'),
        startAfter(prevCursors[page - 1]),
        limit(rowsPerPage)
      );
    } else {
      q = query(
        collection(db, 'premium_subscriptions'),
        orderBy('subscribedAt', 'desc'),
        limit(rowsPerPage)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[DEBUG] PaymentsPage: Read from 'premium_subscriptions' | Total documents: ${snapshot.size}`);
        const data: Payment[] = snapshot.docs.map((doc) => {
          const raw = doc.data();
          console.log('[DEBUG] PaymentsPage: Raw payment doc:', doc.id, raw);
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
            amount: raw.amount ?? 0,
          };
        });

        setPayments(data);
        setHasMore(data.length === rowsPerPage);

        const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
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
        setLoading(false);
      },
      (err) => {
        console.error('[DEBUG] PaymentsPage: Error fetching payments:', err);
        setError('Failed to fetch payments. Please try again.');
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  const runSearchQuery = async (term: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'premium_subscriptions'),
        orderBy('submittedBy'),
        where('submittedBy', '>=', term.toLowerCase()),
        where('submittedBy', '<=', term.toLowerCase() + '\uf8ff')
      );

      const snapshot = await getDocs(q);
      console.log(`[DEBUG] PaymentsPage: Search read from 'premium_subscriptions' | Total documents: ${snapshot.size}`);
      const data: Payment[] = snapshot.docs.map((doc) => {
        const raw = doc.data();
        console.log('[DEBUG] PaymentsPage: Raw payment doc:', doc.id, raw);
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
          amount: raw.amount ?? 0,
        };
      });

      console.log('[DEBUG] PaymentsPage: Search results fetched:', data);
      setPayments(data);
      setHasMore(false);
      setLastVisible(null);
      setPrevCursors([]);
    } catch (err) {
      console.error('[DEBUG] PaymentsPage: Error in search query:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = debounce((term: string) => {
    if (term.trim()) {
      runSearchQuery(term);
    } else {
      setCurrentPage(0);
      fetchPayments(0, 'first');
    }
  }, 300);

  useEffect(() => {
    if (!currentUser || isLoadingAuth) return;

    let unsubscribe: (() => void) | undefined;
    if (!searchTerm.trim()) {
      unsubscribe = fetchPayments(currentPage);
    } else {
      debouncedSearch(searchTerm);
    }

    return () => {
      if (unsubscribe) unsubscribe();
      debouncedSearch.cancel();
    };
  }, [searchTerm, rowsPerPage, currentPage, currentUser, isLoadingAuth]);

  const handlePageChange = (newPage: number) => {
    if (searchTerm.trim()) {
      return;
    }
    const direction = newPage > currentPage ? 'next' : newPage < currentPage ? 'prev' : 'first';
    setCurrentPage(newPage);
    fetchPayments(newPage, direction);
  };

  const openInfoModal = (payment: Payment) => {
    console.log('[DEBUG] PaymentsPage: Opening info modal for payment:', payment.id);
    setSelectedPayment(payment);
    setIsInfoOpen(true);
  };

  const openEditModal = (payment: Payment) => {
    console.log('[DEBUG] PaymentsPage: Opening edit modal for payment:', payment.id);
    setSelectedPayment(payment);
    setIsEditOpen(true);
  };

  const handlePaymentUpdate = async (updatedData: Partial<Payment>) => {
    if (!selectedPayment || !currentUser) return;

    const paymentRef = doc(db, 'premium_subscriptions', selectedPayment.id);
    const currentTime = Timestamp.fromDate(new Date());

    try {
      await updateDoc(paymentRef, updatedData);

      const changes = Object.keys(updatedData).reduce((acc, key) => {
        const oldVal = selectedPayment[key as keyof Payment];
        const newVal = updatedData[key as keyof Payment];
        if (oldVal !== newVal) {
          acc[key] = { from: oldVal, to: newVal };
        }
        return acc;
      }, {} as Record<string, { from: any; to: any }>);

      if (Object.keys(changes).length > 0) {
        await PlatformAuditLog({
          actionType: 'UPDATE_PAYMENT',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            phone: currentUser.phone || '',
          },
          targetEntityId: selectedPayment.id,
          targetEntityType: 'payment',
          targetEntityDescription: selectedPayment.submittedBy || selectedPayment.id,
          actionDescription: `Updated payment: ${Object.entries(changes)
            .map(([key, { from, to }]) => `${key} from "${from}" to "${to}"`)
            .join(', ')}`,
          timestamp: currentTime,
          details: changes,
        });
      }

      setIsEditOpen(false);
      console.log('[PaymentsPage] Payment updated successfully');
    } catch (error) {
      console.error('[PaymentsPage] Error updating payment:', error);
      setError('Failed to update payment. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Premium Subscriptions</h1>
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
            disabled={searchTerm.trim() !== ''}
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
          placeholder="Search by submitted by..."
          className="w-full max-w-md border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {loading ? (
        <p className="text-gray-500">Loading payments...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
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
            { key: 'amount', label: 'amount'}
          ]}
          data={payments}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          hasMore={hasMore}
          renderRow={(payment) => (
            <>
              <td className="px-4 py-2">{payment.submittedBy}</td>
              <td className="px-4 py-2">{payment.serviceType}</td>
              <td className="px-4 py-2">{payment.numberOfProperties}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${payment.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : payment.status === 'verified'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                >
                  {payment.status}
                </span>
              </td>
              <td className="px-4 py-2">{payment.subscribedAt ? format(payment.subscribedAt, 'dd MMM yyyy') : '-'}</td>
              <td className="px-4 py-2">{payment.startDate ? format(payment.startDate, 'dd MMM yyyy') : '-'}</td>
              <td className="px-4 py-2">{payment.endDate ? format(payment.endDate, 'dd MMM yyyy') : '-'}</td>
              <td className="px-4 py-2 flex gap-2">
                <button
                  aria-label="View Payment Details"
                  className="text-blue-600 hover:text-blue-800 transition"
                  onClick={() => openInfoModal(payment)}
                >
                  <Eye size={18} />
                </button>
                <button
                  aria-label="Edit Payment"
                  className="text-yellow-600 hover:text-yellow-800 transition"
                  onClick={() => openEditModal(payment)}
                >
                  <Pencil size={18} />
                </button>
              </td>
              <td className="px-4 py-2">{payment.amount}</td>
            </>
          )}
        />
      )}

      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Payment Details"
        size="lg"
      >
        {selectedPayment ? (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <p><strong>Submitted By:</strong> {selectedPayment.submittedBy}</p>
            <p><strong>Service Type:</strong> {selectedPayment.serviceType}</p>
            <p><strong>Number of Properties:</strong> {selectedPayment.numberOfProperties}</p>
            <p><strong>Status:</strong> <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${selectedPayment.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : selectedPayment.status === 'verified'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
            >
              {selectedPayment.status}
            </span></p>
            <p><strong>amount:</strong>{selectedPayment.amount}</p>
            <p><strong>Subscribed At:</strong> {selectedPayment.subscribedAt ? format(selectedPayment.subscribedAt, 'dd MMM yyyy HH:mm') : '-'}</p>
            <p><strong>Start Date:</strong> {selectedPayment.startDate ? format(selectedPayment.startDate, 'dd MMM yyyy') : '-'}</p>
            <p><strong>End Date:</strong> {selectedPayment.endDate ? format(selectedPayment.endDate, 'dd MMM yyyy') : '-'}</p>
            <p><strong>Updated At:</strong> {selectedPayment.updatedAt ? format(selectedPayment.updatedAt, 'dd MMM yyyy HH:mm') : '-'}</p>
            {selectedPayment.propertyIds?.length > 0 && (
              <div>
                <strong>Property IDs:</strong>
                <ul className="list-disc list-inside ml-4">
                  {selectedPayment.propertyIds.map((id, idx) => (
                    <li key={idx}>{id}</li>
                  ))}
                </ul>
              </div>
            )}
            {selectedPayment.transactionScreenshot && (
              <div>
                <img
                  src={selectedPayment.transactionScreenshot}
                  alt="Transaction Screenshot"
                  className="w-24 h-24 object-cover rounded cursor-pointer hover:scale-105 transition"
                  onClick={() => {
                    setSelectedImage(selectedPayment.transactionScreenshot);
                    setIsInfoOpen(false);
                    setIsImageModalOpen(true);
                  }}
                />
              </div>
            )}
          </div>
        ) : (
          <p>No payment selected.</p>
        )}
      </Modal>
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setSelectedImage(null);
        }}
        title="Transaction Screenshot"
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
      {
    selectedPayment ? (
      <EditEntityModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        entityType="payment"
        entityId={selectedPayment?.id}
        entityData={{
          status: selectedPayment?.status,
          serviceType: selectedPayment?.serviceType,
        }}
        editableFields={['status', 'serviceType']}
        onSave={handlePaymentUpdate}
        currentUser={currentUser}
      />
    ) : null
  }
    </div >
  );
};

export default SubscriptionsPage;