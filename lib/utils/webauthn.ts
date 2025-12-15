// /lib/utils/webauthn.ts
export const bufferToBase64Url = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

export const base64UrlToBuffer = (base64url: string) => {
  // browser implementation (client)
  base64url = base64url.replace(/-/g, "+").replace(/_/g, "/");
  // pad
  const pad = base64url.length % 4;
  if (pad) base64url += "=".repeat(4 - pad);
  const binary = atob(base64url);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

// Node-side variants (server) — base64url decode to Buffer
export const base64UrlToNodeBuffer = (s: string) => {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
};

export const nodeBufferToBase64Url = (buf: Buffer) =>
  buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
