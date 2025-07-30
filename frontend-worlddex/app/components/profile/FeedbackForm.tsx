import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as MailComposer from 'expo-mail-composer';
import Colors from "../../../src/utils/colors";
import { usePostHog } from "posthog-react-native";
import { useStyledAlert } from "../../../src/hooks/useStyledAlert";

interface FeedbackFormProps {
  visible: boolean;
  onClose: () => void;
}

export default function FeedbackForm({ visible, onClose }: FeedbackFormProps) {
  const posthog = usePostHog();
  const { showAlert, AlertComponent } = useStyledAlert();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // Track screen view only when modal becomes visible
    if (visible && posthog) {
      posthog.screen("Feedback-Form");
    }
  }, [visible, posthog]);

  const handleSendFeedback = async () => {
    if (!message.trim()) {
      showAlert({
        title: "Error",
        message: "Please enter a message",
        icon: "alert-circle-outline",
        iconColor: "#EF4444"
      });
      return;
    }

    setIsSending(true);

    try {
      // Check if mail is available
      const isAvailable = await MailComposer.isAvailableAsync();

      if (!isAvailable) {
        showAlert({
          title: "Error",
          message: "Mail service is not available on this device. Please use a different method to send feedback.",
          icon: "mail-outline",
          iconColor: "#EF4444"
        });
        return;
      }

      // Send mail
      const result = await MailComposer.composeAsync({
        recipients: ["antqin27@gmail.com"],
        subject: `WorldDex: ${subject || "Feedback"}`,
        body: message,
        isHtml: false,
      });

      if (result.status === "sent" || result.status === "saved") {
        // Clear form and close
        setSubject("");
        setMessage("");
        onClose();
      }
    } catch (error) {
      console.error("Error sending feedback:", error);
      showAlert({
        title: "Error",
        message: "Failed to send feedback. Please try again later.",
        icon: "alert-circle-outline",
        iconColor: "#EF4444"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-end">
          <TouchableOpacity
            className="absolute inset-0 bg-black/40"
            onPress={onClose}
          />
          <View className="bg-surface rounded-t-3xl p-6 pb-8">
            <View className="w-12 h-1 bg-gray-300 rounded-full self-center mb-6" />

            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-text-primary font-lexend-bold text-xl">
                Help & Feedback
              </Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Ionicons name="close" size={24} color={Colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <ScrollView className="mb-4">
              <Text className="text-text-secondary font-lexend-medium mb-6">
                We'd love to hear your feedback! Let us know about any issues you're encountering or suggestions for improving WorldDex.
              </Text>

              <Text className="text-text-primary font-lexend-medium mb-2">Subject</Text>
              <TextInput
                value={subject}
                onChangeText={setSubject}
                placeholder="What's this about?"
                className="border border-gray-200 rounded-lg p-3 mb-4 font-lexend-regular text-text-primary"
              />

              <Text className="text-text-primary font-lexend-medium mb-2">Message</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                placeholder="Tell us what's on your mind..."
                multiline
                numberOfLines={8}
                textAlignVertical="top"
                className="border border-gray-200 rounded-lg p-3 mb-4 min-h-[120px] font-lexend-regular text-text-primary"
              />
            </ScrollView>

            <TouchableOpacity
              onPress={handleSendFeedback}
              disabled={!message.trim() || isSending}
              className={`${message.trim() && !isSending ? 'bg-primary' : 'bg-primary/50'} py-3 rounded-lg flex-row justify-center items-center`}
            >
              <Ionicons name="paper-plane" size={20} color="white" className="mr-2" />
              <Text className="text-white font-lexend-bold ml-2">
                {isSending ? "Sending..." : "Send Feedback"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Styled Alert Component */}
        <AlertComponent />
      </KeyboardAvoidingView>
    </Modal>
  );
} 