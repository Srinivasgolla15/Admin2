import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, limit, startAfter, DocumentSnapshot, updateDoc, doc, Timestamp, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '../../services/firebase';
import { Property } from '../../types';
import { Pencil } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import PaginatedTable from '../../components/ui/PaginatedTable';
import Modal from '../../components/ui/Modal';
import EditEntityModal from '../../components/ui/EditEntityModal';
import { PlatformAuditLog } from '../../utils/auditLogger';
import { useAuth } from '../../contexts/AuthContext';
import debounce from 'lodash/debounce';
import { format } from 'date-fns';

const AllPropertiesPage: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0); // 0-based for PaginatedTable
  const [lastVisible, setLastVisible] = useState<DocumentSnapshot | null>(null);
  const [prevCursors, setPrevCursors] = useState<DocumentSnapshot[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const { currentUser, isLoadingAuth } = useAuth();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const fetchProperties = async (page: number, direction: 'next' | 'prev' | 'first' = 'first') => {
    console.log('[DEBUG] AllPropertiesPage: Fetching properties for page:', page, 'Direction:', direction);
    setLoading(true);
    try {
      let q;
      if (direction === 'next' && lastVisible) {
        q = query(
          collection(db, 'properties'),
          orderBy('timestamp'),
          startAfter(lastVisible),
          limit(rowsPerPage)
        );
      } else if (direction === 'prev' && prevCursors[page - 1]) {
        q = query(
          collection(db, 'properties'),
          orderBy('timestamp'),
          startAfter(prevCursors[page - 1]),
          limit(rowsPerPage)
        );
      } else {
        q = query(
          collection(db, 'properties'),
          orderBy('timestamp'),
          limit(rowsPerPage)
        );
      }

      const snapshot = await getDocs(q);
      const propertiesData: Property[] = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          name: raw.name || '',
          propertyType: raw.propertyType || '',
          service: raw.service || '',
          status: raw.status || '',
          city: raw.city || '',
          assignedEmployee: raw.assignedEmployee || '',
          timestamp: raw.timestamp?.toDate(),
          phone: raw.phone || '',
          address: raw.address || '',
          squareFeet: raw.squareFeet || 0,
          price: raw.price || 0,
          submittedBy: raw.submittedBy || '',
          tenants: raw.tenants?.map((tenant: any) => ({
            ...tenant,
            moveInDate: tenant.moveInDate?.toDate(),
          })) || [],
          photos: raw.photos || [],
          locationLink: raw.locationLink || '',
        } as Property;
      });

      console.log('[DEBUG] AllPropertiesPage: Properties fetched:', propertiesData);
      setProperties(propertiesData);
      setHasMore(propertiesData.length === rowsPerPage);

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

      
    } catch (error) {
      console.error('[DEBUG] AllPropertiesPage: Error fetching properties:', error);
      setError('Failed to fetch properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const runSearchQuery = async (term: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'properties'),
        orderBy('name'),
        where('name', '>=', term.toLowerCase()),
        where('name', '<=', term.toLowerCase() + '\uf8ff')
      );

      const snapshot = await getDocs(q);
      const propertiesData: Property[] = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          name: raw.name || '',
          propertyType: raw.propertyType || '',
          service: raw.service || '',
          status: raw.status || '',
          city: raw.city || '',
          assignedEmployee: raw.assignedEmployee || '',
          timestamp: raw.timestamp?.toDate(),
          phone: raw.phone || '',
          address: raw.address || '',
          squareFeet: raw.squareFeet || 0,
          price: raw.price || 0,
          submittedBy: raw.submittedBy || '',
          tenants: raw.tenants?.map((tenant: any) => ({
            ...tenant,
            moveInDate: tenant.moveInDate?.toDate(),
          })) || [],
          photos: raw.photos || [],
          locationLink: raw.locationLink || '',
        } as Property;
      });

      console.log('[DEBUG] AllPropertiesPage: Search results fetched:', propertiesData);
      setProperties(propertiesData);
      setHasMore(false); // Disable pagination for search results
    } catch (error) {
      console.error('[DEBUG] AllPropertiesPage: Error in search query:', error);
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
      fetchProperties(0, 'first');
    }
  }, 300);

  useEffect(() => {
    if (!currentUser || isLoadingAuth) return;
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, rowsPerPage, currentUser, isLoadingAuth]);

  const handlePageChange = (newPage: number) => {
    if (searchTerm.trim()) {
      return;
    }
    const direction = newPage > currentPage ? 'next' : newPage < currentPage ? 'prev' : 'first';
    setCurrentPage(newPage);
    fetchProperties(newPage, direction);
  };

  const openInfoModal = (property: Property) => {
    console.log('[DEBUG] AllPropertiesPage: Opening info modal for property:', property.id);
    setSelectedProperty(property);
    setIsInfoOpen(true);
  };

  const openEditModal = (property: Property) => {
    console.log('[DEBUG] AllPropertiesPage: Opening edit modal for property:', property.id);
    setSelectedProperty(property);
    setIsEditOpen(true);
  };

  const handlePropertyUpdate = async (updatedData: Partial<Property>) => {
    if (!selectedProperty || !currentUser) return;

    const propertyRef = doc(db, 'properties', selectedProperty.id);
    const currentTime = Timestamp.fromDate(new Date());

    try {
      await updateDoc(propertyRef, updatedData);

      const changes = Object.keys(updatedData).reduce((acc, key) => {
        const oldVal = selectedProperty[key as keyof Property];
        const newVal = updatedData[key as keyof Property];
        if (oldVal !== newVal) {
          acc[key] = { from: oldVal, to: newVal };
        }
        return acc;
      }, {} as Record<string, { from: any; to: any }>);

      if (Object.keys(changes).length > 0) {
        await PlatformAuditLog({
          actionType: 'UPDATE_PROPERTY',
          actor: {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            phone: currentUser.phone || '',
          },
          targetEntityId: selectedProperty.id,
          targetEntityType: 'property',
          targetEntityDescription: selectedProperty.name || selectedProperty.id,
          actionDescription: `Updated property: ${Object.entries(changes)
            .map(([key, { from, to }]) => `${key} from "${from}" to "${to}"`)
            .join(', ')}`,
          timestamp: currentTime,
          details: changes,
        });
      }

      if (searchTerm.trim()) {
        await runSearchQuery(searchTerm);
      } else {
        await fetchProperties(currentPage);
      }
      setIsEditOpen(false);
      console.log('[AllPropertiesPage] Property updated successfully');
    } catch (error) {
      console.error('[AllPropertiesPage] Error updating property:', error);
      setError('Failed to update property. Please try again.');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">All Properties</h1>
        <div className="flex items-center gap-2">
          <label htmlFor="rowsPerPage" className="text-sm text-slate-900 dark:text-slate-100">
            Rows per page:
          </label>
          <select
            id="rowsPerPage"
            className="border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 rounded text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500"
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
          placeholder="Search by name..."
          className="w-full max-w-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 rounded text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      {loading ? (
        <p>Loading properties...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <PaginatedTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'propertyType', label: 'Type' },
            { key: 'service', label: 'Service' },
            { key: 'status', label: 'Status' },
            { key: 'city', label: 'City' },
            { key: 'assignedEmployee', label: 'Assigned To' },
            { key: 'actions', label: 'Actions' },
          ]}
          data={properties}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          hasMore={hasMore}
          renderRow={(p) => (
            <>
              <td className="px-4 py-2">{p.name}</td>
              <td className="px-4 py-2">{p.propertyType}</td>
              <td className="px-4 py-2">{p.service}</td>
              <td className="px-4 py-2"><Badge status={p.status} /></td>
              <td className="px-4 py-2">{p.city || '-'}</td>
              <td className="px-4 py-2">{p.assignedEmployee || 'Unassigned'}</td>
              <td className="px-4 py-2 flex gap-2">
                <button
                  aria-label="View Property Details"
                  className="text-blue-600 hoverapitalizeext-blue-800 transition"
                  onClick={() => openInfoModal(p)}
                >
                  Info
                </button>
                <button
                  aria-label="Edit Property"
                  className="text-yellow-600 hover:text-yellow-800 transition"
                  onClick={() => openEditModal(p)}
                >
                  <Pencil size={18} />
                </button>
              </td>
            </>
          )}
        />
      )}

      <Modal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        title="Property Details"
        size="lg"
      >
        {selectedProperty ? (
          <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
            <p><strong>Name:</strong> {selectedProperty.name}</p>
            <p><strong>Phone:</strong> {selectedProperty.phone || '-'}</p>
            <p><strong>Type:</strong> {selectedProperty.propertyType}</p>
            <p><strong>Service:</strong> {selectedProperty.service}</p>
            <p><strong>Status:</strong> <Badge status={selectedProperty.status} /></p>
            <p><strong>Address:</strong> {selectedProperty.address || '-'}</p>
            <p><strong>Square Feet:</strong> {selectedProperty.squareFeet || '-'}</p>
            <p><strong>Price:</strong> ₹{selectedProperty.price?.toLocaleString() || '-'}</p>
            <p><strong>Assigned To:</strong> {selectedProperty.assignedEmployee || 'Not Assigned'}</p>
            <p><strong>Submitted By:</strong> {selectedProperty.submittedBy || '-'}</p>
            <p><strong>Created At:</strong> {selectedProperty.timestamp ? format(selectedProperty.timestamp, 'dd-MM-yyyy HH:mm') : '-'}</p>
            {selectedProperty.locationLink && (
              <p>
                <a
                  href={selectedProperty.locationLink}
                  className="text-blue-600 underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  📍 View on Map
                </a>
              </p>
            )}
            {Array.isArray(selectedProperty.photos) && selectedProperty.photos.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                <p className="font-medium mb-2"><strong>Photos:</strong></p>
                {selectedProperty.photos.map((photoUrl, photoIdx) => (
                  <img
                  aria-label='Property Photo'
                    key={photoIdx}
                    src={photoUrl}
                    onClick={() => {
                      setSelectedImage(photoUrl);
                      setIsInfoOpen(false);
                      setIsImageModalOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
            {(selectedProperty?.tenants?.length ?? 0) > 0 && (
              <div>
                <strong>Tenants:</strong>
                <ul className="list-disc list-inside ml-4">
                  {selectedProperty.tenants?.map((tenant, idx) => (
                    <li key={idx}>
                      {tenant.name} (Move-in: {tenant.moveInDate ? format(tenant.moveInDate, 'dd-MM-yyyy') : '-'})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p>No property selected.</p>
        )}
      <Modal
        isOpen={isImageModalOpen}
        onClose={() => {
          setIsImageModalOpen(false);
          setSelectedImage(null);
        }}
        title="Property Photo"
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
      </Modal>

      {selectedProperty && (
        <EditEntityModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          entityType="property"
          entityId={selectedProperty.id}
          entityData={{
            name: selectedProperty.name,
            phone: selectedProperty.phone || '',
            assignedEmployee: selectedProperty.assignedEmployee || '',
            status: selectedProperty.status,
          }}
          editableFields={['name', 'phone', 'assignedEmployee', 'status']}
          onSave={handlePropertyUpdate}
          currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default AllPropertiesPage;