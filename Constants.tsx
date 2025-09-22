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
  {
    name: 'CRM',
    icon: <Users size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales],
    subItems: [
      {
        name: 'Clients',
        path: '/clients/AllClients',
        icon: <Users size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]
      },
      {
        name: 'Callback Requests',
        path: '/crm/CallbackRequests',
        icon: <PhoneCall size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]
      },
      {
        name: 'Leads',
        path: '/crm/Leads',
        icon: <UsersRound size={iconSize} />,   
        roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]
      },
      {
        name: 'Service Enquiries',
        path: '/crm/ServiceEnquiries',
        icon: <MailWarning size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]
      }
    ]
  },
  {
    name: 'Properties',
    icon: <Home size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin],
    subItems: [
      {
        name: 'All Properties',
        path: '/properties/AllProperties',
        icon: <ListFilter size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin]
      },
      {
        name: 'Sell/Rent Properties',
        path: '/properties/SellRentProperties',
        icon: <PackagePlus size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin]
      },
      {
        name: 'Buy/Sell Requests',
        path: '/crm/BuySellRequests',
        icon: <HeartHandshake size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Sales]
      }
    ]
  },
  {
    name: 'Finance',
    icon: <BadgeIndianRupee size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Finance],
    subItems: [
      {
        name: 'Subscriptions',
        path: '/finance/Subscriptions',
        icon: <Package size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Finance]
      },
      {
        name: 'Payments',
        path: '/finance/Payments',
        icon: <Banknote size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin, UserRole.Finance]
      }
    ]
  },
  {
    name: 'User Management',
    icon: <UserCog size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin],
    subItems: [
      {
        name: 'Users',
        path: '/users/PlatformUserManagement',
        icon: <UsersRound size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin]
      },
      {
        name: 'Employees',
        path: '/employees/AllEmployees',
        icon: <UsersRound size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin]
      }
    ]
  },
  {
    name: 'History',
    icon: <History size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin],
    subItems: [
      {
        name: 'Activity Logs',
        path: '/history/CombinedHistory',
        icon: <ListChecks size={iconSize} />,
        roles: [UserRole.SuperAdmin, UserRole.Admin]
      }
    ]
  }
 
]

export const APP_NAME = 'Propeas';