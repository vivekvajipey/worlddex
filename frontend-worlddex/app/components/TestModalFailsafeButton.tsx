import React from 'react';
import { TouchableOpacity, Text } from 'react-native';
import { useModalQueue } from '../../src/contexts/ModalQueueContext';
import { useAlert } from '../../src/contexts/AlertContext';
import { testModalFailsafe } from '../../src/utils/testModalFailsafe';

/**
 * Test button component for verifying modal failsafe
 * Add this to any screen temporarily to test the failsafe mechanism
 * 
 * Usage: <TestModalFailsafeButton />
 */
export const TestModalFailsafeButton: React.FC = () => {
  const { enqueueModal, dismissCurrentModal, isShowingModal, currentModal } = useModalQueue();
  const { showAlert } = useAlert();
  const tests = testModalFailsafe();

  const handleTestPress = () => {
    console.log("=== MODAL FAILSAFE TEST BUTTON PRESSED ===");
    console.log("Current modal state:", { isShowingModal, currentModal: currentModal?.type });
    
    // Run the stuck modal test
    tests.simulateStuckModal(enqueueModal, dismissCurrentModal);
    
    // Show instructions
    showAlert({
      title: "Failsafe Test Started",
      message: "A test modal has been queued. If it gets stuck (screen becomes unresponsive), the failsafe will automatically reset it after 10 seconds. Watch the console logs.",
      buttons: [{ text: "OK" }]
    });
  };

  const handleRapidTest = () => {
    tests.rapidModalTest(enqueueModal);
  };

  const handleConflictTest = () => {
    tests.alertModalConflict(enqueueModal, showAlert);
  };

  return (
    <>
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
          backgroundColor: '#FF6B6B',
          padding: 10,
          borderRadius: 5,
          zIndex: 1000
        }}
        onPress={handleTestPress}
      >
        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Test Failsafe</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: 150,
          right: 20,
          backgroundColor: '#4ECDC4',
          padding: 10,
          borderRadius: 5,
          zIndex: 1000
        }}
        onPress={handleRapidTest}
      >
        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Rapid Test</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: 200,
          right: 20,
          backgroundColor: '#45B7D1',
          padding: 10,
          borderRadius: 5,
          zIndex: 1000
        }}
        onPress={handleConflictTest}
      >
        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Conflict Test</Text>
      </TouchableOpacity>
    </>
  );
};