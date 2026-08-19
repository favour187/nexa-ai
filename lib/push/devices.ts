/**
 * Helpers for storing Web Push devices inside notification_settings.channels
 * when the dedicated push_subscriptions table is not available yet.
 */

export interface StoredPushDevice {
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent?: string | null;
}

export function isMissingPushTableError(error: {
  message?: string;
  code?: string;
} | null | undefined): boolean {
  if (!error) return false;
  const msg = error.message ?? "";
  return (
    error.code === "PGRST205" ||
    msg.includes("schema cache") ||
    msg.includes("push_subscriptions") ||
    msg.includes("does not exist")
  );
}

export function readStoredDevices(channels: unknown): StoredPushDevice[] {
  if (!channels || typeof channels !== "object") return [];
  const raw = (channels as { push_devices?: unknown }).push_devices;
  if (!Array.isArray(raw)) return [];
  const out: StoredPushDevice[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (
      typeof rec.endpoint === "string" &&
      typeof rec.p256dh === "string" &&
      typeof rec.auth === "string"
    ) {
      out.push({
        endpoint: rec.endpoint,
        p256dh: rec.p256dh,
        auth: rec.auth,
        user_agent: typeof rec.user_agent === "string" ? rec.user_agent : null,
      });
    }
  }
  return out;
}

export function writeStoredDevices(
  channels: unknown,
  devices: StoredPushDevice[],
): Record<string, unknown> {
  const base =
    channels && typeof channels === "object" && !Array.isArray(channels)
      ? { ...(channels as Record<string, unknown>) }
      : {};
  base.push = true;
  base.push_devices = devices;
  return base;
}

export function upsertStoredDevice(
  channels: unknown,
  device: StoredPushDevice,
): Record<string, unknown> {
  const next = readStoredDevices(channels).filter(
    (d) => d.endpoint !== device.endpoint,
  );
  next.push(device);
  return writeStoredDevices(channels, next);
}

export function removeStoredDevice(
  channels: unknown,
  endpoint: string,
): Record<string, unknown> {
  return writeStoredDevices(
    channels,
    readStoredDevices(channels).filter((d) => d.endpoint !== endpoint),
  );
}
