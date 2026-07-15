import { useEffect } from 'react';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon } from '@heroicons/react/24/solid';

const Toast = ({ message, type = 'info', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 5000); // Auto-dismiss after 5 seconds
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-z-green/10 border-z-green/30 text-z-green',
    error: 'bg-z-red/10 border-z-red/30 text-z-red',
    info: 'bg-z-blue/10 border-z-blue/30 text-z-blue',
  };

  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-z-green flex-shrink-0" />,
    error: <XCircleIcon className="w-5 h-5 text-z-red flex-shrink-0" />,
    info: <InformationCircleIcon className="w-5 h-5 text-z-blue flex-shrink-0" />,
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 animate-[slideDown_0.4s_ease-out]">
      <div className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl ${styles[type]}`}>
        {icons[type]}
        <div className="flex-1">
          <p className="text-sm font-semibold font-body">{message}</p>
        </div>
        <button onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity">
          <XCircleIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Toast;