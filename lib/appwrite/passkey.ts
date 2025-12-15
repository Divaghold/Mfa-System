"use server";

import { createAdminClient, createSessionClient } from "@/lib/appwrite/index";
import { cookies } from "next/headers";
import { ID, Account } from "node-appwrite";

// Extend Account type to include passkey methods
declare global {
  interface AccountPasskeyMethods {
    createPasskey(passkeyId: string, options: any): Promise<any>;
    updatePasskey(passkeyId: string, options: any): Promise<any>;
    listPasskeys(): Promise<any>;
    deletePasskey(passkeyId: string): Promise<any>;
    createPasskeySession(): Promise<any>;
    updatePasskeySession(passkeyId: string, options: any): Promise<any>;
  }
}

// Type augmentation for Account
declare module "node-appwrite" {
  interface Account extends AccountPasskeyMethods {}
}

// -----------------------------
// Types
// -----------------------------

/** Minimal typed shape for Appwrite passkey start result (publicKey options) */
export type PasskeyStartResult = {
  [x: string]: any;
  challenge: string; // base64url
  publicKey: any; // publicKey options object returned by Appwrite (keeps flexible)
};

export type RegisterPasskeyFinishInput = {
  passkeyId: string;
  clientDataJSON: string; // base64url
  attestationObject: string; // base64url
};

export type FinishPasskeyRegistrationResult = Record<string, any>;

export type BeginPasskeyLoginResult = {
  challenge: string; // base64url
  publicKey: any; // publicKey assertion options
};

export type FinishPasskeyLoginInput = {
  passkeyId: string;
  clientDataJSON: string; // base64url
  authenticatorData: string; // base64url
  signature: string; // base64url
};

export type SessionWithSecret = {
  id: string;
  userId?: string;
  secret: string; // used for cookie
  [key: string]: any;
};

// -----------------------------
// Helpers: base64url <-> ArrayBuffer
// -----------------------------

const base64UrlRegex = /^[A-Za-z0-9_-]+={0,2}$/;

function isBase64Url(value: string) {
  return typeof value === "string" && base64UrlRegex.test(value);
}

/** Convert ArrayBuffer (or TypedArray) to base64url string */
export async function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa expects binary string
  const base64 = typeof globalThis !== "undefined" && (globalThis as any).btoa
    ? (globalThis as any).btoa(binary)
    : Buffer.from(binary, "binary").toString("base64");

  // to base64url
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Convert base64url string to ArrayBuffer */
export async function base64UrlToBuffer(base64url: string): Promise<Uint8Array> {
  if (!isBase64Url(base64url)) throw new Error("Invalid base64url string.");

  // convert base64url -> base64
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - (base64url.length % 4)) % 4);

  const binary = typeof globalThis !== "undefined" && (globalThis as any).atob
    ? (globalThis as any).atob(base64)
    : Buffer.from(base64, "base64").toString("binary");

  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// -----------------------------
// Utilities
// -----------------------------

function safeString(input: unknown, name = "value"): string {
  if (typeof input !== "string") throw new Error(`${name} must be a string`);
  return input.trim();
}

function ensureBase64Url(input: unknown, name = "value"): string {
  const v = safeString(input, name);
  if (!isBase64Url(v)) throw new Error(`${name} must be a base64url string`);
  return v;
}

// -----------------------------
// Passkey Registration (AFTER LOGIN)
// -----------------------------

/**
 * Step 1 — Start the Passkey Registration Ceremony
 * Appwrite → account.createPasskey()
 */
export async function registerPasskeyStart(): Promise<PasskeyStartResult> {
  try {
    const { account } = await createSessionClient();

    const start = await account.createPasskey(ID.unique(), {
      name: "My Device Passkey",
    });

    // Appwrite returns challenge + publicKey
    return start as PasskeyStartResult;
  } catch (err) {
    console.error("registerPasskeyStart error:", err);
    throw new Error("Failed to start passkey registration.");
  }
}

/**
 * Step 2 — Finish Passkey Registration
 * Appwrite → account.updatePasskey()
 */
export async function registerPasskeyFinish({
  passkeyId,
  clientDataJSON,
  attestationObject,
}: RegisterPasskeyFinishInput): Promise<FinishPasskeyRegistrationResult> {
  try {
    if (!passkeyId || typeof passkeyId !== "string") throw new Error("passkeyId is required");
    const clientData = ensureBase64Url(clientDataJSON, "clientDataJSON");
    const attObj = ensureBase64Url(attestationObject, "attestationObject");

    const { account } = await createSessionClient();

    const result = await account.updatePasskey(passkeyId, {
      clientDataJSON: clientData,
      attestationObject: attObj,
    });

    return result as FinishPasskeyRegistrationResult;
  } catch (err) {
    console.error("registerPasskeyFinish error:", err);
    throw new Error("Failed to complete passkey registration.");
  }
}

// List user passkeys
export async function listPasskeys(): Promise<any> {
  const { account } = await createSessionClient();
  return account.listPasskeys();
}

// Delete a passkey
export async function deletePasskey(passkeyId: string): Promise<any> {
  if (!passkeyId || typeof passkeyId !== "string") throw new Error("passkeyId is required");
  const { account } = await createSessionClient();
  return account.deletePasskey(passkeyId);
}

// -----------------------------
// Passkey Login (BEFORE LOGIN)
// -----------------------------

/**
 * Start login ceremony
 */
