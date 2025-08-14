export type BaseEvent = {
  id: string;               // unique, e.g. Firestore doc id or composed id
  createdAt: number;        // epoch ms
};

export type MatchEvent = BaseEvent & {
  type: 'match';
  // The current device's role in THIS event:
  isCreator: boolean;       // true = I am the second liker (I just liked and created match)
  otherSessionId: string;   // the other person's session_id
  otherName?: string;
};

export type MessageEvent = BaseEvent & {
  type: 'message';
  senderProfileId: string;
  senderSessionId?: string; // for checking mute status
  senderName?: string;
  conversationId?: string;  // optional for deep-link
  preview?: string;
};

export type AnyEvent = MatchEvent | MessageEvent;
