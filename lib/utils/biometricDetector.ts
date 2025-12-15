export async function detectBiometric(): Promise<"faceid" | "fingerprint" | "unsupported"> {
  if (!window.PublicKeyCredential || !navigator.credentials) return "unsupported";

  const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!isAvailable) return "unsupported";

  const ua = navigator.userAgent.toLowerCase();

  if (/iphone|ipad/.test(ua)) {
    // iOS devices mostly use Face ID
    return "faceid";
  } else if (/android/.test(ua)) {
    // Android devices mostly use fingerprint
    return "fingerprint";
  }

  // fallback
  return "fingerprint";
}
