import * as Calendar from 'expo-calendar';
import { Alert, Platform } from 'react-native';

async function getDefaultCalendarId(): Promise<string | null> {
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable = calendars.find(c =>
    c.allowsModifications && (Platform.OS === 'ios' ? c.source?.name === 'Default' : c.isPrimary)
  ) || calendars.find(c => c.allowsModifications);
  return writable?.id || null;
}

export async function addBookingToCalendar(
  restaurantName: string,
  date: string,
  time: string,
  guests: number,
): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('', 'კალენდარზე წვდომა საჭიროა');
      return false;
    }

    const [year, month, day] = date.split('-').map(Number);
    const [hour, minute] = time.split(':').map(Number);
    const startDate = new Date(year, month - 1, day, hour, minute, 0);
    const endDate = new Date(startDate.getTime() + 90 * 60 * 1000); // 1.5 hours

    const calendarId = await getDefaultCalendarId();
    if (!calendarId) {
      Alert.alert('', 'კალენდარი ვერ მოიძებნა');
      return false;
    }

    await Calendar.createEventAsync(calendarId, {
      title: `🍽️ ${restaurantName}`,
      startDate,
      endDate,
      notes: `SKUP Restaurants — ჯავშანი ${guests} სტუმარზე`,
      alarms: [{ relativeOffset: -60 }],
    });

    return true;
  } catch {
    return false;
  }
}
