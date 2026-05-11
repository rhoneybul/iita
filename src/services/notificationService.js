// Push notifications — register an Expo push token with the server so
// the partner can be notified when the other person adds an event.
//
// Modelled on ../../etapa/src/services/notificationService.js, stripped
// to iita's single notification type (partner-added-event). No focus
// gating, no analytics — keep it small.

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

import { api } from './api';

// Foreground behaviour: always show the banner. iita has no in-app chat
// surfaces where a push on top of the conversation would be noise.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let final = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      final = status;
    }
    if (final !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData?.data;
    if (!token) return null;

    await api.notifications.registerToken({ token, platform: Platform.OS });
    return token;
  } catch (err) {
    // Simulators, denied permissions, network blips — all silent.
    // We surface nothing to the user; pull-to-refresh remains the
    // working fallback.
    if (__DEV__) console.log('[notifications] registration skipped:', err?.message || err);
    return null;
  }
}

export function addNotificationResponseListener(cb) {
  return Notifications.addNotificationResponseReceivedListener(cb);
}
