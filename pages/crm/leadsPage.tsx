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
import { CalendarDays, Phone, Mail, Pencil, Info } from 'lucide-react';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import { PlatformAuditLog } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce';

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  serviceNeeded: string;
  message: string;
  originalRequestId: string;
  createdAt: Timestamp;
  status: string;
  updatedAt?: Timestamp;
  updatedBy?: string;
}

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'New':
      return 'bg-blue-100 text-blue-800';
    case 'Contacted':
      return 'bg-yellow-100 text-yellow-800';
    case 'Qualified':
      return 'bg-purple-100 text-purple-800';
    case 'Proposal Sent':
      return 'bg-gray-100 text-gray-800';
    case 'Converted':
      return 'bg-green-100 text-green-800';
    case 'Dropped':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const LeadsDashboard: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
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
  const [updateFormData, setUpdateFormData] = useState<Partial<Lead>>({});
  const { currentUser, isLoadingAuth } = useAuth();

  const leadStatusOptions: Lead['status'][] = [
    'New',
    'Contacted',
    'Qualified',
    'Proposal Sent',
    'Converted',
    'Dropped',
  ];

  const fetchLeads = async (
    page: number,
    direction: 'next' | 'prev' | 'first' = 'first',
    filters: { name?: string; email?: string; phone?: string; status?: string } = {}
  ) => {
    if (!currentUser || isLoadingAuth) return;

    console.log(`[DEBUG] LeadsDashboard: Fetching leads for page: ${page} | Direction: ${direction}`);
    setLoading(true);
    try {
      let q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(rowsPerPage));

      if (filters.status) {
        q = query(q, where('status', '==', filters.status));
      }

      if (direction === 'next' && lastVisible) {
        q = query(q, startAfter(lastVisible));
      } else if (direction === 'prev' && prevCursors[page - 1]) {
        q = query(q, startAfter(prevCursors[page - 1]));
      }

      const snapshot = await getDocs(q);
      console.log(`[DEBUG] LeadsDashboard: Read from 'leads' | Total documents: ${snapshot.size}`);
      let data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          name: raw.name || '',
          email: raw.email || '',
          phone: raw.phone || '',
          serviceNeeded: raw.serviceNeeded || '',
          message: raw.message || '',
          originalRequestId: raw.originalRequestId || '',
          createdAt: raw.createdAt,
          status: raw.status || 'New',
          updatedAt: raw.updatedAt || Timestamp.now(),
          updatedBy: raw.updatedBy || '',
        };
      });

      if (filters.name || filters.email || filters.phone) {
        const term = (filters.name || filters.email || filters.phone || '').toLowerCase();
        data = data.filter(
          (lead) =>
            lead.name.toLowerCase().includes(term) ||
            lead.email.toLowerCase().includes(term) ||
            lead.phone.toLowerCase().includes(term)
        );
      }

      setLeads(data);
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
      console.error('[DEBUG] LeadsDashboard: Error fetching leads:', error);
      setError('Failed to fetch leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const debouncedSearch = debounce(() => {
    setCurrentPage(0);
    fetchLeads(0, 'first', {
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
    fetchLeads(newPage, direction, {
      name: searchFilters.term,
      email: searchFilters.term,
      phone: searchFilters.term,
      status: searchFilters.status,
    });
  };

  const openEditModal = (lead: Lead) => {
    console.log('[DEBUG] LeadsDashboard: Opening edit modal for lead:', lead.id);
    setSelectedLead(lead);
    setUpdateFormData({
      status: lead.status,
      name: lead.name,
      email: lead.email,
      serviceNeeded: lead.serviceNeeded,
    });
    setIsEditOpen(true);
  };

  const openInfoModal = (lead: Lead) => {
    console.log('[DEBUG] LeadsDashboard: Opening info modal for lead:', lead.id);
    setSelectedLead(lead);
    setIsInfoOpen(true);
  };

  const handleUpdateFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setUpdateFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLeadUpdate = async () => {
    if (!selectedLead || !currentUser) return;

    setLoading(true);
    try {
      const leadRef = doc(db, 'leads', selectedLead.id);
      const currentTime = Timestamp.fromDate(new Date());
      const updateData: Partial<Lead> = { ...updateFormData, updatedAt: currentTime, updatedBy: currentUser.id };
      await updateDoc(leadRef, updateData);

      const changes = Object.keys(updateData).reduce((acc, key) => {
        const oldVal = selectedLead[key as keyof Lead];
        const newVal = updateData[key as keyof Lead];
        if (oldVal !== newVal && key !== 'updatedAt' && key !== 'updatedBy') {
          acc[key] = { from: oldVal, to: newVal };
        }
        return acc;
      }, {} as Record<string, { from: any; to: any }>);

      if (Object.keys(changes).length > 0) {
        await PlatformAuditLog({
          actionType: 'UPDATE_LEAD',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            phone: currentUser.phone || '',
          },
          targetEntityId: selectedLead.id,
          targetEntityType: 'lead',
          targetEntityDescription: selectedLead.name || selectedLead.id,
          actionDescription: `Updated lead: ${Object.entries(changes)
            .map(([key, { from, to }]) => `${key} from "${from}" to "${to}"`)
            .join(', ')}`,
          timestamp: currentTime,
          details: changes,
        });
      }

      setIsEditOpen(false);
      console.log('[DEBUG] LeadsDashboard: Lead updated successfully');
      fetchLeads(currentPage, 'first', {
        name: searchFilters.term,
        email: searchFilters.term,
        phone: searchFilters.term,
        status: searchFilters.status,
      });
    } catch (error) {
      console.error('[DEBUG] LeadsDashboard: Error updating lead:', error);
      setError('Failed to update lead. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Summary stats (approximated from current data)
  const totalLeads = leads.length;
  const statusCounts = leads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Leads Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Total Leads</h3>
          <p className="text-2xl font-bold text-indigo-600">{totalLeads}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">New Leads</h3>
          <p className="text-2xl font-bold text-blue-600">{statusCounts['New'] || 0}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-semibold text-gray-700">Converted Leads</h3>
          <p className="text-2xl font-bold text-green-600">{statusCounts['Converted'] || 0}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Search Leads</label>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
              value={searchFilters.term}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, term: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Filter by Status</label>
            <select
              value={searchFilters.status}
              onChange={(e) => setSearchFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              {leadStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
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
            className="w-24 mt-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500"
          >
            {[5, 10, 15, 20].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Leads Table with PaginatedTable */}
      <div className="bg-white rounded-lg shadow-md">
        {loading ? (
          <p className="text-center text-gray-500 p-4">Loading leads...</p>
        ) : leads.length === 0 ? (
          <p className="text-center text-gray-500 p-4">No leads found.</p>
        ) : (
          <PaginatedTable
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'serviceNeeded', label: 'Service Needed' },
              { key: 'status', label: 'Status' },
              { key: 'createdAt', label: 'Created At' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={leads}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            hasMore={hasMore}
            renderRow={(lead) => (
              <>
                <td className="p-3">
                  <span className="text-gray-800">{lead.name}</span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail size={14} />
                    <span>{lead.email}</span>
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone size={14} />
                    <span>{lead.phone}</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className="text-blue-600 font-medium">{lead.serviceNeeded || '—'}</span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(lead.status)}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 text-gray-500">
                    <CalendarDays size={14} />
                    <span>{format(lead.createdAt.toDate(), 'dd MMM yyyy, hh:mm a')}</span>
                  </div>
                </td>
                <td className="p-3 flex gap-2">
                  <button
                    aria-label="View Lead Info"
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => openInfoModal(lead)}
                  >
                    <Info size={18} />
                  </button>
                  <button
                    aria-label="Edit Lead"
                    className="text-yellow-600 hover:text-yellow-800"
                    onClick={() => openEditModal(lead)}
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
      <Modal isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} title="Lead Info">
        {selectedLead && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Lead Details</h3>
              <p><strong>Name:</strong> {selectedLead.name}</p>
              <p><strong>Email:</strong> {selectedLead.email}</p>
              <p><strong>Phone:</strong> {selectedLead.phone}</p>
              <p><strong>Service Needed:</strong> {selectedLead.serviceNeeded}</p>
              <p><strong>Status:</strong> {selectedLead.status}</p>
              <p><strong>Message:</strong> {selectedLead.message}</p>
              <p><strong>Original Request ID:</strong> {selectedLead.originalRequestId}</p>
              <p><strong>Created At:</strong> {format(selectedLead.createdAt.toDate(), 'dd MMM yyyy, hh:mm a')}</p>
              <p><strong>Updated At:</strong> {selectedLead.updatedAt && typeof selectedLead.updatedAt.toDate === 'function' ? format(selectedLead.updatedAt.toDate(), 'dd MMM yyyy, hh:mm a') : '—'}</p>
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

      {selectedLead && (
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Update Lead">
          <form onSubmit={(e) => { e.preventDefault(); handleLeadUpdate(); }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={updateFormData.name || ''}
                onChange={handleUpdateFormChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                value={updateFormData.email || ''}
                onChange={handleUpdateFormChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Service Needed</label>
              <input
                type="text"
                name="serviceNeeded"
                value={updateFormData.serviceNeeded || ''}
                onChange={handleUpdateFormChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                name="status"
                value={updateFormData.status || 'New'}
                onChange={handleUpdateFormChange}
                className="w-full mt-1 p-2 border border-gray-300 rounded-md"
              >
                {leadStatusOptions.map((status) => (
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
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
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

export default LeadsDashboard;