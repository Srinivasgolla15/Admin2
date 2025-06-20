import { LayoutDashboard, Users, PhoneCall,UsersRound } from 'lucide-react';
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
    name: 'Employees',
    path  : '/employees/AllEmployees',
    icon  : <UsersRound size={iconSize} />,
    roles: [UserRole.SuperAdmin, UserRole.Admin]
  },
   
]

export const APP_NAME = 'Propeas';