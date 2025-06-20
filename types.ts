import { Timestamp } from 'firebase/firestore';
import { ReactElement } from 'react';

// export type UserRole = 'Superadmin' | 'Admin' | 'Sales' | 'Operation' | 'Finance' ;
export enum UserRole {
  SuperAdmin = 'Superadmin',
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
  avatarUrl?: string;
  subscriptionStatus: 'Active' | 'Pending' | 'Inactive' | 'Blocked' | 'Cancelled';
  createdAt?: Timestamp;
}

export interface User {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
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
  phone: string;
  serviceNeeded: string;
  message: string;
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

