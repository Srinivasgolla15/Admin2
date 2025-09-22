import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, startAfter, DocumentSnapshot, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, storage } from '../../services/firebase';
import { ref, getDownloadURL } from 'firebase/storage';
import { format } from 'date-fns';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import { Eye } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Invoice {
  id: string;
  // Common fields
  clientEmail: string;
  amount: number;
  paymentStatus: string;
  timestamp?: Date | null;
  updatedAt?: Date | null;
  description?: string;
  transactionScreenshot?: string;
  transactionScreenshotUrl?: string;
  
  // Invoice specific fields
  invoiceNumber?: string;
  dueDate?: Date | null;
  items?: Array<{
    description: string;
    amount: number;
    quantity: number;
  }>;
  
  // Subscription specific fields
  subscriptionType?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  billingCycle?: string;
  planName?: string;
  paymentMethod?: string;
  paymentMethodLast4?: string;
  subscriptionStatus?: string;
  autoRenew?: boolean;
  
  // User info
  userId?: string;
  userName?: string;
  userPhone?: string;
  
  // Additional metadata
  metadata?: Record<string, any>;
  source?: 'invoice' | 'subscription';
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

  const fetchInvoices = async (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    if (!currentUser || isLoadingAuth) return;
    setLoading(true);
    
    try {
      // Fetch invoices
      let invoicesQuery;
      if (direction === 'next' && lastVisible) {
        invoicesQuery = query(
          collection(db, 'invoices'),
          orderBy('timestamp', 'desc'),
          startAfter(lastVisible),
          limit(rowsPerPage)
        );
      } else if (direction === 'prev' && prevCursors[page - 1]) {
        invoicesQuery = query(
          collection(db, 'invoices'),
          orderBy('timestamp', 'desc'),
          startAfter(prevCursors[page - 1]),
          limit(rowsPerPage)
        );
      } else {
        invoicesQuery = query(
          collection(db, 'invoices'),
          orderBy('timestamp', 'desc'),
          limit(rowsPerPage)
        );
      }
      
      // Fetch premium subscriptions
      let subscriptionsQuery;
      if (direction === 'next' && lastVisible) {
        subscriptionsQuery = query(
          collection(db, 'premium_subscriptions'),
          orderBy('createdAt', 'desc'),
          startAfter(lastVisible),
          limit(rowsPerPage)
        );
      } else if (direction === 'prev' && prevCursors[page - 1]) {
        subscriptionsQuery = query(
          collection(db, 'premium_subscriptions'),
          orderBy('createdAt', 'desc'),
          startAfter(prevCursors[page - 1]),
          limit(rowsPerPage)
        );
      } else {
        subscriptionsQuery = query(
          collection(db, 'premium_subscriptions'),
          orderBy('createdAt', 'desc'),
          limit(rowsPerPage)
        );
      }
      // Execute both queries in parallel
      const [invoicesSnapshot, subscriptionsSnapshot] = await Promise.all([
        getDocs(invoicesQuery),
        getDocs(subscriptionsQuery)
      ]);

      // Process invoices
      const invoicesData: Invoice[] = invoicesSnapshot.docs.map(doc => {
        const raw = doc.data();
        return {
          id: doc.id,
          clientEmail: raw.clientEmail || raw.userEmail || '',
          amount: raw.amount || 0,
          paymentStatus: raw.paymentStatus || raw.status || 'Pending',
          timestamp: raw.timestamp?.toDate?.() ?? null,
          updatedAt: raw.updatedAt?.toDate?.() ?? null,
          description: raw.description || `Payment for ${raw.planName || 'service'}`,
          transactionScreenshot: raw.transactionScreenshot || '',
          source: 'invoice',
          
          // Invoice specific
          invoiceNumber: raw.invoiceNumber || `INV-${doc.id.substring(0, 8).toUpperCase()}`,
          dueDate: raw.dueDate?.toDate?.() ?? null,
          items: raw.items || [],
          
          // User info
          userId: raw.userId || '',
          userName: raw.userName || '',
          userPhone: raw.userPhone || ''
        };
      });

      // Process subscriptions
      const subscriptionsData: Invoice[] = subscriptionsSnapshot.docs.map(doc => {
        const raw = doc.data();
        return {
          id: doc.id,
          clientEmail: raw.userEmail || raw.clientEmail || '',
          amount: raw.amount || raw.price || 0,
          paymentStatus: raw.status || raw.paymentStatus || 'Active',
          timestamp: raw.createdAt?.toDate?.() || raw.timestamp?.toDate?.() || null,
          updatedAt: raw.updatedAt?.toDate?.() || raw.timestamp?.toDate?.() || null,
          description: `Subscription: ${raw.planName || 'Premium Plan'}`,
          transactionScreenshot: raw.paymentProof || raw.transactionScreenshot || '',
          source: 'subscription',
          
          // Subscription specific
          subscriptionType: raw.planType || raw.subscriptionType || 'Premium',
          startDate: raw.startDate?.toDate?.() || null,
          endDate: raw.endDate?.toDate?.() || null,
          billingCycle: raw.billingCycle || 'Monthly',
          planName: raw.planName || 'Premium Plan',
          paymentMethod: raw.paymentMethod || 'Credit Card',
          paymentMethodLast4: raw.paymentMethodLast4 || '',
          subscriptionStatus: raw.status || 'Active',
          autoRenew: raw.autoRenew || false,
          
          // User info
          userId: raw.userId || '',
          userName: raw.userName || '',
          userPhone: raw.userPhone || ''
        };
      });

      // Combine and sort by timestamp (newest first)
      const combinedData = [...invoicesData, ...subscriptionsData].sort((a, b) => {
        const dateA = a.timestamp?.getTime() || 0;
        const dateB = b.timestamp?.getTime() || 0;
        return dateB - dateA;
      });

      setInvoices(combinedData);
      setHasMore(combinedData.length === rowsPerPage);
      
      // Update pagination cursors
      const newLastVisible = invoicesSnapshot.docs[invoicesSnapshot.docs.length - 1] || 
                           subscriptionsSnapshot.docs[subscriptionsSnapshot.docs.length - 1];
      
      if (direction === 'next' && newLastVisible) {
        setPrevCursors(prev => [...prev.slice(0, currentPage), lastVisible].filter(Boolean));
        setLastVisible(newLastVisible);
      } else if (direction === 'prev') {
        setLastVisible(prevCursors[page] || null);
        setPrevCursors(prev => prev.slice(0, page));
      } else if (direction === 'first') {
        setLastVisible(newLastVisible || null);
        setPrevCursors([]);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch payment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runSearchQuery = async (term: string) => {
    setLoading(true);
    try {
      // Search in invoices
      const invoicesQuery = query(
        collection(db, 'invoices'),
        orderBy('clientEmail'),
        where('clientEmail', '>=', term.toLowerCase()),
        where('clientEmail', '<=', term.toLowerCase() + '\uf8ff')
      );
      
      // Search in premium_subscriptions
      const subscriptionsQuery = query(
        collection(db, 'premium_subscriptions'),
        orderBy('userEmail'),
        where('userEmail', '>=', term.toLowerCase()),
        where('userEmail', '<=', term.toLowerCase() + '\uf8ff')
      );

      const [invoicesSnapshot, subscriptionsSnapshot] = await Promise.all([
        getDocs(invoicesQuery),
        getDocs(subscriptionsQuery)
      ]);

      // Process invoices
      const invoicesData: Invoice[] = invoicesSnapshot.docs.map(doc => {
        const raw = doc.data();
        return {
          id: doc.id,
          clientEmail: raw.clientEmail || raw.userEmail || '',
          amount: raw.amount || 0,
          paymentStatus: raw.paymentStatus || raw.status || 'Pending',
          timestamp: raw.timestamp?.toDate?.() ?? null,
          updatedAt: raw.updatedAt?.toDate?.() ?? null,
          description: raw.description || `Payment for ${raw.planName || 'service'}`,
          transactionScreenshot: raw.transactionScreenshot || '',
          source: 'invoice',
          invoiceNumber: raw.invoiceNumber || `INV-${doc.id.substring(0, 8).toUpperCase()}`,
          dueDate: raw.dueDate?.toDate?.() ?? null,
          items: raw.items || [],
          userId: raw.userId || '',
          userName: raw.userName || '',
          userPhone: raw.userPhone || ''
        };
      });

      // Process subscriptions
      const subscriptionsData: Invoice[] = subscriptionsSnapshot.docs.map(doc => {
        const raw = doc.data();
        return {
          id: doc.id,
          clientEmail: raw.userEmail || raw.clientEmail || '',
          amount: raw.amount || raw.price || 0,
          paymentStatus: raw.status || raw.paymentStatus || 'Active',
          timestamp: raw.createdAt?.toDate?.() || raw.timestamp?.toDate?.() || null,
          updatedAt: raw.updatedAt?.toDate?.() || raw.timestamp?.toDate?.() || null,
          description: `Subscription: ${raw.planName || 'Premium Plan'}`,
          transactionScreenshot: raw.paymentProof || raw.transactionScreenshot || '',
          source: 'subscription',
          subscriptionType: raw.planType || raw.subscriptionType || 'Premium',
          startDate: raw.startDate?.toDate?.() || null,
          endDate: raw.endDate?.toDate?.() || null,
          billingCycle: raw.billingCycle || 'Monthly',
          planName: raw.planName || 'Premium Plan',
          paymentMethod: raw.paymentMethod || 'Credit Card',
          paymentMethodLast4: raw.paymentMethodLast4 || '',
          subscriptionStatus: raw.status || 'Active',
          autoRenew: raw.autoRenew || false,
          userId: raw.userId || '',
          userName: raw.userName || '',
          userPhone: raw.userPhone || ''
        };
      });

      // Combine and sort by timestamp (newest first)
      const combinedData = [...invoicesData, ...subscriptionsData].sort((a, b) => {
        const dateA = a.timestamp?.getTime() || 0;
        const dateB = b.timestamp?.getTime() || 0;
        return dateB - dateA;
      });

      setInvoices(combinedData);
      setHasMore(false);
      setLastVisible(null);
      setPrevCursors([]);
    } catch (err) {
      console.error('Search error:', err);
      setError('Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser || isLoadingAuth) return;
    
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        if (!searchTerm.trim()) {
          await fetchInvoices(currentPage);
        } else {
          await runSearchQuery(searchTerm);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load payment data. Please try again.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
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

  const openInfoModal = async (invoice: Invoice) => {
    setLoading(true);
    try {
      // If there's a transaction screenshot, get its download URL
      let screenshotUrl = invoice.transactionScreenshot;
      
      if (screenshotUrl) {
        try {
          // If it's a Firebase Storage path, get the download URL
          if (!screenshotUrl.startsWith('http')) {
            const storageRef = ref(storage, screenshotUrl);
            screenshotUrl = await getDownloadURL(storageRef);
          }
          
          // If it's a Google Storage URL, we might need to modify it
          if (screenshotUrl.includes('storage.googleapis.com')) {
            // Remove any query parameters
            screenshotUrl = screenshotUrl.split('?')[0];
            // Add download token if needed
            screenshotUrl += '?alt=media';
          }
        } catch (error) {
          console.error('Error getting download URL:', error);
          // Keep the original URL if we can't get a download URL
        }
      }

      setSelectedInvoice({
        ...invoice,
        transactionScreenshotUrl: screenshotUrl
      });
      setIsInfoOpen(true);
    } catch (error) {
      console.error('Error in openInfoModal:', error);
      setError('Failed to load payment details. Please try again.');
    } finally {
      setLoading(false);
    }
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
        title={selectedInvoice?.source === 'subscription' ? 'Subscription Details' : 'Payment Details'}
        size="xl"
      >
        {selectedInvoice ? (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 border-b pb-2">
                {selectedInvoice.source === 'subscription' ? 'Subscription' : 'Payment'} Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><strong>Type:</strong> {selectedInvoice.source === 'subscription' ? 'Subscription' : 'Invoice'}</p>
                  <p><strong>Client Email:</strong> {selectedInvoice.clientEmail || '-'}</p>
                  <p><strong>Amount:</strong> ₹{selectedInvoice.amount?.toLocaleString('en-IN') || '0'}</p>
                  <p><strong>Status:</strong> 
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      (selectedInvoice.paymentStatus || selectedInvoice.subscriptionStatus) === 'Completed' || 
                      (selectedInvoice.paymentStatus || selectedInvoice.subscriptionStatus) === 'Active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : (selectedInvoice.paymentStatus || selectedInvoice.subscriptionStatus) === 'Pending' 
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {selectedInvoice.paymentStatus || selectedInvoice.subscriptionStatus}
                    </span>
                  </p>
                  {selectedInvoice.invoiceNumber && (
                    <p><strong>Invoice #:</strong> {selectedInvoice.invoiceNumber}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <p><strong>Created:</strong> {selectedInvoice.timestamp ? format(selectedInvoice.timestamp, 'dd MMM yyyy, hh:mm a') : '-'}</p>
                  <p><strong>Last Updated:</strong> {selectedInvoice.updatedAt ? format(selectedInvoice.updatedAt, 'dd MMM yyyy, hh:mm a') : '-'}</p>
                  {selectedInvoice.dueDate && (
                    <p><strong>Due Date:</strong> {format(selectedInvoice.dueDate, 'dd MMM yyyy')}</p>
                  )}
                  {selectedInvoice.paymentMethod && (
                    <p><strong>Payment Method:</strong> {selectedInvoice.paymentMethod} 
                      {selectedInvoice.paymentMethodLast4 && `(•••• ${selectedInvoice.paymentMethodLast4})`}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Subscription Specific Details */}
            {selectedInvoice.source === 'subscription' && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 border-b pb-2">
                  Subscription Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p><strong>Plan:</strong> {selectedInvoice.planName || 'Premium Plan'}</p>
                    <p><strong>Type:</strong> {selectedInvoice.subscriptionType || 'Premium'}</p>
                    <p><strong>Billing Cycle:</strong> {selectedInvoice.billingCycle || 'Monthly'}</p>
                  </div>
                  <div className="space-y-2">
                    <p><strong>Start Date:</strong> {selectedInvoice.startDate ? format(selectedInvoice.startDate, 'dd MMM yyyy') : '-'}</p>
                    <p><strong>End Date:</strong> {selectedInvoice.endDate ? format(selectedInvoice.endDate, 'dd MMM yyyy') : 'N/A'}</p>
                    <p><strong>Auto Renew:</strong> 
                      <span className={selectedInvoice.autoRenew ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}>
                        {selectedInvoice.autoRenew ? 'Yes' : 'No'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Invoice Items */}
            {selectedInvoice.items?.length > 0 && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 border-b pb-2">
                  Invoice Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Quantity</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{item.description}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-right">₹{item.amount?.toLocaleString('en-IN')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                            ₹{((item.amount || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100 text-right">
                          Total Amount:
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white text-right">
                          ₹{selectedInvoice.amount?.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Transaction Proof */}
            {selectedInvoice.transactionScreenshotUrl && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 border-b pb-2">
                  Transaction Proof
                </h3>
                <div className="relative">
                  <img 
                    src={selectedInvoice.transactionScreenshotUrl}
                    alt="Transaction Screenshot"
                    className="max-w-full h-auto rounded border border-slate-200 dark:border-slate-700 mx-auto"
                    style={{ maxHeight: '500px' }}
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      img.style.display = 'none';
                      const container = img.parentElement;
                      if (container) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'p-4 bg-slate-100 dark:bg-slate-700 rounded text-center';
                        errorDiv.innerHTML = `
                          <p class="text-sm text-slate-600 dark:text-slate-300">
                            Could not load image. 
                            <a href="${img.src}" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 break-all">
                              Open image in new tab
                            </a>
                          </p>
                        `;
                        container.appendChild(errorDiv);
                      }
                    }}
                  />
                  <a 
                    href={selectedInvoice.transactionScreenshotUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 flex items-center justify-center"
                    title="Open in new tab"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 border-b pb-2">
                Additional Information
              </h3>
              <div className="text-sm text-slate-700 dark:text-slate-300 space-y-2">
                <p><strong>Description:</strong> {selectedInvoice.description || 'No additional information available.'}</p>
                {selectedInvoice.userId && (
                  <p><strong>User ID:</strong> {selectedInvoice.userId}</p>
                )}
                {selectedInvoice.userName && (
                  <p><strong>User Name:</strong> {selectedInvoice.userName}</p>
                )}
                {selectedInvoice.userPhone && (
                  <p><strong>Contact:</strong> {selectedInvoice.userPhone}</p>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <p>No payment details available.</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PaymentsPage;
