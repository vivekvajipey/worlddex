import React, { useEffect } from "react";
import { Modal, View, Text, TouchableOpacity, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../../src/utils/colors";
import { usePostHog } from "posthog-react-native";

interface LevelUpModalProps {
  visible: boolean;
  onClose: () => void;
  newLevel: number;
  rewards?: Array<{
    type: 'badge' | 'filter' | 'capture_limit' | 'title';
    value: string;
    description: string;
  }>;
}

export default function LevelUpModal({ visible, onClose, newLevel, rewards = [] }: LevelUpModalProps) {
  const posthog = usePostHog();
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    if (visible) {
      // Track level up event
      if (posthog) {
        posthog.capture("level_up", {
          newLevel: newLevel,
          rewardCount: rewards.length
        });
      }
      
      // Animate in
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [visible, newLevel, posthog, scaleAnim]);
  
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 justify-center items-center bg-black/60">
        <Animated.View 
          className="bg-background rounded-2xl p-6 w-80 items-center"
          style={{ transform: [{ scale: scaleAnim }] }}
        >
          {/* Star burst animation */}
          <View className="mb-4 items-center">
            <View className="absolute">
              <Ionicons name="star" size={80} color={Colors.primary.DEFAULT} style={{ opacity: 0.2 }} />
            </View>
            <Ionicons name="star" size={60} color={Colors.primary.DEFAULT} />
          </View>
          
          <Text className="text-primary font-lexend-bold text-3xl mb-2">
            Level {newLevel}!
          </Text>
          
          <Text className="text-text-secondary font-lexend-medium text-lg mb-4">
            Congratulations!
          </Text>
          
          {/* Show any rewards */}
          {rewards.length > 0 && (
            <View className="w-full mb-4">
              <Text className="text-text-primary font-lexend-bold text-sm mb-2">
                Rewards Unlocked:
              </Text>
              {rewards.map((reward, i) => (
                <View key={i} className="flex-row items-center mb-2">
                  <Ionicons 
                    name={
                      reward.type === 'badge' ? 'ribbon' :
                      reward.type === 'filter' ? 'camera' :
                      reward.type === 'title' ? 'text' :
                      'add-circle'
                    } 
                    size={20} 
                    color={Colors.primary.DEFAULT} 
                    style={{ marginRight: 8 }} 
                  />
                  <Text className="text-text-secondary text-sm flex-1">
                    {reward.description}
                  </Text>
                </View>
              ))}
            </View>
          )}
          
          <TouchableOpacity
            className="bg-primary rounded-full px-8 py-3 mt-2"
            onPress={onClose}
          >
            <Text className="text-surface font-lexend-bold text-lg">
              Awesome!
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}