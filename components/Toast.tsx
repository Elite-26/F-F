import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

const toastOrder: string[] = [];
const offsetRegistry = new Map<string, (index: number) => void>();

const registerToast = (id: string, setOffsetIndex: (index: number) => void) => {
  toastOrder.unshift(id);
  offsetRegistry.set(id, setOffsetIndex);
  updateOffsets();
};

const unregisterToast = (id: string) => {
  const index = toastOrder.indexOf(id);
  if (index !== -1) {
    toastOrder.splice(index, 1);
  }
  offsetRegistry.delete(id);
  updateOffsets();
};

const updateOffsets = () => {
  toastOrder.forEach((toastId, idx) => {
    const setter = offsetRegistry.get(toastId);
    setter?.(idx);
  });
};

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
  const idRef = useRef<string>(`toast-${Math.random().toString(36).slice(2)}`);
  const [offsetIndex, setOffsetIndex] = useState(0);

  useEffect(() => {
    registerToast(idRef.current, setOffsetIndex);

    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(timer);
      unregisterToast(idRef.current);
    };
  }, [duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'error':
        return <XCircle className="text-red-500" size={20} />;
      case 'info':
        return <AlertCircle className="text-blue-500" size={20} />;
    }
  };

  const getStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-white border-green-500';
      case 'error':
        return 'bg-white border-red-500';
      case 'info':
        return 'bg-white border-blue-500';
    }
  };

  return (
    <div
      className="fixed right-4 z-[9999] pointer-events-none transition-all"
      style={{ top: `${16 + offsetIndex * 88}px` }}
    >
      <div
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg border-l-4 ${getStyles()} animate-slide-in pointer-events-auto`}
        style={{ minWidth: '300px', maxWidth: '500px' }}
      >
        {getIcon()}
        <p className="flex-1 text-sm text-gray-800">{message}</p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

