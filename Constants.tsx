import React from 'react';
import {
  LayoutDashboard, Users, Home, BriefcaseBusiness, UserCog, BadgeIndianRupee, HeartHandshake, Settings,
  UserPlus, FileCheck, FileClock, ListChecks, LucideBadgeIndianRupee, UsersRound, CalendarDays, FileText,
  BarChart3, ShieldCheck, WalletCards, Gift, Landmark, Building, CheckSquare, ListTodo, Target, PhoneCall, Activity, ShieldAlert, MailWarning, Cog, ClipboardList, Package, CalendarCheck, History, BookUser, Contact, FileSpreadsheet, Banknote, Users as UsersIcon, PackagePlus, LifeBuoy, ListFilter, Settings2
} from 'lucide-react';
import { UserRole,NavItem } from './types';  

// export const ROLE_OPTIONS = [  
//   { value: UserRole.SuperAdmin, label: "Super Admin" },
//   { value: UserRole.Admin, label: "Admin" },
//   { value: UserRole.Finance, label: "Finance" },
//   { value: UserRole.Operations, label: "Operations" },
//   { value: UserRole.Sales, label: "Sales" },
// ];

export const BackgroundImageUrl = "https://picsum.photos/seed/propeasbg/1920/1080";
 
export const BackgroundImageStyles = {
  backgroundImage: `url(${BackgroundImageUrl})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  transition: 'opacity 1s ease-in-out',
};

const iconSize = 18;
const subIconSize = 16; 

export const NAV_ITEMS: NavItem[] = [
  { 
    name: 'Dashboard', 
    path: '/', 
    icon: <LayoutDashboard size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales, UserRole.Operations, UserRole.Finance] 
  },
  { name: 'Clients',
    path:'/clients/AllClients',
    icon : <Users size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales],
  },
  {
    name: 'Callback Requests',
    path: '/crm/CallbackRequests',
    icon  : <PhoneCall size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]
  },
  {
    name: 'Employees',
    path  : '/employees/AllEmployees',
    icon  : <UsersRound size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin]
  },
   
]

export const APP_NAME = 'Propeas';