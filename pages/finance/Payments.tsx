import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, startAfter, DocumentSnapshot, where, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import { Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Invoice {
  id: string;
  clientEmail: string;
  amount: number;
  paymentStatus: string;
  timestamp?: Date | null;
  updatedAt?: Date | null;
  description?: string;
}

const PaymentsPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [prevCursors, setPrevCursors] = useState<DocumentSnapshot[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser, isLoadingAuth } = useAuth();

  const fetchInvoices = (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    if (!currentUser || isLoadingAuth) return;
    setLoading(true);
    let q;
    if (direction === 'next' && lastVisible) {
      q = query(
        collection(db, 'invoices'),
        orderBy('timestamp', 'desc'),
        startAfter(lastVisible),
        limit(rowsPerPage)
      );
    } else if (direction === 'prev' && prevCursors[page - 1]) {
      q = query(
        collection(db, 'invoices'),
        orderBy('timestamp', 'desc'),
        startAfter(prevCursors[page - 1]),
        limit(rowsPerPage)
      );
    } else {
      q = query(
        collection(db, 'invoices'),
        orderBy('timestamp', 'desc'),
        limit(rowsPerPage)
      );
    }
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Invoice[] = snapshot.docs.map((doc) => {
          const raw = doc.data();
          return {
            id: doc.id,
            clientEmail: raw.clientEmail || '',
            amount: raw.amount || 0,
            paymentStatus: raw.paymentStatus || '',
            timestamp: raw.timestamp?.toDate?.() ?? null,
            updatedAt: raw.updatedAt?.toDate?.() ?? null,
            description: raw.description || '',
          };
        });
        setInvoices(data);
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
        setError('Failed to fetch invoices. Please try again.');
        setLoading(false);
      }
    );
    return unsubscribe;
  };

  const runSearchQuery = async (term: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'invoices'),
        orderBy('clientEmail'),
        where('clientEmail', '>=', term.toLowerCase()),
        where('clientEmail', '<=', term.toLowerCase() + '\uf8ff')
      );
      const snapshot = await getDocs(q);
      const data: Invoice[] = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          clientEmail: raw.clientEmail || '',
          amount: raw.amount || 0,
          paymentStatus: raw.paymentStatus || '',
          timestamp: raw.timestamp?.toDate?.() ?? null,
          updatedAt: raw.updatedAt?.toDate?.() ?? null,
          description: raw.description || '',
        };
      });
      setInvoices(data);
      setHasMore(false);
      setLastVisible(null);
      setPrevCursors([]);
    } catch (err) {
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || isLoadingAuth) return;
    let unsubscribe: (() => void) | undefined;
    if (!searchTerm.trim()) {
      unsubscribe = fetchInvoices(currentPage);
    } else {
      runSearchQuery(searchTerm);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [searchTerm, rowsPerPage, currentPage, currentUser, isLoadingAuth]);

  const handlePageChange = (newPage: number) => {
    if (searchTerm.trim()) {
      return;
    }
    const direction = newPage > currentPage ? 'next' : newPage < currentPage ? 'prev' : 'first';
    setCurrentPage(newPage);
    fetchInvoices(newPage, direction);
  };

  const openInfoModal = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsInfoOpen(true);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Payments</h1>
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
          placeholder="Search by client email..."
          className="w-full max-w-md border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {loading ? (
        <p className="text-gray-500">Loading invoices...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'clientEmail', label: 'Client Email' },
            { key: 'amount', label: 'Amount' },
            { key: 'paymentStatus', label: 'Status' },
            { key: 'timestamp', label: 'Created At' },
            { key: 'updatedAt', label: 'Updated At' },
            { key: 'description', label: 'Description' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={invoices}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          hasMore={hasMore}
          renderRow={(invoice) => (
            <>
              <td className="px-4 py-2">{invoice.clientEmail}</td>
              <td className="px-4 py-2">{invoice.amount}</td>
              <td className="px-4 py-2">
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.paymentStatus === 'Completed'
                      ? 'bg-green-100 text-green-800'
                      : invoice.paymentStatus === 'Pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                >
                  {invoice.paymentStatus}
                </span>
              </td>
              <td className="px-4 py-2">{invoice.timestamp ? format(invoice.timestamp, 'dd MMM yyyy HH:mm') : '-'}</td>
              <td className="px-4 py-2">{invoice.updatedAt ? format(invoice.updatedAt, 'dd MMM yyyy HH:mm') : '-'}</td>
              <td className="px-4 py-2">{invoice.description || '-'}</td>
              <td className="px-4 py-2 flex gap-2">
                <button
                  aria-label="View Invoice Details"
                  className="text-blue-600 hover:text-blue-800 transition"
                  onClick={() => openInfoModal(invoice)}
                >
                  <Eye size={18} />
                </button>
              </td>
            </>
          )}
        />
      )}
      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Invoice Details"
        size="lg"
      >
        {selectedInvoice ? (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <p><strong>Client Email:</strong> {selectedInvoice.clientEmail}</p>
            <p><strong>Amount:</strong> {selectedInvoice.amount}</p>
            <p><strong>Status:</strong> {selectedInvoice.paymentStatus}</p>
            <p><strong>Created At:</strong> {selectedInvoice.timestamp ? format(selectedInvoice.timestamp, 'dd MMM yyyy HH:mm') : '-'}</p>
            <p><strong>Updated At:</strong> {selectedInvoice.updatedAt ? format(selectedInvoice.updatedAt, 'dd MMM yyyy HH:mm') : '-'}</p>
            <p><strong>Description:</strong> {selectedInvoice.description || '-'}</p>
          </div>
        ) : (
          <p>No invoice selected.</p>
        )}
      </Modal>
    </div>
  );
};

export default PaymentsPage;
