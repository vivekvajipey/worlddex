import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'expo-router';

export type ModalType = 'coinReward' | 'levelUp' | 'locationPrompt' | 'notificationPrompt';

export interface QueuedModal {
  id: string;
  type: ModalType;
  data: any;
  priority: number; // Higher priority shows first
  persistent?: boolean; // Should survive navigation
}

export const useModalQueue = () => {
  const [queue, setQueue] = useState<QueuedModal[]>([]);
  const [currentModal, setCurrentModal] = useState<QueuedModal | null>(null);
  const [isShowingModal, setIsShowingModal] = useState(false);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);

  // Clean up non-persistent modals on navigation
  useEffect(() => {
    if (pathname !== previousPathname.current) {
      console.log('Navigation detected, cleaning up modals');
      
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

  // Process queue when not showing modal
  useEffect(() => {
    if (!isShowingModal && queue.length > 0) {
      // Sort by priority (descending) and take first
      const sorted = [...queue].sort((a, b) => b.priority - a.priority);
      const next = sorted[0];
      
      setCurrentModal(next);
      setIsShowingModal(true);
      
      // Remove from queue
      setQueue(prev => prev.filter(m => m.id !== next.id));
    }
  }, [isShowingModal, queue]);

  const enqueueModal = useCallback((modal: Omit<QueuedModal, 'id'>) => {
    const id = `${modal.type}-${Date.now()}-${Math.random()}`;
    setQueue(prev => [...prev, { ...modal, id }]);
  }, []);

  const dismissCurrentModal = useCallback(() => {
    setCurrentModal(null);
    setIsShowingModal(false);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentModal(null);
    setIsShowingModal(false);
  }, []);

  return {
    currentModal,
    isShowingModal,
    enqueueModal,
    dismissCurrentModal,
    clearQueue,
    queueLength: queue.length
  };
};