export async function beginPasskeyLogin(): Promise<BeginPasskeyLoginResult> {
  try {
    const { account } = await createAdminClient();

    const result = await account.createPasskeySession();

    // Log the result to inspect its structure
    console.log("Passkey session start result:", result);

    // Return the result as BeginPasskeyLoginResult
    return result as BeginPasskeyLoginResult;
  } catch (err) {
    console.error("beginPasskeyLogin error:", err);
    throw new Error("Failed to start passkey login.");
  }
}


/**
 * Finish login ceremony — returns session and sets cookie
 */
export async function finishPasskeyLogin({
  passkeyId,
  clientDataJSON,
  authenticatorData,
  signature,
}: FinishPasskeyLoginInput): Promise<SessionWithSecret> {
  try {
    if (!passkeyId || typeof passkeyId !== "string") throw new Error("passkeyId is required");
    const cd = ensureBase64Url(clientDataJSON, "clientDataJSON");
    const ad = ensureBase64Url(authenticatorData, "authenticatorData");
    const sig = ensureBase64Url(signature, "signature");

    const { account } = await createAdminClient();

    const session = (await account.updatePasskeySession(passkeyId, {
      clientDataJSON: cd,
      authenticatorData: ad,
      signature: sig,
    })) as SessionWithSecret;

    if (!session || !session.secret) throw new Error("Invalid session returned from Appwrite");

    // Store session cookie (same as verifySecret)
    const cookieStore = await cookies();
    cookieStore.set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return session;
  } catch (err) {
    console.error("finishPasskeyLogin error:", err);
    throw new Error("Failed to finish passkey login.");
  }
}

// -----------------------------
// Additional helpers for WebAuthn client usage (optional)
// -----------------------------

/**
 * Converts public key options from base64url format to WebAuthn-compatible format
 * Transforms base64url-encoded credential IDs and challenges to ArrayBuffer format
 * 
 * @param publicKeyOptions - The public key options object to convert
 * @returns Converted public key options with ArrayBuffer fields, or original if invalid
 * @throws Error if base64url decoding fails for critical fields
 */
export async function publicKeyOptionsToWebAuthn(publicKeyOptions: any): Promise<any> {
  // Validate input
  if (!publicKeyOptions || typeof publicKeyOptions !== "object") {
    return publicKeyOptions;
  }

  try {
    const clone = JSON.parse(JSON.stringify(publicKeyOptions));

    // Convert challenge from base64url to ArrayBuffer
    if (clone.challenge && typeof clone.challenge === "string") {
      try {
        clone.challenge = (await base64UrlToBuffer(clone.challenge)).buffer;
      } catch (error) {
        console.error("Failed to decode challenge:", error);
        throw new Error(`Invalid challenge encoding: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Convert user.id from base64url to ArrayBuffer
    if (clone.user?.id && typeof clone.user.id === "string") {
      try {
        clone.user.id = (await base64UrlToBuffer(clone.user.id)).buffer;
      } catch (error) {
        console.error("Failed to decode user.id:", error);
        throw new Error(`Invalid user.id encoding: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Convert allowCredentials array
    if (Array.isArray(clone.allowCredentials)) {
      clone.allowCredentials = await Promise.all(clone.allowCredentials.map(async (credential: any) => {
        if (!credential || typeof credential !== "object") {
          return credential;
        }

        const convertedCredential = { ...credential };
        
        if (credential.id && typeof credential.id === "string") {
          try {
            convertedCredential.id = (await base64UrlToBuffer(credential.id)).buffer;
          } catch (error) {
            console.error("Failed to decode credential.id:", error);
            // Keep original id if conversion fails
            console.warn("Keeping original credential.id format");
          }
        }

        return convertedCredential;
      }));
    }

    // rp.id should remain as string (domain identifier)
    // No conversion needed for rp.id as it's a string identifier, not binary data
    if (clone.rp?.id && typeof clone.rp.id !== "string") {
      console.warn("Unexpected rp.id type, expected string");
    }

    return clone;
  } catch (error) {
    console.error("Error converting public key options:", error);
    throw error;
  }
}
/**
 * Convert a browser response (ArrayBuffers) into base64url strings for sending to the server/Appwrite.
 */
export async function webAuthnResponseToAppwritePayload(response: any): Promise<Record<string, string>> {
  // expects clientDataJSON, attestationObject, authenticatorData, signature etc.
  const payload: Record<string, string> = {};

  const convertIfBuffer = async (value: any): Promise<string | null> => {
    if (!value) return null;
    
    // If already a string, return as-is
    if (typeof value === "string") return value;
    
    // If it's an ArrayBuffer or Uint8Array, convert to base64url
    if (value instanceof ArrayBuffer || value instanceof Uint8Array) {
      return await bufferToBase64Url(value);
    }
    
    // If it's a typed array, convert to Uint8Array first
    if (ArrayBuffer.isView(value)) {
      return await bufferToBase64Url(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
    }
    
    return null;
  };

  const clientDataJSON = await convertIfBuffer(response.clientDataJSON);
  if (clientDataJSON) payload.clientDataJSON = clientDataJSON;

  const attestationObject = await convertIfBuffer(response.attestationObject);
  if (attestationObject) payload.attestationObject = attestationObject;

  const authenticatorData = await convertIfBuffer(response.authenticatorData);
  if (authenticatorData) payload.authenticatorData = authenticatorData;

  const signature = await convertIfBuffer(response.signature);
  if (signature) payload.signature = signature;

  return payload;
}