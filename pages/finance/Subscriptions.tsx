import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit, startAfter, DocumentSnapshot, updateDoc, doc, Timestamp, where, getDocs, getDoc, writeBatch } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Payment } from '../../types';
import { format } from 'date-fns';
import { Info, Pencil } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import EditEntityModal from '../../components/ui/EditEntityModal';
import EmployeeTypeahead from '../../components/ui/EmployeeTypeahead';
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
  const [propertyDetails, setPropertyDetails] = useState<Record<string, any>>({});
  const [selectedProperty, setSelectedProperty] = useState<any>(null);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
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

  // Fetch property details for a subscription
  const fetchPropertyDetails = async (propertyIds: string[]) => {
    if (!propertyIds || propertyIds.length === 0) return {};
    
    try {
      const propertiesRef = collection(db, 'properties');
      const q = query(propertiesRef, where('__name__', 'in', propertyIds));
      const querySnapshot = await getDocs(q);
      
      const details: Record<string, any> = {};
      querySnapshot.forEach((doc) => {
        details[doc.id] = doc.data();
      });
      
      return details;
    } catch (error) {
      console.error('Error fetching property details:', error);
      return {};
    }
  };

  // Update property details when selected payment changes
  useEffect(() => {
    if (selectedPayment?.propertyIds?.length > 0) {
      fetchPropertyDetails(selectedPayment.propertyIds).then(details => {
        setPropertyDetails(details);
      });
    } else {
      setPropertyDetails({});
    }
  }, [selectedPayment]);

  // Handle view property details
  const handleViewProperty = (propertyId: string) => {
    const property = propertyDetails[propertyId];
    if (property) {
      setSelectedProperty({
        id: propertyId,
        ...property
      });
      setIsPropertyModalOpen(true);
    }
  };

  const handlePaymentUpdate = async (updatedData: Partial<Payment>) => {
    if (!selectedPayment || !currentUser) return;

    const paymentRef = doc(db, 'premium_subscriptions', selectedPayment.id);
    const currentTime = Timestamp.fromDate(new Date());
    const batch = writeBatch(db);

    // If assignedEmployee is an object from typeahead, denormalize
    if (updatedData.assignedEmployee) {
      const emp = updatedData.assignedEmployee as any;
      if (emp.id && emp.name && emp.email) {
        updatedData.assignedEmployeeId = emp.id;
        updatedData.assignedEmployeeName = emp.name;
        updatedData.assignedEmployee = emp.email;
        updatedData.assignedEmployee = emp.email; // Store email as string
      }
    } else if (updatedData.assignedEmployee === null || updatedData.assignedEmployee === '') {
      // Handle unassign case
      updatedData.assignedEmployeeId = '';
      updatedData.assignedEmployeeName = '';
      updatedData.assignedEmployee = '';
       
    }

    // Create a clean update object with only the fields that have changed
    const updateObj: Record<string, any> = {};
    const changes: Record<string, { from: any; to: any }> = {};

    // Check each field in updatedData
    Object.entries(updatedData).forEach(([key, value]) => {
      const oldVal = selectedPayment[key as keyof Payment];
      
      // Only include changed fields in the update
      if (JSON.stringify(oldVal) !== JSON.stringify(value)) {
        updateObj[key] = value;
        changes[key] = { from: oldVal, to: value };
      }
    });

    // If no changes, return early
    if (Object.keys(updateObj).length === 0) {
      console.log('No changes detected');
      setIsEditOpen(false);
      return;
    }

    // Add updatedAt timestamp
    updateObj.updatedAt = currentTime;
    
    try {
      // 1. Update the payment document
      batch.update(paymentRef, updateObj);

      // 2. Update property documents with the assigned employee
      if (selectedPayment.propertyIds?.length > 0) {
        const propertiesToUpdate = selectedPayment.propertyIds.map(propertyId => {
          const propertyRef = doc(db, 'properties', propertyId);
          return { ref: propertyRef, id: propertyId };
        });

        // Get all property documents
        const propertySnapshots = await Promise.all(
          propertiesToUpdate.map(p => getDoc(p.ref))
        );

        // Update each property with the new assigned employee
        propertySnapshots.forEach((propertyDoc, index) => {
          if (propertyDoc.exists()) {
            const propertyData = propertyDoc.data();
            const propertyId = propertiesToUpdate[index].id;
            const propertyRef = doc(db, 'properties', propertyId);
            
            // Prepare property update
            const propertyUpdate: any = {
              assignedEmployeeId: updateObj.assignedEmployeeId || '',
              assignedEmployeeName: updateObj.assignedEmployeeName || '',
              assignedEmployee: updateObj.assignedEmployee|| '',
              updatedAt: currentTime
            };
            
            // Only update if there are changes
            if (propertyData.assignedEmployeeId !== propertyUpdate.assignedEmployeeId) {
              batch.update(propertyRef, propertyUpdate);
            }
          }
        });
      }

      // 3. Update the employee's assigned properties
      if (updateObj.assignedEmployeeId && selectedPayment.propertyIds?.length > 0) {
        const employeeRef = doc(db, 'employees', updateObj.assignedEmployeeId);
        const employeeDoc = await getDoc(employeeRef);
        
        if (employeeDoc.exists()) {
          const currentAssignedProperties = employeeDoc.data()?.assignedProperties || [];
          const updatedProperties = [...new Set([...currentAssignedProperties, ...(selectedPayment.propertyIds || [])])];
          
          batch.update(employeeRef, {
            assignedProperties: updatedProperties,
            updatedAt: currentTime
          });
        }
      }

      // 4. If there was a previous employee, remove these properties from them
      if (selectedPayment.assignedEmployeeId && 
          selectedPayment.assignedEmployeeId !== updateObj.assignedEmployeeId && 
          selectedPayment.propertyIds?.length > 0) {
        
        const prevEmployeeRef = doc(db, 'employees', selectedPayment.assignedEmployeeId);
        const prevEmployeeDoc = await getDoc(prevEmployeeRef);
        
        if (prevEmployeeDoc.exists()) {
          const prevAssignedProperties = prevEmployeeDoc.data()?.assignedProperties || [];
          const updatedProperties = prevAssignedProperties.filter(
            (propId: string) => !selectedPayment.propertyIds?.includes(propId)
          );
          
          batch.update(prevEmployeeRef, {
            assignedProperties: updatedProperties,
            updatedAt: currentTime
          });
        }
      }

      // Commit all updates in a single transaction
      await batch.commit();

      if (Object.keys(changes).length > 0) {
        // Create audit log entry
        const auditLog = {
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
          targetEntityDescription: `Payment by ${selectedPayment.submittedBy || 'unknown'}`,
          actionDescription: `Updated payment: ${Object.entries(changes)
            .map(([key, { from, to }]) => {
              // Format the change for better readability
              if (key === 'assignedEmployeeId') {
                const oldName = selectedPayment.assignedEmployeeName || from || 'Unassigned';
                const newName = updateObj.assignedEmployeeName || to || 'Unassigned';
                return `assigned employee from "${oldName}" to "${newName}"`;
              }
              return `${key} from "${from}" to "${to}"`;
            })
            .join(', ')}`,
          timestamp: currentTime,
          details: {
            ...changes,
            // Include additional context
            paymentId: selectedPayment.id,
            amount: selectedPayment.amount,
            serviceType: selectedPayment.serviceType,
            propertyCount: selectedPayment.propertyIds?.length || 0
          },
        };

        await PlatformAuditLog(auditLog);
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
            { key: 'amount', label: 'amount'},
            { key: 'actions', label: 'Actions' }
            
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
              <td className="px-4 py-2">{payment.amount}</td>
              <td className="px-4 py-2 flex gap-2">
              <button
                  aria-label="Edit Payment"
                  className="text-yellow-600 hover:text-yellow-800 transition"
                  onClick={() => openEditModal(payment)}
                >
                  <Pencil size={18} />
                </button>
                <button
                  aria-label="View Payment Details"
                  className="text-blue-600 hover:text-blue-800 transition"
                  onClick={() => openInfoModal(payment)}
                >
                  <Info size={18} />
                </button>
                
              </td>
              
            </>
          )}
        />
      )}

      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Payment Details"
        size="xl"
      >
        {selectedPayment ? (
          <div className="space-y-6">
            {/* Transaction Screenshot */}
            {selectedPayment.transactionScreenshot && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 border-b pb-2">
                  Transaction Proof
                </h3>
                <div className="relative">
                  <img 
                    src={selectedPayment.transactionScreenshot}
                    alt="Transaction Screenshot"
                    className="max-w-full h-auto rounded border border-slate-200 dark:border-slate-700 mx-auto cursor-pointer"
                    style={{ maxHeight: '500px' }}
                    onClick={() => {
                      setSelectedImage(selectedPayment.transactionScreenshot);
                      setIsInfoOpen(false);
                      setIsImageModalOpen(true);
                    }}
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
                  <button 
                    onClick={() => {
                      setSelectedImage(selectedPayment.transactionScreenshot);
                      setIsInfoOpen(false);
                      setIsImageModalOpen(true);
                    }}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-75 flex items-center justify-center"
                    title="View full size"
                    style={{ width: '32px', height: '32px' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Payment Details */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-slate-100 border-b pb-2">
                Payment Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p><strong>Submitted By:</strong> {selectedPayment.submittedBy || '-'}</p>
                  <p><strong>Service Type:</strong> {selectedPayment.serviceType || '-'}</p>
                  <p><strong>Number of Properties:</strong> {selectedPayment.numberOfProperties || '0'}</p>
                  <p><strong>Status:</strong> 
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedPayment.status === 'pending' 
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : selectedPayment.status === 'verified' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {selectedPayment.status}
                    </span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p><strong>Amount:</strong> ₹{selectedPayment.amount?.toLocaleString('en-IN') || '0'}</p>
                  <p><strong>Subscribed At:</strong> {selectedPayment.subscribedAt ? format(selectedPayment.subscribedAt, 'dd MMM yyyy, hh:mm a') : '-'}</p>
                  <p><strong>Start Date:</strong> {selectedPayment.startDate ? format(selectedPayment.startDate, 'dd MMM yyyy') : '-'}</p>
                  <p><strong>End Date:</strong> {selectedPayment.endDate ? format(selectedPayment.endDate, 'dd MMM yyyy') : '-'}</p>
                  <p><strong>Updated At:</strong> {selectedPayment.updatedAt ? format(selectedPayment.updatedAt, 'dd MMM yyyy, hh:mm a') : '-'}</p>
                </div>
              </div>
              
              {selectedPayment.propertyIds?.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="font-medium mb-2">Properties ({selectedPayment.propertyIds.length}):</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg space-y-3">
                    {selectedPayment.propertyIds.map((id) => {
                      const property = propertyDetails[id];
                      return (
                        <div key={id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium text-slate-900 dark:text-white">
                                {property?.name || 'Property'} (ID: {id})
                              </h5>
                              {property && (
                                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                                  {property.propertyType && (
                                    <p><span className="font-medium">Type:</span> {property.propertyType}</p>
                                  )}
                                  {property.address && (
                                    <p><span className="font-medium">Address:</span> {property.address}</p>
                                  )}
                                  {property.status && (
                                    <p>
                                      <span className="font-medium">Status:</span>{' '}
                                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        property.status === 'verified' 
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                          : property.status === 'pending'
                                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                      }`}>
                                        {property.status}
                                      </span>
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewProperty(id);
                              }}
                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
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
      {selectedPayment && (
        <EditEntityModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          entityType="payment"
          entityId={selectedPayment.id}
          entityData={{
            status: selectedPayment.status || 'awaiting_verification',
            serviceType: selectedPayment.serviceType || '',
            // assignedEmployee: selectedPayment.assignedEmployee || '',
            assignedEmployeeName: selectedPayment.assignedEmployeeName || '',
            assignedEmployee: selectedPayment.assignedEmployee || '',
            assignedEmployeeId: selectedPayment.assignedEmployeeId || '',
          }}
          editableFields={['status', 'serviceType', 'assignedEmployee']}
          onSave={async (updatedData) => {
            // If assignedEmployee is an object from typeahead, denormalize
            if (updatedData.assignedEmployee && typeof updatedData.assignedEmployee === 'object' && updatedData.assignedEmployee !== null) {
              updatedData.assignedEmployeeId = updatedData.assignedEmployee.id;
              updatedData.assignedEmployeeName = updatedData.assignedEmployee.name;
              updatedData.assignedEmployee = updatedData.assignedEmployee.email;
              // updatedData.assignedEmployee = updatedData.assignedEmployee.email;
            } else if (updatedData.assignedEmployee === null || updatedData.assignedEmployee === '') {
              // Handle unassign case
              updatedData.assignedEmployeeId = '';
              updatedData.assignedEmployeeName = '';
              updatedData.assignedEmployee = '';
              // updatedData.assignedEmployee = '';
            }
            await handlePaymentUpdate(updatedData);
          }}
          currentUser={currentUser}
          renderField={(field, value, setValue) => {
            if (field === 'status') {
              return (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium capitalize">Status</label>
                  <select
                    value={value || ''}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full border px-3 py-2 rounded text-black dark:text-white"
                  >
                    <option value="awaiting_verification">Awaiting Verification</option>
                    <option value="verified">Verified</option>
                  </select>
                </div>
              );
            }
            
            if (field === 'serviceType') {
              return (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium capitalize">Service Type</label>
                  <select
                    value={value || ''}
                    onChange={(e) => setValue(e.target.value)}
                    className="w-full border px-3 py-2 rounded text-black dark:text-white"
                  >
                    <option value="">Select Service Type</option>
                    <option value="Apartment Management">Apartment Management</option>
                    <option value="Commercial Space Management">Commercial Space Management</option>
                    <option value="Plot Management">Plot Management</option>
                  </select>
                </div>
              );
            }

            if (field === 'assignedEmployee') {
              return (
                <div className="flex flex-col gap-1">
                  <EmployeeTypeahead
                    value={value && typeof value === 'object' ? value : (selectedPayment.assignedEmployeeId ? {
                      id: selectedPayment.assignedEmployeeId,
                      name: selectedPayment.assignedEmployeeName || '',
                      email: selectedPayment.assignedEmployee || '',
                    } : null)}
                    onChange={setValue}
                    allowUnassign={true}
                    currentAssignee={selectedPayment.assignedEmployeeId ? {
                      id: selectedPayment.assignedEmployeeId,
                      name: selectedPayment.assignedEmployeeName || selectedPayment.assignedEmployee || 'Unknown',
                      email: selectedPayment.assignedEmployee || 'unknown@example.com',
                    } : null}
                    label="Assign Employee"
                  />
                </div>
              );
            }

            return null;
          }}
        />
      )}

      {/* Property Details Modal */}
      <Modal
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        title={selectedProperty?.name || 'Property Details'}
        size="lg"
      >
        {selectedProperty ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">ID:</span> {selectedProperty.id}</p>
                  {selectedProperty.propertyType && (
                    <p><span className="font-medium">Type:</span> {selectedProperty.propertyType}</p>
                  )}
                  {selectedProperty.status && (
                    <p>
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        selectedProperty.status === 'verified' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : selectedProperty.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {selectedProperty.status}
                      </span>
                    </p>
                  )}
                  {selectedProperty.createdAt && (
                    <p><span className="font-medium">Created:</span> {format(selectedProperty.createdAt.toDate(), 'dd MMM yyyy')}</p>
                  )}
                  
                  {/* Assigned Employee Section */}
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="font-medium mb-1">Assigned Employee:</p>
                    {selectedProperty.assignedEmployeeId ? (
                      <div className="flex items-center space-x-2">
                        {selectedProperty.assignedEmployeeAvatar ? (
                          <img 
                            src={selectedProperty.assignedEmployeeAvatar} 
                            alt={selectedProperty.assignedEmployeeName || 'Employee'}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/images/avatar-placeholder.png';
                            }}
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                              {selectedProperty.assignedEmployeeName ? selectedProperty.assignedEmployeeName.charAt(0).toUpperCase() : 'E'}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">
                            {selectedProperty.assignedEmployeeName || 'Unnamed Employee'}
                          </p>
                          {selectedProperty.assignedEmployee && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {selectedProperty.assignedEmployee}
                            </p>
                          )}
                          {selectedProperty.assignedEmployeePhone && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {selectedProperty.assignedEmployeePhone}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center text-slate-500 dark:text-slate-400 text-sm">
                        <span>No employee assigned</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Location</h4>
                <div className="space-y-2 text-sm">
                  {selectedProperty.address && (
                    <p><span className="font-medium">Address:</span> {selectedProperty.address}</p>
                  )}
                  {selectedProperty.area && (
                    <p><span className="font-medium">Area:</span> {selectedProperty.area}</p>
                  )}
                  {selectedProperty.city && (
                    <p><span className="font-medium">City:</span> {selectedProperty.city}</p>
                  )}
                  {selectedProperty.state && (
                    <p><span className="font-medium">State:</span> {selectedProperty.state}</p>
                  )}
                  {selectedProperty.pincode && (
                    <p><span className="font-medium">Pincode:</span> {selectedProperty.pincode}</p>
                  )}
                </div>
              </div>
            </div>

            {selectedProperty.description && (
              <div className="mt-4">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Description</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300">{selectedProperty.description}</p>
              </div>
            )}

            {selectedProperty.amenities?.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-slate-900 dark:text-white mb-2">Amenities</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProperty.amenities.map((amenity: string, idx: number) => (
                    <span key={idx} className="bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-200">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p>Loading property details...</p>
        )}
      </Modal>
    </div>
  );
};

export default SubscriptionsPage;