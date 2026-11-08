// Address helpers for the booking inbox, shared by the Gmail and demo transports.
export const BOOKING_ADDRESS = 'booking@swallowsrose.com';
export const WEBDE_ADDRESS = 'swallowsrose@web.de';
export const BOOKING_FROM = `"Swallow's Rose Booking" <${BOOKING_ADDRESS}>`;

/** "Jane Doe <jane@x.de>" → "Jane Doe"; a bare address stays as it is. */
export function displayName(address: string) {
  const name = address.replace(/<[^>]*>/, '').replace(/"/g, '').trim();
  return name || address.replace(/[<>]/g, '').trim();
}

/** "Jane Doe <jane@x.de>" → "jane@x.de". */
export function bareAddress(address: string) {
  return (address.match(/<([^>]+)>/)?.[1] ?? address).trim();
}

export function isOwnAddress(address: string) {
  const bare = bareAddress(address).toLowerCase();
  return bare === BOOKING_ADDRESS || bare === WEBDE_ADDRESS || bare === 'info@swallowsrose.com';
}

/** Splits on commas/semicolons that are not inside a quoted display name. */
export function splitAddresses(value: string) {
  return value
    .split(/[,;](?=(?:[^"]*"[^"]*")*[^"]*$)/)
    .map((v) => v.trim())
    .filter(Boolean);
}
