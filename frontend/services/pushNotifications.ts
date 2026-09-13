import { Platform } from "react-native";
import Constants from "expo-constants";
import { registerDeviceToken } from "@/services/notifications";

function getProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

function isExpoGo(): boolean {
  return Constants.appOwnership === "expo";
}

/**
 * Registers the current device for Expo push notifications.
 *
 * Android remote push notifications are not supported by Expo Go on SDK 53+.
 * We therefore skip registration in Expo Go and only load expo-notifications
 * in a development/production build. This also prevents the Expo Go warning
 * from being emitted during module initialization.
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === "web" || isExpoGo()) {
    if (isExpoGo()) {
      console.log("Push notifications require an Expo development/production build; skipping Expo Go registration.");
    }
    return null;
  }

  try {
    // Load expo-notifications only when native remote notifications can run.
    const Notifications = await import("expo-notifications");

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Default",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
      });
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (finalStatus !== "granted") {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== "granted") {
      console.log("Push notification permission was not granted.");
      return null;
    }

    const projectId = getProjectId();
    if (!projectId) {
      console.warn("Expo projectId is missing; push token cannot be registered.");
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResponse.data;

    if (!token) return null;

    await registerDeviceToken(token, "EXPO");
    console.log("Expo push token registered successfully.");
    return token;
  } catch (error) {
    // Push setup must never block or log users out of the application.
    console.warn("Push notification registration failed:", error);
    return null;
  }
}
