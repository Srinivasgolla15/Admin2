import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Eye } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PaginatedTable from '../../components/ui/PaginatedTable';

type Enquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  propertyId: string;
  propertyType: string;
  status: 'pending' | 'resolved' | 'in_progress';
  submittedBy: string;
  timestamp: Date;
};

const ServiceEnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'enquiries'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const raw = doc.data();
        return {
          id: doc.id,
          ...raw,
          timestamp: raw.timestamp?.toDate(),
        } as Enquiry;
      });
      setEnquiries(data);
    });

    return () => unsub();
  }, []);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Service Enquiries</h1>

      <PaginatedTable
        columns={[
          { key: 'name', label: 'Name' },
          { key: 'email', label: 'Email' },
          { key: 'phone', label: 'Phone' },
          { key: 'propertyType', label: 'Property Type' },
          { key: 'propertyId', label: 'Property ID' },
          { key: 'status', label: 'Status' },
          { key: 'actions', label: 'Actions' },
        ]}
        data={enquiries}
        rowsPerPage={5}
        renderRow={(e) => (
          <>
            <td className="px-4 py-2">{e.name}</td>
            <td>{e.email}</td>
            <td>{e.phone}</td>
            <td>{e.propertyType}</td>
            <td>{e.propertyId}</td>
            <td><Badge status={e.status} /></td>
            <td>
              <button
                aria-label="View Enquiry"
                onClick={() => setSelectedEnquiry(e)}
                className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                <Eye className="text-blue-600 w-4 h-4" />
              </button>
            </td>
          </>
        )}
      />

      <Modal
        isOpen={!!selectedEnquiry}
        onClose={() => setSelectedEnquiry(null)}
        title="Enquiry Details"
        size="lg"
      >
        {selectedEnquiry && (
          <div className="space-y-2 text-sm">
            <p><strong>Name:</strong> {selectedEnquiry.name}</p>
            <p><strong>Email:</strong> {selectedEnquiry.email}</p>
            <p><strong>Phone:</strong> {selectedEnquiry.phone}</p>
            <p><strong>Message:</strong> {selectedEnquiry.message}</p>
            <p><strong>Property ID:</strong> {selectedEnquiry.propertyId}</p>
            <p><strong>Property Type:</strong> {selectedEnquiry.propertyType}</p>
            <p><strong>Status:</strong> <Badge status={selectedEnquiry.status} /></p>
            <p><strong>Submitted By:</strong> {selectedEnquiry.submittedBy}</p>
            <p><strong>Submitted At:</strong> {selectedEnquiry.timestamp?.toLocaleString()}</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ServiceEnquiriesPage;
