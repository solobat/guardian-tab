import React, { createContext, useState, useContext, ReactNode } from 'react';

interface ConfirmContextType {
  isOpen: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
};

export const ConfirmProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [onConfirmCallback, setOnConfirmCallback] = useState<() => void>(() => {});

  const showConfirm = (message: string, onConfirm: () => void) => {
    setIsOpen(true);
    setMessage(message);
    setOnConfirmCallback(() => onConfirm);
  };

  const handleConfirm = () => {
    setIsOpen(false);
    onConfirmCallback();
  };

  const handleCancel = () => {
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider
      value={{
        isOpen,
        message,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
        showConfirm,
      }}
    >
      {children}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-bold mb-4">{message}</h3>
            <div className="flex justify-end space-x-2">
              <button className="btn btn-outline" onClick={handleCancel}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleConfirm}>
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
