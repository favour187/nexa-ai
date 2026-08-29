import "server-only";
import { getPublicVapidKey } from "@/lib/push/vapid";








const PRIVATE_KEY_FALLBACK = "XvF4-l5AT7gbrT3yYiVbOlyaGzbc7CiWFbrEqYJW39M";
const SUBJECT_FALLBACK = "mailto:nexa@nexa-ai-t1ce.onrender.com";


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
