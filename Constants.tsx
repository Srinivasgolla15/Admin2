import {
  LayoutDashboard, Users, Home, BriefcaseBusiness, UserCog, BadgeIndianRupee, HeartHandshake, Settings,
  UserPlus, FileCheck, FileClock, ListChecks, LucideBadgeIndianRupee, UsersRound, CalendarDays, FileText,
  BarChart3, ShieldCheck, WalletCards, Gift, Landmark, Building, CheckSquare, ListTodo, Target, PhoneCall, Activity, ShieldAlert, MailWarning, Cog, ClipboardList, Package, CalendarCheck, History, BookUser, Contact, FileSpreadsheet, Banknote, Users as UsersIcon, PackagePlus, LifeBuoy, ListFilter, Settings2,
  MailCheck
} from 'lucide-react';
import { UserRole, NavItem } from './types';  

export const BackgroundImageUrl = "https://picsum.photos/seed/propeasbg/1920/1080";
 
export const BackgroundImageStyles = {
  backgroundImage: `url(${BackgroundImageUrl})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  transition: 'opacity 1s ease-in-out',
};

const iconSize = 18;

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
    name  : 'Leads',
    path  : '/crm/Leads',
    icon  : <UsersRound size={iconSize} />,   
    roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]
  },
  {
    name: 'Employees',
    path  : '/employees/AllEmployees',
    icon  : <UsersRound size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin]
  },
  {
    name: 'Properties',
    path: '/properties/AllProperties',
    icon: <Home size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin]
  },
  {name: 'Payments',
    path:'/finance/Payments',
    icon:<Package size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Finance]
  },
  {
    name: 'Service Enquiries',
    path: '/crm/ServiceEnquiries',
    icon: <MailWarning size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]
  },
  {
    name:'Log History',
    path:'/history/CombinedHistory',
    icon:<History size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin]
  },
  {
    name:'User Management',
    path:'/users/PlatformUserManagement',
    icon:<UserCog size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin]
  }
 
]

export const APP_NAME = 'Propeas';