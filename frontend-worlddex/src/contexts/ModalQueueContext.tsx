import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { usePathname } from 'expo-router';

export type ModalType = 'coinReward' | 'levelUp' | 'locationPrompt' | 'notificationPrompt' | 'onboardingCircle' | 'onboardingSwipe';

export interface QueuedModal {
  id: string;
  type: ModalType;
  data: any;
  priority: number; // Higher priority shows first
  persistent?: boolean; // Should survive navigation
}

interface ModalQueueContextType {
  currentModal: QueuedModal | null;
  isShowingModal: boolean;
  enqueueModal: (modal: Omit<QueuedModal, 'id'>) => void;
  dismissCurrentModal: () => void;
  clearQueue: () => void;
  queueLength: number;
}

const ModalQueueContext = createContext<ModalQueueContextType | undefined>(undefined);

export const useModalQueue = () => {
  const context = useContext(ModalQueueContext);
  if (!context) {
    throw new Error('useModalQueue must be used within a ModalQueueProvider');
  }
  return context;
};

interface ModalQueueProviderProps {
  children: ReactNode;
}

export const ModalQueueProvider: React.FC<ModalQueueProviderProps> = ({ children }) => {
  const [queue, setQueue] = useState<QueuedModal[]>([]);
  const [currentModal, setCurrentModal] = useState<QueuedModal | null>(null);
  const [isShowingModal, setIsShowingModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);


  // Clean up non-persistent modals on navigation
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      
      // Remove non-persistent modals from queue
      setQueue(prev => prev.filter(modal => modal.persistent));
      
      // Hide current modal if not persistent
      if (currentModal && !currentModal.persistent) {
        setCurrentModal(null);
        setIsShowingModal(false);
      }
      
      previousPathname.current = pathname;
    }
  }, [pathname, currentModal]);

  // Process queue when not showing modal and not processing
  useEffect(() => {
    if (!isShowingModal && !isProcessing && queue.length > 0) {
      console.log("[ModalQueue] Processing queue, length:", queue.length);
      setIsProcessing(true);
      
      // Brief delay to allow UI to settle between modals
      setTimeout(() => {
        // Sort by priority (descending) and take first
        const sorted = [...queue].sort((a, b) => b.priority - a.priority);
        const next = sorted[0];
        
        console.log("[ModalQueue] Showing modal:", next.type, next.id);
        setCurrentModal(next);
        setIsShowingModal(true);
        
        // Remove from queue
        setQueue(prev => prev.filter(m => m.id !== next.id));
        setIsProcessing(false);
      }, 300); // 300ms breathing room between modals
    }
  }, [isShowingModal, isProcessing, queue]);

  const enqueueModal = useCallback((modal: Omit<QueuedModal, 'id'>) => {
    const id = `${modal.type}-${Date.now()}-${Math.random()}`;
    console.log("[ModalQueue] Enqueuing modal:", modal.type, id);
    setQueue(prev => [...prev, { ...modal, id }]);
  }, []);

  const dismissCurrentModal = useCallback(() => {
    console.log("[ModalQueue] Dismissing modal:", currentModal?.type);
    setCurrentModal(null);
    setIsShowingModal(false);
  }, [currentModal]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentModal(null);
    setIsShowingModal(false);
  }, []);

  const value: ModalQueueContextType = {
    currentModal,
    isShowingModal,
    enqueueModal,
    dismissCurrentModal,
    clearQueue,
    queueLength: queue.length
  };

  return (
    <ModalQueueContext.Provider value={value}>
      {children}
    </ModalQueueContext.Provider>
  );
};