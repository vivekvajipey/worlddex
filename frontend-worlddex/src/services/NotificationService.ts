import * as Notifications from "expo-notifications";

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const notificationMessages = [
  "Time for your daily WorldDex capture! 🌍✨",
  "Ready to capture the world? Your daily moment awaits! 📸",
  "Hey explorer! Time to add to your WorldDex collection! 🌎",
  "Your daily dose of WorldDex is ready! Let's capture something amazing! 📱",
  "The world is waiting for your capture! Time to shine! ✨",
  "Ready to make today's memory? Your WorldDex moment is now! 🎯",
  "Time to add another gem to your WorldDex collection! 💎",
  "Your daily WorldDex adventure awaits! Let's capture it! 🚀",
  "Don't forget to capture today's special moment! 🌟",
  "The world is your canvas - time to paint it with WorldDex! 🎨",
];

export class NotificationService {
  static async requestPermissions() {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      return false;
    }

    return true;
  }

  static async scheduleDailyNotification() {
    // Cancel any existing notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Generate random time between 9 AM and 8 PM
    const randomHour = Math.floor(Math.random() * (20 - 9 + 1)) + 9;
    const randomMinute = Math.floor(Math.random() * 60);

    // Get random message
    const randomMessage =
      notificationMessages[
        Math.floor(Math.random() * notificationMessages.length)
      ];

    // Schedule the notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "WorldDex Daily Capture!",
        body: randomMessage,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        hour: randomHour,
        minute: randomMinute,
        repeats: true,
        type: "daily",
      } as any,
    });

    // console.log(
    //   `Scheduled daily notification for ${randomHour}:${randomMinute
    //     .toString()
    //     .padStart(2, "0")}`
    // );
  }

  static async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
