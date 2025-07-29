import { useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { supabase, restoreDeletedAccount } from '../../database/supabase';

export function useAccountRecovery() {
  const { session } = useAuth();
  const userId = session?.user?.id;

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
          // Account is soft deleted, ask if they want to restore
          Alert.alert(
            'Account Recovery',
            'Your account was recently deleted. Would you like to restore it?',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: async () => {
                  // Sign them out if they don't want to restore
                  await supabase.auth.signOut();
                }
              },
              {
                text: 'Restore Account',
                onPress: async () => {
                  try {
                    await restoreDeletedAccount(userId);
                    Alert.alert('Success', 'Your account has been restored!');
                  } catch (error) {
                    console.error('Error restoring account:', error);
                    Alert.alert('Error', 'Failed to restore account. Please try again.');
                  }
                }
              }
            ],
            { cancelable: false }
          );
        }
      } catch (error) {
        console.error('Error in account recovery check:', error);
      }
    };

    checkDeletedAccount();
  }, [userId]);
}