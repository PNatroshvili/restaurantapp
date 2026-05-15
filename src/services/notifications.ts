import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { authApi } from '../api/auth';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'ჯავშნები',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00B67A',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const pushToken = tokenData.data;
    await authApi.updatePushToken(pushToken);
    return pushToken;
  } catch {
    return null;
  }
}

export async function scheduleBookingReminder(
  restaurantName: string,
  date: string,
  time: string,
) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const bookingDate = new Date(year, month - 1, day, hour, minute, 0);
  const reminderDate = new Date(bookingDate.getTime() - 60 * 60 * 1000); // 1 hour before

  if (reminderDate <= new Date()) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🍽️ ჯავშნის შეხსენება',
      body: `${restaurantName} — ${time}, 1 საათში`,
      data: { restaurantName, date, time },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: reminderDate,
      channelId: 'bookings',
    },
  });
}

export async function sendBookingConfirmation(restaurantName: string, date: string, time: string, guests: number) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '✅ ჯავშანი გაიგზავნა!',
      body: `${restaurantName} · ${date} · ${time} · ${guests} სტუმარი`,
      data: { restaurantName, date, time },
    },
    trigger: null,
  });
}
