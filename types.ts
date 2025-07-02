import { Timestamp } from 'firebase/firestore';
import { ReactElement } from 'react';

// export type UserRole = 'Superadmin' | 'Admin' | 'Sales' | 'Operation' | 'Finance' ;
export enum UserRole {
  SuperAdmin = 'Super Admin',
  Admin = 'Admin',
  Sales = 'Sales',
  Operations = 'Operations',
  Finance = 'Finance',
  Employee = 'Employee',
}

export interface Client {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  properties?: string[];
  subscribedServices?: string[];    
  profilePhotoUrl?: string;
  subscriptionStatus: 'Active' | 'Pending' | 'Inactive' | 'Blocked' | 'Cancelled';
  createdAt?: Timestamp;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  password?: string; // Optional, used for login
  lastLogin?: Timestamp;
  createdAt?: Timestamp;
}

export interface NavItem {
  name: string;
  path?: string;
  icon: ReactElement<{ className?: string; size?: number }>;
  subItems?: NavItem[];
  roles?: UserRole[];
  onClick?: () => void;
}


export interface CallbackRequest {
  id: string;
  name: string;
  email: string;
  updatedAt: Timestamp;
  updatedBy: string; // User ID of the person who updated the request
  phone: string;
  serviceNeeded: string;
  message: string;
  status:string;
  timestamp: any; // Firestore Timestamp
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  assignedto?: string; // Client ID or Property ID
  avatarUrl?: string;
  department?: string;
  employmentStatus?: 'Active' | 'Inactive' | 'On Leave';
  joinedOn?: string;
  phone?: string;
}

// Property types and statuses
// These types are used to define the properties in the real estate management system
export type PropertyType = 'ApartmentProperty' | 'Villa' | 'IndependentHouse' | 'CommercialSpace';
export type PropertyStatus = 'verified' | 'pending' | 'rejected';
export type ServiceType = 'Apartment Management' | 'buy' | 'rent';
export type BuySellType = 'Buy' | 'Sell';

export interface Tenant {
  name: string;
  email: string;
  phone: string;
  moveInDate: Date; // from Firestore Timestamp
  timestamp: Date;
  userId: string;
}

export interface DetailedAddress {
  apartmentName?: string;
  doorNumber?: string;
  floor?: string;
  street?: string;
  locationLink?: string;
  name?: string;
  phone?: string;
  pincode?: string;
}

export interface Property {
  id: string;

  // General details
  name: string;
  phone: string;
  userId: string;
  submittedBy: string;
  status: PropertyStatus;
  timestamp: Date;
  locationLink?: string; // Google Maps link or similar
  imageUrls?: string[]; // URLs of images related to the property

  // Type and service
  propertyType: PropertyType;
  service: ServiceType;

  // Dimensions and location
  address?: string;
  city?: string;
  location?: string;
  floor?: string;
  landmark?: string;
  street?: string;
  pincode?: string;
  areaSize?: number;
  squareFeet?: number;

  // Detailed nested address (from apartment form)
  detailedAddress?: DetailedAddress;

  // Sale / Rent Specific
  price?: number | null;
  rentPrice?: number | null;
  rentType?: string | null;
  buySellType?: BuySellType | null;
  sNo?: string;

  // Photos
  photos?: string[];

  // Assigned employee
  assignedEmployee?: string; // email

  // Subscription link (if any)
  subscriptionId?: string;

  // Tenants list (if it's a rented property)
  tenants?: Tenant[];
}

// payments 
export interface Payment {
  id: string;
  endDate: Date;
  amount: number;
  numberOfProperties: number;
  propertyIds: string[];
  serviceType: string;
  startDate: Date;
  status: 'pending' | 'verified' | 'rejected'; // expand as needed
  submittedBy: string;
  subscribedAt: Date;
  transactionScreenshot: string;
  updatedAt: Date;
}


