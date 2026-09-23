/**
 * Browser notification support for incoming chat messages.
 *
 * - Permission is requested only from a user gesture (the bell button), never
 *   on page load — browsers ignore unprompted requests anyway.
 * - A per-user mute flag lives in localStorage so a shared computer keeps
 *   settings separate between accounts.
 * - Clicking a notification focuses the app and opens that conversation via
 *   the "notifications:open-conversation" window event.
 */

const MUTED_KEY_PREFIX = "loop.notifications.muted.";
const CONVERSATION_MUTED_KEY_PREFIX = "loop.notifications.muted-conversation.";

export const OPEN_CONVERSATION_EVENT = "notifications:open-conversation";

export function mutedKeyFor(userId: string) {
  return `${MUTED_KEY_PREFIX}${userId}`;
}

export function isMuted(userId: string): boolean {
  return localStorage.getItem(mutedKeyFor(userId)) === "1";
}

export function setMuted(userId: string, muted: boolean) {
  if (muted) localStorage.setItem(mutedKeyFor(userId), "1");
  else localStorage.removeItem(mutedKeyFor(userId));
}

/** Per-conversation mute: silences notifications for one conversation only. */
function conversationMutedKeyFor(conversationId: string) {
  return `${CONVERSATION_MUTED_KEY_PREFIX}${conversationId}`;
}

export function isConversationMuted(conversationId: string): boolean {
  return localStorage.getItem(conversationMutedKeyFor(conversationId)) === "1";
}

export function setConversationMuted(conversationId: string, muted: boolean) {
  if (muted) localStorage.setItem(conversationMutedKeyFor(conversationId), "1");
  else localStorage.removeItem(conversationMutedKeyFor(conversationId));
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

/** Must be called from a user gesture. Resolves with the resulting permission. */
export async function requestPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    // Some browsers (older Safari) use the callback form and may throw here.
    return Notification.permission;
  }
}

export type NewMessageNotification = {
  title: string;
  body: string;
  conversationId: string;
  /** Raw payload from the socket; surfaced as the notification's data. */
  tag?: string;
};

export function showMessageNotification({ title, body, conversationId, tag }: NewMessageNotification) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  if (document.hasFocus()) return; // The user is already looking at the app.
  try {
    const notification = new Notification(title, {
      body,
      tag: tag ?? `loop-conversation-${conversationId}`,
      icon: "/favicon.svg",
      data: { conversationId },
    });
    notification.onclick = () => {
      window.focus();
      window.dispatchEvent(new CustomEvent(OPEN_CONVERSATION_EVENT, { detail: { conversationId } }));
      notification.close();
    };
  } catch {
    // Notification construction can fail on some platforms; never break chat for it.
  }
}
