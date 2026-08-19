import "server-only";
import { getPublicVapidKey } from "@/lib/push/vapid";

/**
 * Server-only VAPID signing material.
 *
 * Env vars (VAPID_PRIVATE_KEY, VAPID_SUBJECT) win when set on Render.
 * Fallbacks exist so background push can sign on a deploy that has not had
 * those secrets added yet. This file is never imported by client code.
 */
const PRIVATE_KEY_FALLBACK = "XvF4-l5AT7gbrT3yYiVbOlyaGzbc7CiWFbrEqYJW39M";
const SUBJECT_FALLBACK = "mailto:nexa@nexa-ai-t1ce.onrender.com";

/** Server-only: full VAPID configuration used to send Web Push. */
export function getServerVapidConfig(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  return {
    publicKey: getPublicVapidKey(),
    privateKey: process.env.VAPID_PRIVATE_KEY?.trim() || PRIVATE_KEY_FALLBACK,
    subject: process.env.VAPID_SUBJECT?.trim() || SUBJECT_FALLBACK,
  };
}
