import React, { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  orderBy,
  query,
  limit,
  startAfter,
  DocumentSnapshot,
  where,
  updateDoc,
  doc,
  Timestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { CallbackRequest } from '../../types';
import { CalendarDays, Phone, Mail, Pencil, Info } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import { PlatformAuditLog } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce';

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'New':
      return 'bg-blue-100 text-blue-800';
    case 'Contacted':
      return 'bg-yellow-100 text-yellow-800';
    case 'Unreached':
      return 'bg-gray-100 text-gray-800';
    case 'Dropped':
      return 'bg-red-100 text-red-800';
    case 'ConvertedtoLead':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const CallbackRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<CallbackRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<CallbackRequest | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchFilters, setSearchFilters] = useState({
    term: '',
    status: '',
  });
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [prevCursors, setPrevCursors] = useState<DocumentSnapshot[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [updateFormData, setUpdateFormData] = useState<Partial<CallbackRequest>>({});
  const { currentUser, isLoadingAuth } = useAuth();

  const callbackStatusOptions: CallbackRequest['status'][] = [
    'New',
    'Contacted',
    'Unreached',
    'Dropped',
    'ConvertedtoLead',
  ];

  const fetchCallbackRequests = async (
    page: number,
    direction: 'next' | 'prev' | 'first' = 'first',
    filters: { name?: string; email?: string; phone?: string; status?: string } = {}
  ) => {
    if (!currentUser || isLoadingAuth) return;

    console.log(`[DEBUG] CallbackRequestsPage: Fetching requests for page: ${page} | Direction: ${direction}`);
    setLoading(true);
    try {
      let q = query(collection(db, 'callbackRequests'), orderBy('timestamp', 'desc'), limit(rowsPerPage));

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (direction === 'next' && lastVisible) {
        q = query(q, startAfter(lastVisible));
      } else if (direction === 'prev' && prevCursors[page - 1]) {
        q = query(q, startAfter(prevCursors[page - 1]));
      }

      const snapshot = await getDocs(q);
      console.log(`[DEBUG] CallbackRequestsPage: Read from 'callbackRequests' | Total documents: ${snapshot.size}`);
      let data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          name: raw.name || '',
          email: raw.email || '',
          phone: raw.phone || '',
          serviceNeeded: raw.serviceNeeded || '',
          message: raw.message || '',
          timestamp: raw.timestamp,
          status: raw.status || 'New',
          updatedAt: raw.updatedAt || Timestamp.now(),
          updatedBy: raw.updatedBy || '',
        };
      });

      // Client-side filtering for name, email, and phone
      if (filters.name || filters.email || filters.phone) {
        const term = (filters.name || filters.email || filters.phone || '').toLowerCase();
        data = data.filter(
          (req) =>
            req.name.toLowerCase().includes(term) ||
            req.email.toLowerCase().includes(term) ||
            req.phone.toLowerCase().includes(term)
        );
      }

      setRequests(data);
      setHasMore(data.length === rowsPerPage);

      const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
      if (direction === 'next' && newLastVisible) {
        setPrevCursors((prev) => [...prev.slice(0, page), lastVisible].filter((cursor): cursor is DocumentSnapshot => cursor !== null));
        setLastVisible(newLastVisible);
      } else if (direction === 'prev') {
        setLastVisible(prevCursors[page - 1] || null);
        setPrevCursors((prev) => prev.slice(0, page - 1));
      } else {
        setLastVisible(newLastVisible || null);
        setPrevCursors([]);
      }
    } catch (error) {
      console.error('[DEBUG] CallbackRequestsPage: Error fetching callback requests:', error);
      setError('Failed to fetch callback requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = debounce(() => {
    setCurrentPage(0);
    fetchCallbackRequests(0, 'first', {
      name: searchFilters.term,
      email: searchFilters.term,
      phone: searchFilters.term,
      status: searchFilters.status,
    });
  }, 300);

  useEffect(() => {
    if (!currentUser || isLoadingAuth) return;
    debouncedSearch();
    return () => debouncedSearch.cancel();
  }, [searchFilters, rowsPerPage, currentUser, isLoadingAuth]);

  const handlePageChange = (newPage: number) => {
    const direction = newPage > currentPage ? 'next' : newPage < currentPage ? 'prev' : 'first';
    setCurrentPage(newPage);
    fetchCallbackRequests(newPage, direction, {
      name: searchFilters.term,
      email: searchFilters.term,
      phone: searchFilters.term,
      status: searchFilters.status,
    });
  };

  const openEditModal = (request: CallbackRequest) => {
    console.log('[DEBUG] CallbackRequestsPage: Opening edit modal for request:', request.id);
    setSelectedRequest(request);
    setUpdateFormData({
      status: request.status,
      name: request.name,
      email: request.email,
      serviceNeeded: request.serviceNeeded,
    });
    setIsEditOpen(true);
  };

  const openInfoModal = (request: CallbackRequest) => {
    console.log('[DEBUG] CallbackRequestsPage: Opening info modal for request:', request.id);
    setSelectedRequest(request);
    setIsInfoOpen(true);
  };

  const handleUpdateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUpdateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRequestUpdate = async () => {
    if (!selectedRequest || !currentUser) return;

    setLoading(true);
    try {
      const requestRef = doc(db, 'callbackRequests', selectedRequest.id);
      const currentTime = Timestamp.fromDate(new Date());
      const updateData: Partial<CallbackRequest> = { ...updateFormData, updatedAt: currentTime };
      await updateDoc(requestRef, updateData);

      const changes = Object.keys(updateData).reduce((acc, key) => {
        const oldVal = selectedRequest[key as keyof CallbackRequest];
        const newVal = updateData[key as keyof CallbackRequest];
        if (oldVal !== newVal && key !== 'updatedAt') {
          acc[key] = { from: oldVal, to: newVal };
        }
        return acc;
      }, {} as Record<string, { from: any; to: any }>);

      if (Object.keys(changes).length > 0) {
        await PlatformAuditLog({
          actionType: 'UPDATE_CALLBACK_REQUEST',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            phone: currentUser.phone || '',
          },
          targetEntityId: selectedRequest.id,
          targetEntityType: 'callbackRequest',
          targetEntityDescription: selectedRequest.name || selectedRequest.id,
          actionDescription: `Updated callback request: ${Object.entries(changes)
            .map(([key, { from, to }]) => `${key} from "${from}" to "${to}"`)
            .join(', ')}`,
          timestamp: currentTime,
          details: changes,
        });
      }

      if (updateData.status === 'ConvertedtoLead') {
        const leadRef = doc(collection(db, 'leads'));
        await setDoc(leadRef, {
          name: updateData.name || selectedRequest.name,
          email: updateData.email || selectedRequest.email,
          phone: selectedRequest.phone,
          serviceNeeded: updateData.serviceNeeded || selectedRequest.serviceNeeded,
          message: selectedRequest.message,
          originalRequestId: selectedRequest.id,
          createdAt: currentTime,
          status: 'New',
        });
        console.log('[DEBUG] CallbackRequestsPage: Added to leads collection:', selectedRequest.id);
        await PlatformAuditLog({
          actionType: 'CONVERT_CALLBACK_TO_LEAD',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            phone: currentUser.phone || '',
          },
          targetEntityId: leadRef.id,
          targetEntityType: 'lead',
          targetEntityDescription: selectedRequest.name || selectedRequest.id,
          actionDescription: `Converted callback request ${selectedRequest.id} to lead ${leadRef.id}`,
          timestamp: currentTime,
          details: { originalRequestId: selectedRequest.id },
        });
      }

      setIsEditOpen(false);
      console.log('[DEBUG] CallbackRequestsPage: Request updated successfully');
      fetchCallbackRequests(currentPage, 'first', {
        name: searchFilters.term,
        email: searchFilters.term,
        phone: searchFilters.term,
        status: searchFilters.status,
      });
    } catch (error) {
      console.error('[DEBUG] CallbackRequestsPage: Error updating request:', error);
      setError('Failed to update callback request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold">Callback Requests</h1>
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
              setLastVisible(null);
              setPrevCursors([]);
              setHasMore(true);
            }}
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="mb-4 flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Search</label>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            className="w-full border px-3 py-2 rounded text-sm"
            value={searchFilters.term}
            onChange={(e) => setSearchFilters((prev) => ({ ...prev, term: e.target.value }))}
          />
        </div>
        <div className="w-48">
          <label className="text-sm font-medium">Filter by Status</label>
          <select
          aria-label='Filter by Status'
            name="status"
            value={searchFilters.status}
            onChange={(e) => setSearchFilters((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {callbackStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
      {loading ? (
        <p className="text-gray-500">Searching...</p>
      ) : requests.length === 0 ? (
        <p className="text-gray-500">No callback requests found.</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'phone', label: 'Phone' },
            { key: 'serviceNeeded', label: 'Service Needed' },
            { key: 'status', label: 'Status' },
            { key: 'message', label: 'Message' },
            { key: 'timestamp', label: 'Requested At' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={requests}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          hasMore={hasMore}
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
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(req.status)}`}>
                  {req.status || 'New'}
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
              <td className="px-4 py-3 flex gap-2">
                <button
                  aria-label="View Request Info"
                  className="text-blue-600 hover:text-blue-800 transition"
                  onClick={() => openInfoModal(req)}
                >
                  <Info size={18} />
                </button>
                {req.status !== 'ConvertedtoLead' && (
                  <button
                    aria-label="Edit Request"
                    className="text-yellow-600 hover:text-yellow-800 transition"
                    onClick={() => openEditModal(req)}
                  >
                    <Pencil size={18} />
                  </button>
                )}
              </td>
            </>
          )}
        />
      )}
      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Callback Request Info"
      >
        {selectedRequest && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Request Details</h3>
              <p><strong>Name:</strong> {selectedRequest.name}</p>
              <p><strong>Email:</strong> {selectedRequest.email}</p>
              <p><strong>Phone:</strong> {selectedRequest.phone}</p>
              <p><strong>Service Needed:</strong> {selectedRequest.serviceNeeded}</p>
              <p><strong>Status:</strong> {selectedRequest.status}</p>
              <p><strong>Message:</strong> {selectedRequest.message}</p>
              <p>
                <strong>Requested At:</strong>{' '}
                {format(selectedRequest.timestamp.toDate(), 'dd MMM yyyy, hh:mm a')}
              </p>
              <p>
                <strong>Updated At:</strong>{' '}
                {selectedRequest.updatedAt && typeof selectedRequest.updatedAt.toDate === 'function'
                  ? format(selectedRequest.updatedAt.toDate(), 'dd MMM yyyy, hh:mm a')
                  : '—'}
              </p>
            </div>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setIsInfoOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {selectedRequest && (
        <Modal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          title="Update Callback Request"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRequestUpdate();
            }}
            className="space-y-4"
          >
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
              aria-label='Name'
                type="text"
                name="name"
                value={updateFormData.name || ''}
                onChange={handleUpdateFormChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
              aria-label='email'
                type="email"
                name="email"
                value={updateFormData.email || ''}
                onChange={handleUpdateFormChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Service Needed</label>
              <input
              aria-label='serviceNeeded'
                type="text"
                name="serviceNeeded"
                value={updateFormData.serviceNeeded || ''}
                onChange={handleUpdateFormChange}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
              aria-label='Status'
                name="status"
                value={updateFormData.status || 'New'}
                onChange={handleUpdateFormChange}
                className="w-full p-2 border rounded"
              >
                {callbackStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default CallbackRequestsPage;