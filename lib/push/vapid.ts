









export const PUBLIC_VAPID_KEY_FALLBACK =
  "BF1Z_-1H3ehq9jm06H7PO2flbVenGVMwTBxxmLrzMs9YzntdwcbYGIGX2_NIy6nuAY0sotmxwwkJFKrEr62apSQ";


export function getPublicVapidKey(): string {
  return (
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || PUBLIC_VAPID_KEY_FALLBACK
  );
}
