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
} from 'firebase/firestore';
import { db } from '../../services/firebase';
import { format } from 'date-fns';
import { CalendarDays, Mail, Phone, Pencil, Info } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import { PlatformAuditLog } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce';

interface ContactRequest {
  id: string;
  email: string;
  message: string;
  name: string;
  phone: string;
  propertyId: string;
  propertyType: string;
  status: string;
  submittedBy: string;
  timestamp: Timestamp;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in-progress':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'rejected':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const BuySellRequestPage: React.FC = () => {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ContactRequest | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchFilters, setSearchFilters] = useState({ term: '', status: '' });
  const [currentPage, setCurrentPage] = useState(0);
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [prevCursors, setPrevCursors] = useState<DocumentSnapshot[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [updateFormData, setUpdateFormData] = useState<Partial<ContactRequest>>({});
  const { currentUser, isLoadingAuth } = useAuth();

  const contactStatusOptions: ContactRequest['status'][] = [
    'pending',
    'in-progress',
    'completed',
    'rejected',
  ];

  const fetchContactRequests = async (
    page: number,
    direction: 'next' | 'prev' | 'first' = 'first',
    filters: { name?: string; email?: string; phone?: string; status?: string } = {}
  ) => {
    if (!currentUser || isLoadingAuth) return;

    console.log(`[DEBUG] ContactRequestsPage: Fetching requests for page: ${page} | Direction: ${direction}`);
    setLoading(true);
    try {
      let q = query(collection(db, 'contact_requests'), orderBy('timestamp', 'desc'), limit(rowsPerPage));

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (direction === 'next' && lastVisible) {
        q = query(q, startAfter(lastVisible));
      } else if (direction === 'prev' && prevCursors[page - 1]) {
        q = query(q, startAfter(prevCursors[page - 1]));
      }

      const snapshot = await getDocs(q);
      console.log(`[DEBUG] ContactRequestsPage: Read from 'contact_requests' | Total documents: ${snapshot.size}`);
      let data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          email: raw.email || '',
          message: raw.message || '',
          name: raw.name || '',
          phone: raw.phone || '',
          propertyId: raw.propertyId || '',
          propertyType: raw.propertyType || '',
          status: raw.status || 'pending',
          submittedBy: raw.submittedBy || '',
          timestamp: raw.timestamp,
          updatedAt: raw.updatedAt || Timestamp.now(),
          updatedBy: raw.updatedBy || '',
        };
      });

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
      console.error('[DEBUG] ContactRequestsPage: Error fetching contact requests:', error);
      setError('Failed to fetch contact requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = debounce(() => {
    setCurrentPage(0);
    fetchContactRequests(0, 'first', {
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
    fetchContactRequests(newPage, direction, {
      name: searchFilters.term,
      email: searchFilters.term,
      phone: searchFilters.term,
      status: searchFilters.status,
    });
  };

  const openEditModal = (request: ContactRequest) => {
    console.log('[DEBUG] ContactRequestsPage: Opening edit modal for request:', request.id);
    setSelectedRequest(request);
    setUpdateFormData({
      status: request.status,
      name: request.name,
      email: request.email,
      propertyType: request.propertyType,
    });
    setIsEditOpen(true);
  };

  const openInfoModal = (request: ContactRequest) => {
    console.log('[DEBUG] ContactRequestsPage: Opening info modal for request:', request.id);
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
      const requestRef = doc(db, 'contact_requests', selectedRequest.id);
      const currentTime = Timestamp.fromDate(new Date());
      const updateData: Partial<ContactRequest> = { ...updateFormData, updatedAt: currentTime, updatedBy: currentUser.id };
      await updateDoc(requestRef, updateData);

      const changes = Object.keys(updateData).reduce((acc, key) => {
        const oldVal = selectedRequest[key as keyof ContactRequest];
        const newVal = updateData[key as keyof ContactRequest];
        if (oldVal !== newVal && key !== 'updatedAt' && key !== 'updatedBy') {
          acc[key] = { from: oldVal, to: newVal };
        }
        return acc;
      }, {} as Record<string, { from: any; to: any }>);

      if (Object.keys(changes).length > 0) {
        await PlatformAuditLog({
          actionType: 'UPDATE_CONTACT_REQUEST',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            phone: currentUser.phone || '',
          },
          targetEntityId: selectedRequest.id,
          targetEntityType: 'contactRequest',
          targetEntityDescription: selectedRequest.name || selectedRequest.id,
          actionDescription: `Updated contact request: ${Object.entries(changes)
            .map(([key, { from, to }]) => `${key} from "${from}" to "${to}"`)
            .join(', ')}`,
          timestamp: currentTime,
          details: changes,
        });
      }

      setIsEditOpen(false);
      console.log('[DEBUG] ContactRequestsPage: Request updated successfully');
      fetchContactRequests(currentPage, 'first', {
        name: searchFilters.term,
        email: searchFilters.term,
        phone: searchFilters.term,
        status: searchFilters.status,
      });
    } catch (error) {
      console.error('[DEBUG] ContactRequestsPage: Error updating request:', error);
      setError('Failed to update contact request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white min-h-screen shadow-lg rounded-lg">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <h1 className="text-2xl font-extrabold text-gray-900 mb-5 border-b-2 border-gray-200 pb-2">Contact Requests</h1>

      {/* Summary Card */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h3 className="text-md font-semibold text-gray-700">Total Requests</h3>
        <p className="text-xl font-bold text-indigo-700">{requests.length}</p>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search</label>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="w-full mt-1 p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500"
              value={searchFilters.term}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, term: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Filter by Status</label>
            <select
              value={searchFilters.status}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full mt-1 p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All Statuses</option>
              {contactStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Rows per Page</label>
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setCurrentPage(0);
                setLastVisible(null);
                setPrevCursors([]);
                setHasMore(true);
              }}
              className="w-full mt-1 p-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-purple-500"
            >
              {[5, 10, 15, 20].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contact Requests Table */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        {loading ? (
          <p className="text-center text-gray-600 p-4">Fetching requests...</p>
        ) : requests.length === 0 ? (
          <p className="text-center text-gray-600 p-4">No contact requests found.</p>
        ) : (
          <PaginatedTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'propertyType', label: 'Property Type' },
              { key: 'status', label: 'Status' },
              { key: 'timestamp', label: 'Submitted At' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={requests}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            hasMore={hasMore}
            renderRow={(request) => (
              <>
                <td className="p-2">
                  <span className="text-gray-900">{request.name}</span>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Mail size={14} />
                    <span>{request.email}</span>
                  </div>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1 text-gray-600">
                    <Phone size={14} />
                    <span>{request.phone}</span>
                  </div>
                </td>
                <td className="p-2">
                  <span className="text-blue-700">{request.propertyType || '—'}</span>
                </td>
                <td className="p-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(request.status)}`}>
                    {request.status}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1 text-gray-500">
                    <CalendarDays size={14} />
                    <span>{format(request.timestamp.toDate(), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                </td>
                <td className="p-2 flex gap-2">
                  <button
                    aria-label="View Request Info"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => openInfoModal(request)}
                  >
                    <Info size={18} />
                  </button>
                  <button
                    aria-label="Edit Request"
                    className="text-yellow-600 hover:text-yellow-800"
                    onClick={() => openEditModal(request)}
                  >
                    <Pencil size={18} />
                  </button>
                </td>
              </>
            )}
          />
        )}
      </div>

      {/* Modals */}
      <Modal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="Contact Request Info">
        {selectedRequest && (
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Request Details</h3>
              <p><strong>Name:</strong> {selectedRequest.name}</p>
              <p><strong>Email:</strong> {selectedRequest.email}</p>
              <p><strong>Phone:</strong> {selectedRequest.phone}</p>
              <p><strong>Property Type:</strong> {selectedRequest.propertyType}</p>
              <p><strong>Property ID:</strong> {selectedRequest.propertyId}</p>
              <p><strong>Status:</strong> {selectedRequest.status}</p>
              <p><strong>Message:</strong> {selectedRequest.message}</p>
              <p><strong>Submitted By:</strong> {selectedRequest.submittedBy}</p>
              <p><strong>Submitted At:</strong> {format(selectedRequest.timestamp.toDate(), 'dd MMM yyyy, hh:mm a')}</p>
              <p><strong>Updated At:</strong> {selectedRequest.updatedAt && typeof selectedRequest.updatedAt.toDate === 'function' ? format(selectedRequest.updatedAt.toDate(), 'dd MMM yyyy, hh:mm a') : '—'}</p>
            </div>
            <div className="flex justify-end">
              <button
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setIsInfoOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {selectedRequest && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Contact Request">
          <form onSubmit={(e) => { e.preventDefault(); handleRequestUpdate(); }} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={updateFormData.name || ''}
                onChange={handleUpdateFormChange}
                className="w-full mt-1 p-2 border border-gray-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={updateFormData.email || ''}
                onChange={handleUpdateFormChange}
                className="w-full mt-1 p-2 border border-gray-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Property Type</label>
              <input
                type="text"
                name="propertyType"
                value={updateFormData.propertyType || ''}
                onChange={handleUpdateFormChange}
                className="w-full mt-1 p-2 border border-gray-200 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                name="status"
                value={updateFormData.status || 'pending'}
                onChange={handleUpdateFormChange}
                className="w-full mt-1 p-2 border border-gray-200 rounded-md"
              >
                {contactStatusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="px-3 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                onClick={() => setIsEditOpen(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
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

export default BuySellRequestPage;