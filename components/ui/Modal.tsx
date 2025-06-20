import React from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer
}) => {
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg w-full ${sizeClasses[size]} flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-600">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="px-4 py-3 sm:px-6 overflow-y-auto max-h-[70vh]">
              {children}
            </div>
            {footer && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
