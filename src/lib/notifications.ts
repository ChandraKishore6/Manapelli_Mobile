import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification behavior when app is in foreground (wrapped safely to prevent module-load crashes)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
} catch (handlerErr) {
  console.warn('Could not set notification handler:', handlerErr);
}

/**
 * Registers device for push notifications and saves token to user profile.
 */
export async function registerForPushNotificationsAsync(profileId?: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!Device.isDevice) {
    console.log('Must use physical device for Push Notifications');
    return null;
  }

  let token: string | null = null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission denied');
      return null;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'a07408f4-ef29-4d9f-8986-3b6c6ddfed33',
      });
      token = tokenData.data;
    } catch (tokenErr) {
      console.warn('Could not obtain Expo push token (check APNs credentials / entitlements):', tokenErr);
      return null;
    }

    // Set Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default ManaPelli Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#8B1E3F',
      });
    }

    // Save push_token to profiles if profileId provided
    if (profileId && token) {
      await supabase
        .from('profiles')
        .update({ push_token: token } as any)
        .eq('id', profileId);
    }
  } catch (error) {
    console.warn('Error in registerForPushNotificationsAsync:', error);
  }

  return token;
}

/**
 * Sends a push notification via Expo's Push API endpoint.
 */
export async function sendExpoPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<boolean> {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) {
    return false;
  }

  const message = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data: data || {},
  };

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const resData = await response.json();
    return resData?.data?.status === 'ok';
  } catch (error) {
    console.error('Failed to send push notification:', error);
    return false;
  }
}

/**
 * Triggers a chat message push notification to a recipient profile.
 */
export async function triggerChatNotification(
  receiverProfileId: string,
  senderName: string,
  messageText: string,
  senderProfileId: string
) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', receiverProfileId)
      .maybeSingle();

    const pushToken = (data as any)?.push_token;
    if (pushToken) {
      const truncatedMsg = messageText.length > 60 ? messageText.substring(0, 57) + '...' : messageText;
      await sendExpoPushNotification(
        pushToken,
        `📩 ${senderName}`,
        truncatedMsg,
        { screen: 'chat_detail', peerProfileId: senderProfileId }
      );
    }
  } catch (err) {
    console.error('Error sending chat notification:', err);
  }
}

/**
 * Triggers an express interest push notification to a recipient profile.
 */
export async function triggerInterestNotification(
  receiverProfileId: string,
  senderName: string,
  senderProfileId: string
) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', receiverProfileId)
      .maybeSingle();

    const pushToken = (data as any)?.push_token;
    if (pushToken) {
      await sendExpoPushNotification(
        pushToken,
        '💌 New Interest Expressed!',
        `${senderName} expressed interest in your profile.`,
        { screen: 'interests', senderProfileId }
      );
    }
  } catch (err) {
    console.error('Error sending interest notification:', err);
  }
}

/**
 * Triggers an interest accepted push notification to the original sender.
 */
export async function triggerInterestAcceptedNotification(
  receiverProfileId: string,
  senderName: string,
  senderProfileId: string
) {
  try {
    const { data } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', receiverProfileId)
      .maybeSingle();

    const pushToken = (data as any)?.push_token;
    if (pushToken) {
      await sendExpoPushNotification(
        pushToken,
        '💖 Interest Accepted!',
        `${senderName} accepted your interest. Tap to start chatting!`,
        { screen: 'chat_detail', peerProfileId: senderProfileId }
      );
    }
  } catch (err) {
    console.error('Error sending interest accepted notification:', err);
  }
}
