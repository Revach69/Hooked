import { AnyEvent } from './types';

const API_URL = process.env.EXPO_PUBLIC_FUNCTION_NOTIFY_URL;
const API_KEY = process.env.EXPO_PUBLIC_FUNCTION_API_KEY;

type WireData = {
  type: 'match' | 'message';
  otherSessionId?: string;
  otherName?: string;
  conversationId?: string;
};

export async function sendPush(event: AnyEvent, recipientSessionId?: string) {
  if (!API_URL || !API_KEY || !recipientSessionId) {
    console.warn('sendPush skipped: missing API_URL/API_KEY/recipientSessionId');
    return;
  }

  const title =
    event.type === 'match'
      ? (event.isCreator ? "It's a match!" : 'You got a match!')
      : `New message from ${'senderName' in event ? event.senderName ?? 'Someone' : 'Someone'}`;

  const body = event.type === 'message' ? event.preview ?? 'Open to read' : undefined;

  const data: WireData = {
    type: event.type,
    otherSessionId: event.type === 'match' ? event.otherSessionId : undefined,
    otherName: event.type === 'match' ? event.otherName : undefined,
    conversationId: event.type === 'message' ? event.conversationId : undefined,
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ recipientSessionId, title, body, data }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.warn('sendPush error', res.status, text);
  }
}
