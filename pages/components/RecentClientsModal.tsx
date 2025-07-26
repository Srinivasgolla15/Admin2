import React from 'react';

interface RecentClientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Array<{ name: string; email: string; createdAt: string }>;
}

const RecentClientsModal: React.FC<RecentClientsModalProps> = ({ isOpen, onClose, clients }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full max-w-lg p-6 relative">
        <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 dark:hover:text-white" onClick={onClose}>
          &#10005;
        </button>
        <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">Recent Client Registrations</h2>
        <div className="overflow-y-auto max-h-96">
          {clients.length === 0 ? (
            <div className="text-gray-500 dark:text-slate-400 text-center py-8">No recent client registrations</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-slate-600">
              {clients.map((client, idx) => (
                <li key={idx} className="py-3 flex flex-col">
                  <span className="font-medium text-gray-800 dark:text-white">{client.name}</span>
                  <span className="text-sm text-gray-500">{client.email}</span>
                  <span className="text-xs text-gray-400">Registered: {client.createdAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecentClientsModal;
