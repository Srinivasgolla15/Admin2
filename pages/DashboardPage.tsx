import React, { useState, useEffect } from 'react';
import RecentClientsModal from './components/RecentClientsModal';
import { Plus, Users, Building, UserCog, Wallet, PhoneCall, History, Contact, TrendingUp, Activity, BarChart3, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/ui/Modal';
import { db } from '../services/firebase';
import { addDoc, collection, Timestamp, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage: React.FC = () => {
  // ...existing state
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<Array<{ month: string, revenue: number }>>([]);
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [allClients, setAllClients] = useState<Array<{ name: string; email: string; createdAt: string }>>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [realStats, setRealStats] = useState({
    totalClients: 0,
    verifiedClients: 0,
    monthlyRevenue: 0,
    pendingRequests: 0,
    leads: 0,
    allProperties: 0
  });
  const [recentActivities, setRecentActivities] = useState<Array<{action: string, time: string, type: string}>>([]);
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const handleSendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'displayMessages'), {
        message: message.trim(),
        timestamp: Timestamp.now(),
      });
      console.log('✅ Message sent to Firestore');
      setIsModalOpen(false);
      setMessage('');
    } catch (error) {
      console.error('❌ Failed to send message:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load real data from Firebase
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setDataLoading(true);
        
        // Fetch clients
        const clientsSnapshot = await getDocs(collection(db, 'clients'));
        const totalClients = clientsSnapshot.size;
        
        // Fetch leads
        const leadsSnapshot = await getDocs(collection(db, 'leads'));
        const leads = leadsSnapshot.size;
        
        // Note: verifiedClients will be calculated from invoices below
        
        // Fetch invoices for monthly revenue and verified clients
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const invoicesSnapshot = await getDocs(collection(db, 'invoices'));

        // Prepare monthly revenue data for the last 12 months
        const months = Array.from({ length: 12 }, (_, i) => {
          const date = new Date();
          date.setMonth(date.getMonth() - (11 - i));
          return {
            label: date.toLocaleString('default', { month: 'short', year: '2-digit' }),
            month: date.getMonth(),
            year: date.getFullYear(),
          };
        });
        const revenueData = months.map(({ label, month, year }) => {
          const revenue = invoicesSnapshot.docs
            .filter(doc => {
              const invoiceDate = doc.data().timestamp?.toDate() || new Date(doc.data().updatedAt?.toDate());
              return invoiceDate.getMonth() === month && invoiceDate.getFullYear() === year && doc.data().paymentStatus === 'Completed';
            })
            .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
          return { month: label, revenue };
        });
        setMonthlyRevenueData(revenueData);

        // Calculate monthly revenue from completed invoices (current month)
        const monthlyRevenue = invoicesSnapshot.docs
          .filter(doc => {
            const invoiceDate = doc.data().timestamp?.toDate() || new Date(doc.data().updatedAt?.toDate());
            return invoiceDate.getMonth() === currentMonth && 
                   invoiceDate.getFullYear() === currentYear &&
                   doc.data().paymentStatus === 'Completed';
          })
          .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
        
        // Calculate verified clients (clients with completed invoices)
        const verifiedClientEmails = new Set();
        invoicesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.paymentStatus === 'Completed' && data.clientEmail) {
            verifiedClientEmails.add(data.clientEmail);
          }
        });
        const verifiedClients = verifiedClientEmails.size;
        
        // Fetch pending requests (callback requests + service enquiries)
        const callbackSnapshot = await getDocs(
          query(collection(db, 'callbackRequests'), where('status', '==', 'Pending'))
        );
        const enquiriesSnapshot = await getDocs(
          query(collection(db, 'enquiries'), where('status', '==', 'Pending'))
        );
        const pendingRequests = callbackSnapshot.size + enquiriesSnapshot.size;

        // Fetch all properties
        const propertiesSnapshot = await getDocs(collection(db, 'properties'));
        const allProperties = propertiesSnapshot.size;
        
        // Fetch recent activities
        const recentClientsSnapshot = await getDocs(
          query(collection(db, 'clients'), orderBy('createdAt', 'desc'), limit(2))
        );
        const recentPropertiesSnapshot = await getDocs(
          query(collection(db, 'properties'), orderBy('submittedDate', 'desc'), limit(2))
        );
        
        const activities: Array<{action: string, time: string, type: string}> = [];
        
        // Add recent client registrations
        recentClientsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate() || new Date();
          const timeAgo = getTimeAgo(createdAt);
          activities.push({
            action: `New client registered: ${data.name || 'Unknown'}`,
            time: timeAgo,
            type: 'client'
          });
        });
        
        // Add recent property updates
        recentPropertiesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const submittedDate = data.submittedDate?.toDate() || new Date();
          const timeAgo = getTimeAgo(submittedDate);
          activities.push({
            action: `Property listing updated: ${data.name || 'Property'}`,
            time: timeAgo,
            type: 'property'
          });
        });
        
        // Sort activities by most recent
        activities.sort((a, b) => {
          const timeA = parseTimeAgo(a.time);
          const timeB = parseTimeAgo(b.time);
          return timeA - timeB;
        });
        
        setRealStats({
          totalClients,
          verifiedClients,
          monthlyRevenue,
          pendingRequests,
          leads,
          allProperties
        });
        
        setRecentActivities(activities.slice(0, 4));
        
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Keep default values on error
      } finally {
        setDataLoading(false);
      }
    };
    
    loadDashboardData();
  }, []);
  
  // Helper function to get time ago
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };
  
  // Helper function to parse time ago for sorting
  const parseTimeAgo = (timeAgo: string) => {
    if (timeAgo === 'Just now') return 0;
    const match = timeAgo.match(/(\d+)\s+(minute|hour|day)/);
    if (!match) return 0;
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'minute': return value;
      case 'hour': return value * 60;
      case 'day': return value * 60 * 24;
      default: return 0;
    }
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Statistics data with real values
  const stats = [
    {
      title: 'Total Clients',
      value: dataLoading ? '...' : realStats.totalClients.toLocaleString(),
      change: '+12%',
      changeType: 'positive' as const,
      icon: Users,
      color: 'blue'
    },
    {
      title: 'Verified Clients',
      value: dataLoading ? '...' : realStats.verifiedClients.toLocaleString(),
      change: '+8%',
      changeType: 'positive' as const,
      icon: Building,
      color: 'green'
    },
    {
      title: 'Leads',
      value: dataLoading ? '...' : realStats.leads.toLocaleString(),
      change: '+15%',
      changeType: 'positive' as const,
      icon: BarChart3,
      color: 'cyan'
    },
    {
      title: 'All Properties',
      value: dataLoading ? '...' : realStats.allProperties.toLocaleString(),
      change: '+10%',
      changeType: 'positive' as const,
      icon: Building,
      color: 'teal'
    },
    {
      title: 'Monthly Revenue',
      value: dataLoading ? '...' : formatCurrency(realStats.monthlyRevenue),
      change: '+23%',
      changeType: 'positive' as const,
      icon: TrendingUp,
      color: 'purple'
    },
    {
      title: 'Pending Requests',
      value: dataLoading ? '...' : realStats.pendingRequests.toString(),
      change: '-5%',
      changeType: 'negative' as const,
      icon: Activity,
      color: 'orange'
    }
  ];

  const quickActions = [
    {
      label: 'All Clients',
      description: 'Manage client database',
      icon: Users,
      path: '/clients/AllClients',
      color: 'blue'
    },
    {
      label: 'Platform Users',
      description: 'User management & roles',
      icon: UserCog,
      path: '/users/PlatformUserManagement',
      color: 'indigo'
    },
    {
      label: 'All Properties',
      description: 'Property listings & details',
      icon: Building,
      path: '/properties/AllProperties',
      color: 'green'
    },
    {
      label: 'Payments',
      description: 'Financial transactions',
      icon: Wallet,
      path: '/finance/Payments',
      color: 'purple'
    },
    {
      label: 'Callback Requests',
      description: 'Customer callbacks',
      icon: PhoneCall,
      path: '/crm/CallbackRequests',
      color: 'orange'
    },
    {
      label: 'Service Enquiries',
      description: 'Service requests & support',
      icon: Contact,
      path: '/crm/ServiceEnquiries',
      color: 'teal'
    },
    {
      label: 'Combined History',
      description: 'Activity logs & history',
      icon: History,
      path: '/history/CombinedHistory',
      color: 'gray'
    },
    {
      label: 'Analytics',
      description: 'Reports & insights',
      icon: BarChart3,
      path: '#',
      color: 'pink'
    }
  ];

  // Recent activities are now loaded from Firebase in useEffect above

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: 'from-blue-500 to-blue-600',
      green: 'from-green-500 to-green-600',
      purple: 'from-purple-500 to-purple-600',
      orange: 'from-orange-500 to-orange-600',
      indigo: 'from-indigo-500 to-indigo-600',
      teal: 'from-teal-500 to-teal-600',
      gray: 'from-gray-500 to-gray-600',
      pink: 'from-pink-500 to-pink-600'
    };
    return colorMap[color as keyof typeof colorMap] || 'from-blue-500 to-blue-600';
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header Section */}
      <div className="mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to Propeas Admin
                </h1>
                <p className="text-lg text-gray-600 dark:text-slate-300">
                  Professional property management platform
                </p>
                <div className="flex items-center mt-4 text-sm text-gray-500 dark:text-slate-400">
                  <Calendar className="w-4 h-4 mr-2" />
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Message</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 hover:shadow-xl transition-all duration-200">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-600 dark:text-slate-400 mb-1">{stat.title}</span>
              {dataLoading ? (
                <div className="h-8 bg-gray-300 dark:bg-slate-600 rounded animate-pulse mb-2"></div>
              ) : (
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
              )}
              <span className={`mt-2 text-xs ${stat.changeType === 'positive' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{stat.change} vs last month</span>
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Revenue Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyRevenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke="#8884d8" />
            <YAxis stroke="#8884d8" tickFormatter={v => `₹${v}`}/>
            <Tooltip formatter={v => `₹${v}`}/>
            <Line type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Quick Actions */}
        <div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => action.path !== '#' && navigate(action.path)}
                  className="p-4 rounded-lg border border-gray-200 dark:border-slate-600 hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left bg-gradient-to-r hover:from-gray-50 hover:to-white dark:hover:from-slate-700 dark:hover:to-slate-600"
                  style={{ display: 'block', width: '100%' }}
                >
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                      {action.label}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      {action.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Recent Activity
            </h2>
            <div className="space-y-4">
              {dataLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start space-x-3 p-3 rounded-lg">
                      <div className="w-2 h-2 bg-gray-300 dark:bg-slate-600 rounded-full mt-2 flex-shrink-0 animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 dark:bg-slate-600 rounded animate-pulse mb-2"></div>
                        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded animate-pulse w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.action}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-8 h-8 text-gray-400 dark:text-slate-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-slate-400">No recent activity</p>
                </div>
              )}
            </div>
            <button
              className="w-full mt-4 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              onClick={async () => {
                setIsClientsModalOpen(true);
                setLoadingClients(true);
                try {
                  const clientsSnapshot = await getDocs(query(collection(db, 'clients'), orderBy('createdAt', 'desc')));
                  const clients = clientsSnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                      name: data.name || 'Unknown',
                      email: data.email || '',
                      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toLocaleString() : ''
                    };
                  });
                  setAllClients(clients);
                } catch (e) {
                  setAllClients([]);
                } finally {
                  setLoadingClients(false);
                }
              }}
            >
              View all activity
            </button>
            <RecentClientsModal
              isOpen={isClientsModalOpen}
              onClose={() => setIsClientsModalOpen(false)}
              clients={allClients}
            />
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Display Message"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
              Message Content
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your display message for all users..."
              className="w-full p-4 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all duration-200"
              rows={4}
            />
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 dark:hover:bg-slate-500 text-gray-800 dark:text-white py-3 px-4 rounded-lg font-medium transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={loading || !message.trim()}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;
