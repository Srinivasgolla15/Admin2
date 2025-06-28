import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import Modal from '../components/ui/Modal';
import { db } from '../services/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

const DashboardPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="p-6 text-blue-100 bg-gray-800 dark:bg-slate-900 rounded shadow-md space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome to the Dashboard!</h1>
        <p className="mt-2 text-gray-300">Propeas Admin work in progress.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center border-2 border-dashed border-blue-500 rounded-xl p-6 hover:bg-blue-900 cursor-pointer transition"
        >
          <Plus className="w-6 h-6 text-blue-300 mr-2" />
          <span className="text-blue-200 font-medium">Display Message</span>
        </button>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Display Message"
        size="md"
      >
        <div className="space-y-4">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your display message..."
            className="w-full p-2 border rounded bg-white text-black dark:bg-slate-800 dark:text-white"
            rows={4}
          />
          <button
            onClick={handleSendMessage}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default DashboardPage;
