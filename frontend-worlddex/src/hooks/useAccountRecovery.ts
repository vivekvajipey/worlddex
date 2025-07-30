import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, restoreDeletedAccount } from '../../database/supabase';
import { useAlert } from '../contexts/AlertContext';

export function useAccountRecovery() {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const { showAlert } = useAlert();

  useEffect(() => {
    if (!userId) return;

    const checkDeletedAccount = async () => {
      try {
        // Check if user account is soft deleted
        const { data, error } = await supabase
          .from('users')
          .select('deleted_at')
          .eq('id', userId)
          .single();

        if (error) {
          console.error('Error checking account status:', error);
          return;
        }

        if (data?.deleted_at) {
          console.log('Account recovery: Found deleted account, showing alert');
          // Add a small delay to ensure AlertComponent is mounted
          setTimeout(() => {
            // Account is soft deleted, ask if they want to restore
            showAlert({
            title: 'Account Recovery',
            message: 'Your account was recently deleted. Would you like to restore it?',
            icon: 'refresh-circle-outline',
            iconColor: '#3B82F6',
            buttons: [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: async () => {
                  // Sign them out if they don't want to restore
                  await supabase.auth.signOut();
                }
              },
              {
                text: 'Restore',
                onPress: async () => {
                  try {
                    await restoreDeletedAccount(userId);
                    showAlert({
                      title: 'Success',
                      message: 'Your account has been restored!',
                      icon: 'checkmark-circle-outline',
                      iconColor: '#10B981'
                    });
                  } catch (error) {
                    console.error('Error restoring account:', error);
                    showAlert({
                      title: 'Error',
                      message: 'Failed to restore account. Please try again.',
                      icon: 'alert-circle-outline',
                      iconColor: '#EF4444'
                    });
                  }
                }
              }
            ]
          });
          }, 500); // 500ms delay to ensure component is mounted
        }
      } catch (error) {
        console.error('Error in account recovery check:', error);
      }
    };

    checkDeletedAccount();
  }, [userId, showAlert]);
}