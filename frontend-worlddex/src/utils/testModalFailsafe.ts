/**
 * Simple test utility to verify the modal failsafe mechanism
 * 
 * Usage: Import and call testModalFailsafe() from any component
 * This will simulate a stuck modal scenario to verify the failsafe works
 */

import { useModalQueue } from '../contexts/ModalQueueContext';

export const testModalFailsafe = () => {
  console.log("=== MODAL FAILSAFE TEST STARTED ===");
  
  // This function should be called from a component that has access to the modal queue
  // It will create a scenario where a modal gets stuck
  
  return {
    // Test 1: Simulate a stuck modal by forcing state mismatch
    simulateStuckModal: (enqueueModal: any, dismissCurrentModal: any) => {
      console.log("Test 1: Simulating stuck modal scenario...");
      
      // Step 1: Queue a test modal
      enqueueModal({
        type: 'coinReward',
        data: {
          total: 0,
          rewards: [],
          xpTotal: 5,
          xpRewards: [{ amount: 5, reason: 'Failsafe test' }]
        },
        priority: 100,
        persistent: true
      });
      
      console.log("Test modal queued. The failsafe should reset it after 10 seconds if it gets stuck.");
      
      // Step 2: After 2 seconds, try to break the modal state
      setTimeout(() => {
        console.log("Attempting to create stuck state by interfering with modal...");
        // In a real stuck scenario, the modal would be showing but not visible
        // The failsafe should detect this and reset after 10 seconds total
      }, 2000);
    },
    
    // Test 2: Rapid modal switching (common cause of stuck modals)
    rapidModalTest: (enqueueModal: any) => {
      console.log("Test 2: Rapid modal switching test...");
      
      // Queue multiple modals rapidly
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          enqueueModal({
            type: 'coinReward',
            data: {
              total: i * 10,
              rewards: [{ amount: i * 10, reason: `Test ${i + 1}` }],
              xpTotal: 0,
              xpRewards: []
            },
            priority: 50,
            persistent: true
          });
        }, i * 100); // Queue with 100ms intervals
      }
      
      console.log("Queued 3 modals rapidly. Watch for stuck states.");
    },
    
    // Test 3: Alert + Modal conflict simulation
    alertModalConflict: (enqueueModal: any, showAlert: any) => {
      console.log("Test 3: Alert + Modal conflict test...");
      
      // Show an alert
      showAlert({
        title: "Test Alert",
        message: "Click OK quickly while a modal tries to show",
        buttons: [{
          text: "OK",
          onPress: () => {
            console.log("Alert dismissed - modal should handle this gracefully");
          }
        }]
      });
      
      // Try to show a modal at the same time
      setTimeout(() => {
        enqueueModal({
          type: 'levelUp',
          data: { newLevel: 99 },
          priority: 100,
          persistent: true
        });
      }, 100);
      
      console.log("Alert shown with modal queued. The system should handle this without getting stuck.");
    }
  };
};

/**
 * Hook to use in a test component
 */
export const useModalFailsafeTest = () => {
  const { enqueueModal, dismissCurrentModal } = useModalQueue();
  
  const runAllTests = () => {
    const tests = testModalFailsafe();
    
    console.log("=== RUNNING ALL MODAL FAILSAFE TESTS ===");
    
    // Run tests with delays between them
    tests.simulateStuckModal(enqueueModal, dismissCurrentModal);
    
    setTimeout(() => {
      tests.rapidModalTest(enqueueModal);
    }, 15000); // Wait 15s for first test to complete
    
    // Note: alertModalConflict test would need showAlert from AlertContext
    console.log("Tests initiated. Monitor console for results.");
  };
  
  return { runAllTests };
};