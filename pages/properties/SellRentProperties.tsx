import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '../../services/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, X, Info, Search } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-toastify';

interface Property {
  id?: string;
  address: string;
  areaSize: string;
  city: string;
  description: string;
  location: string;
  phoneNo: string;
  pincode: string;
  photos: string[];
  price: number;
  rentPrice?: number;
  propertyType: string;
  service: 'sell' | 'rent';
  status: string;
  submittedBy: string;
  userId: string;
  buySellType?: string | null;
  rentType?: string | null;
  // Apartment specific fields
  apartmentType?: string;
  balcony?: string;
  bathroom?: string;
  bedrooms?: string;
  floor?: string;
  furnishedType?: string;
  parkingArea?: string;
  ageOfProperty?: string;
  aroundThisProperty?: string;
  squareFeet?: string;
}

const SellRentProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [ceoPropertiesCount, setCeoPropertiesCount] = useState(0);
  const [formData, setFormData] = useState<Partial<Property>>({
    service: 'sell',
    status: 'verified',
    submittedBy: 'ceo@estateeasy.com',
    userId: 'admin',
    photos: [],
    buySellType: 'sell',
    rentType: null
  });
  const [uploading, setUploading] = useState(false);
  const [showMoreImages, setShowMoreImages] = useState(false);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const q = query(
          collection(db, 'properties'),
          where('submittedBy', '==', 'ceo@estateeasy.com')
        );
        const querySnapshot = await getDocs(q);
        const propertiesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Property[];
        setProperties(propertiesData);
        setFilteredProperties(propertiesData);
        setCeoPropertiesCount(propertiesData.length);
      } catch (error) {
        console.error('Error fetching properties:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, []);

  // Filter properties based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProperties(properties);
      return;
    }

    const filtered = properties.filter(property => 
      property.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.propertyType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.service?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredProperties(filtered);
  }, [searchTerm, properties]);

  // Handle view property details
  const handleViewProperty = (property: Property) => {
    setSelectedProperty(property);
    setIsViewModalOpen(true);
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const uploadPromises = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storageRef = ref(storage, `properties/${uuidv4()}_${file.name}`);
      uploadPromises.push(
        uploadBytes(storageRef, file)
          .then(snapshot => getDownloadURL(snapshot.ref))
      );
    }

    try {
      const urls = await Promise.all(uploadPromises);
      setFormData(prev => ({
        ...prev,
        photos: [...(prev.photos || []), ...urls]
      }));
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setUploading(false);
    }
  };

  // Remove photo
  const removePhoto = (index: number) => {
    setFormData(prev => ({
      ...prev,
      photos: (prev.photos || []).filter((_, i) => i !== index)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const propertyData: Property = {
        ...formData as Property,
        timestamp: serverTimestamp(),
        status: 'verified',
        submittedBy: 'ceo@estateeasy.com',
        userId: 'admin',
        buySellType: formData.service === 'sell' ? 'sell' : null,
        rentType: formData.service === 'rent' ? 'Rent' : null,
      };

      if (editingProperty && editingProperty.id) {
        // Update existing property
        await setDoc(doc(db, 'properties', editingProperty.id), propertyData, { merge: true });
      } else {
        // Add new property
        const docRef = doc(collection(db, 'properties'));
        await setDoc(docRef, propertyData);
      }

      // Reset form and refresh
      setFormData({
        service: 'sell',
        status: 'verified',
        submittedBy: 'ceo@estateeasy.com',
        userId: 'admin',
        photos: [],
        buySellType: 'sell',
        rentType: null
      });
      setEditingProperty(null);
      setIsModalOpen(false);
      navigate(0); // This will refresh the page
    } catch (error) {
      console.error('Error saving property:', error);
    }
  };

  // Edit property
  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      ...property,
      service: property.service || 'sell',
      buySellType: property.buySellType || (property.service === 'sell' ? 'sell' : null),
      rentType: property.rentType || (property.service === 'rent' ? 'Rent' : null)
    });
    setIsModalOpen(true);
  };

  // Render form fields based on property type
  const renderPropertyFields = () => {
    const isApartment = formData.propertyType === 'ApartmentProperty';
    const isSell = formData.service === 'sell';

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Service Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Service Type</label>
            <select
              name="service"
              value={formData.service}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="sell">Sell</option>
              <option value="rent">Rent</option>
            </select>
          </div>

          {/* Property Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Property Type</label>
            <select
              name="propertyType"
              value={formData.propertyType || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select Property Type</option>
              <option value="PlotProperty">Plot Property</option>
              <option value="ApartmentProperty">Apartment Property</option>
              <option value="CommercialSpaceProperty">Commercial Space Property</option>
            </select>
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              type="text"
              name="address"
              value={formData.address || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* Price / Rent Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {isSell ? 'Price' : 'Rent Price'}
            </label>
            <input
              type="text"
              name={isSell ? 'price' : 'rentPrice'}
              value={isSell ? formData.price || '' : formData.rentPrice || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* Area Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Area Size (sq.ft)</label>
            <input
              type="text"
              name="areaSize"
              value={formData.areaSize || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700">City</label>
            <input
              type="text"
              name="city"
              value={formData.city || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Pincode</label>
            <input
              type="text"
              name="pincode"
              value={formData.pincode || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone Number</label>
            <input
              type="text"
              name="phoneNo"
              value={formData.phoneNo || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Location (Map URL)</label>
            <input
              type="text"
              name="location"
              value={formData.location || ''}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="https://maps.google.com/..."
            />
          </div>

          {/* Apartment Specific Fields */}
          {isApartment && (
            <>
              <div className="md:col-span-2 border-t border-gray-200 pt-4">
                <h3 className="text-lg font-medium text-gray-900">Apartment Details</h3>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Apartment Type</label>
                <select
                  name="apartmentType"
                  value={formData.apartmentType || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select Type</option>
                  <option value="1BHK">1 BHK</option>
                  <option value="2BHK">2 BHK</option>
                  <option value="3BHK">3 BHK</option>
                  <option value="4BHK">4 BHK</option>
                  <option value="4PlusBHK">4+ BHK</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bedrooms</label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms || ''}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
                <input
                  type="number"
                  name="bathroom"
                  value={formData.bathroom || ''}
                  onChange={handleInputChange}
                  min="0"
                  step="0.5"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Floor</label>
                <input
                  type="number"
                  name="floor"
                  value={formData.floor || ''}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Furnished Type</label>
                <select
                  name="furnishedType"
                  value={formData.furnishedType || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select Furnishing</option>
                  <option value="Fully-furnished">Fully Furnished</option>
                  <option value="Semi-furnished">Semi Furnished</option>
                  <option value="Unfurnished">Unfurnished</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Parking Area</label>
                <select
                  name="parkingArea"
                  value={formData.parkingArea || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="Yes">Yes</option>
                  <option value="No">No</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Age of Property (Years)</label>
                <input
                  type="number"
                  name="ageOfProperty"
                  value={formData.ageOfProperty || ''}
                  onChange={handleInputChange}
                  min="0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Balcony</label>
                <select
                  name="balcony"
                  value={formData.balcony || ''}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">Select</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3+</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Around This Property</label>
                <textarea
                  name="aroundThisProperty"
                  value={formData.aroundThisProperty || ''}
                  onChange={handleInputChange}
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Nearby landmarks, schools, hospitals, etc."
                />
              </div>
            </>
          )}

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={formData.description || ''}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h1 className="text-2xl font-bold">Sell/Rent Properties</h1>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search properties..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                setEditingProperty(null);
                setFormData({
                  service: 'sell',
                  status: 'verified',
                  submittedBy: 'ceo@estateeasy.com',
                  userId: 'admin',
                  photos: [],
                  buySellType: 'sell',
                  rentType: null
                });
                setIsModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center whitespace-nowrap"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Property
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-600 mb-2">
          Showing <span className="font-medium">{filteredProperties.length}</span> of <span className="font-medium">{ceoPropertiesCount}</span> properties submitted by CEO
        </div>
      </div>

      {/* Property List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : properties.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by adding a new property.</p>
          <div className="mt-6">
            <button
              onClick={() => {
                setEditingProperty(null);
                setFormData({
                  service: 'sell',
                  status: 'verified',
                  submittedBy: 'ceo@estateeasy.com',
                  userId: 'admin',
                  photos: [],
                  buySellType: 'sell',
                  rentType: null
                });
                setIsModalOpen(true);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="-ml-1 mr-2 h-5 w-5" />
              Add Property
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
              {/* Property Image */}
              <div className="relative h-48 bg-gray-200">
                {property.photos && property.photos.length > 0 ? (
                  <img
                    src={property.photos[0]}
                    alt={property.address}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                    <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex space-x-2">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    property.service === 'sell' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {property.service}
                  </span>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    {property.propertyType?.replace('Property', '')}
                  </span>
                </div>
              </div>
              
              {/* Property Details */}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{property.address}</h3>
                    <p className="text-sm text-gray-500">{property.city}, {property.pincode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-blue-600">
                      {property.service === 'sell' 
                        ? `₹${Number(property.price).toLocaleString()}` 
                        : `₹${Number(property.rentPrice).toLocaleString()}/mo`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {property.areaSize} sq.ft
                    </p>
                  </div>
                </div>

                {/* Additional Details */}
                {property.bedrooms && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      {property.bedrooms} Beds
                    </div>
                    {property.bathroom && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {property.bathroom} Baths
                      </div>
                    )}
                    {property.floor && (
                      <div className="flex items-center">
                        <svg className="h-4 w-4 mr-1 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4 0h2M7 7h2m4 0h2m-4 4h2m4 0h2m-8 4h2m4 0h2m-4 4h2m4 0h2" />
                        </svg>
                        Floor {property.floor}
                      </div>
                    )}
                  </div>
                )}

                {/* Status and Actions */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    property.status === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : property.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewProperty(property);
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors"
                      title="View details"
                    >
                      <Info className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(property);
                      }}
                      className="p-1.5 text-gray-500 hover:text-blue-600 transition-colors"
                      title="Edit property"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button 
                      className="p-1.5 text-gray-500 hover:text-red-600 transition-colors"
                      title="Delete property"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Property Details Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setShowMoreImages(false);
        }}
        title="Property Details"
        size="max-w-4xl"
      >
        {selectedProperty && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="aspect-w-16 aspect-h-9 bg-gray-100 rounded-lg overflow-hidden">
                  {selectedProperty.photos && selectedProperty.photos.length > 0 ? (
                    <img
                      src={selectedProperty.photos[0]}
                      alt={selectedProperty.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                      <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {selectedProperty.photos?.slice(1, showMoreImages ? undefined : 4).map((photo, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded overflow-hidden">
                      <img src={photo} alt={`Property ${index + 2}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {(!selectedProperty.photos || selectedProperty.photos.length < 4) && 
                    Array(3 - (selectedProperty.photos?.length || 0)).fill(0).map((_, index) => (
                      <div key={`empty-${index}`} className="aspect-square bg-gray-100 rounded flex items-center justify-center text-gray-400">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    ))
                  }
                </div>
                {selectedProperty.photos && selectedProperty.photos.length > 4 && !showMoreImages && (
                  <button
                    onClick={() => setShowMoreImages(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    + {selectedProperty.photos.length - 4} more images
                  </button>
                )}
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedProperty.address}</h2>
                    <p className="text-gray-600">{selectedProperty.city}, {selectedProperty.pincode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {selectedProperty.service === 'sell' 
                        ? `₹${Number(selectedProperty.price).toLocaleString()}` 
                        : `₹${Number(selectedProperty.rentPrice).toLocaleString()}/mo`}
                    </p>
                    <p className="text-sm text-gray-500">{selectedProperty.areaSize} sq.ft</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-gray-200">
                  <div>
                    <p className="text-sm text-gray-500">Property Type</p>
                    <p className="font-medium">{selectedProperty.propertyType?.replace('Property', '')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Service</p>
                    <p className="font-medium capitalize">{selectedProperty.service}</p>
                  </div>
                  {selectedProperty.bedrooms && (
                    <div>
                      <p className="text-sm text-gray-500">Bedrooms</p>
                      <p className="font-medium">{selectedProperty.bedrooms}</p>
                    </div>
                  )}
                  {selectedProperty.bathroom && (
                    <div>
                      <p className="text-sm text-gray-500">Bathrooms</p>
                      <p className="font-medium">{selectedProperty.bathroom}</p>
                    </div>
                  )}
                  {selectedProperty.floor && (
                    <div>
                      <p className="text-sm text-gray-500">Floor</p>
                      <p className="font-medium">{selectedProperty.floor}</p>
                    </div>
                  )}
                  {selectedProperty.furnishedType && (
                    <div>
                      <p className="text-sm text-gray-500">Furnishing</p>
                      <p className="font-medium">{selectedProperty.furnishedType}</p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-600 whitespace-pre-line">{selectedProperty.description || 'No description provided.'}</p>
                </div>
                
                {selectedProperty.aroundThisProperty && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Around This Property</h3>
                    <p className="text-gray-600">{selectedProperty.aroundThisProperty}</p>
                  </div>
                )}
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedProperty.status === 'verified' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedProperty.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedProperty.status.charAt(0).toUpperCase() + selectedProperty.status.slice(1)}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Submitted By</p>
                      <p className="font-medium">{selectedProperty.submittedBy}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEdit(selectedProperty);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Edit Property
              </button>
              <button
                type="button"
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit Property Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`${editingProperty ? 'Edit' : 'Add'} Property`}
      >
        <form onSubmit={handleSubmit}>
          {renderPropertyFields()}
          
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Photos</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {formData.photos?.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Property ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <label className="flex flex-col items-center justify-center w-20 h-20 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-500">
                <input
                  type="file"
                  className="hidden"
                  multiple
                  onChange={handleFileUpload}
                  accept="image/*"
                />
                <Plus className="h-6 w-6 text-gray-400" />
                <span className="text-xs text-gray-500">Add</span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={uploading}
            >
              {uploading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SellRentProperties;
