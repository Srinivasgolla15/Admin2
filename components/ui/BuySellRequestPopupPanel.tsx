import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import Modal from './Modal';
import { format } from 'date-fns';
import { Property } from '../../types';

interface BuySellRequestPopupPanelProps {
  requestId: string;
  onClose: () => void;
}

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
  timestamp: any;
  updatedAt?: any;
  updatedBy?: string;
  assignedEmployee?: string;
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

const BuySellRequestPopupPanel: React.FC<BuySellRequestPopupPanelProps> = ({ requestId, onClose }) => {
  const [request, setRequest] = useState<ContactRequest | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch contact request
        const reqSnap = await getDoc(doc(db, 'contact_requests', requestId));
        if (!reqSnap.exists()) throw new Error('Request not found');
        const reqData = reqSnap.data();
        const req: ContactRequest = {
          id: reqSnap.id,
          ...reqData,
        };
        setRequest(req);
        if (req.propertyId) {
          const propSnap = await getDoc(doc(db, 'properties', req.propertyId));
          if (propSnap.exists()) {
            setProperty({ id: propSnap.id, ...propSnap.data() } as Property);
          }
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [requestId]);

  // Gather image URLs from property
  const imageUrls: string[] = property?.imageUrls || property?.photos || [];

  return (
    <Modal isOpen={true} onClose={onClose} title="Request Details" size="xl">
      {loading ? (
        <div className="text-center py-10">Loading...</div>
      ) : error ? (
        <div className="text-red-500 text-center py-10">{error}</div>
      ) : request && property ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Carousel + Images */}
          <div className="flex flex-col items-center">
            {imageUrls.length > 0 ? (
              <div className="relative w-full max-w-md aspect-video bg-gray-100 rounded-lg overflow-hidden mb-3">
                <img
                  src={imageUrls[carouselIdx]}
                  alt={`Property image ${carouselIdx + 1}`}
                  className="object-cover w-full h-full"
                />
                {imageUrls.length > 1 && (
                  <>
                    <button
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow"
                      onClick={() => setCarouselIdx((idx) => (idx === 0 ? imageUrls.length - 1 : idx - 1))}
                    >
                      &#8592;
                    </button>
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 rounded-full p-1 shadow"
                      onClick={() => setCarouselIdx((idx) => (idx === imageUrls.length - 1 ? 0 : idx + 1))}
                    >
                      &#8594;
                    </button>
                  </>
                )}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {imageUrls.map((_, i) => (
                    <span
                      key={i}
                      className={`inline-block w-2 h-2 rounded-full ${i === carouselIdx ? 'bg-purple-600' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md aspect-video bg-gray-200 rounded-lg flex items-center justify-center text-gray-500 mb-3">
                No images
              </div>
            )}
            <div className="text-xs text-gray-500">{imageUrls.length} image{imageUrls.length !== 1 ? 's' : ''}</div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            <div>
              <span className="font-semibold">Client Name:</span> {request.name}
            </div>
            <div>
              <span className="font-semibold">Email:</span> {request.email}
            </div>
            <div>
              <span className="font-semibold">Phone:</span> {request.phone}
            </div>
            <div>
              <span className="font-semibold">Message:</span> {request.message}
            </div>
            <div>
              <span className="font-semibold">Request Timestamp:</span> {format(request.timestamp?.toDate ? request.timestamp.toDate() : new Date(request.timestamp), 'dd MMM yyyy, hh:mm a')}
            </div>
            <div>
              <span className="font-semibold">Property Name:</span> {property.name}
            </div>
            <div>
              <span className="font-semibold">Property Type:</span> {property.propertyType}
            </div>
            <div>
              <span className="font-semibold">Full Address:</span> {property.address || property.detailedAddress?.fullAddress || '-'}
            </div>
            <div>
              <span className="font-semibold">Status:</span> <span className={`px-2 py-1 rounded ${getStatusBadgeColor(request.status)}`}>{request.status}</span>
            </div>
            <div>
              <span className="font-semibold">Assigned Employee:</span> {property.assignedEmployee || request.assignedEmployee || '-'}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-10">No data to display</div>
      )}
    </Modal>
  );
};

export default BuySellRequestPopupPanel;
