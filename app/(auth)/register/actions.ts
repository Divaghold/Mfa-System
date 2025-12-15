"use server";

import { createAdminClient } from "@/lib/appwrite/index";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";
import { parseStringify } from "@/lib/utils";

import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";

const rpID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const rpName = process.env.WEBAUTHN_RP_NAME ?? "My Localhost Machine";
const expectedOrigin =
  process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";

/** Unified response type */
export type ServerResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

async function getAdminDatabases() {
  const { databases } = await createAdminClient();
  return databases;
}

async function getUserByAccountId(accountId: string) {
  const databases = await getAdminDatabases();

  const res = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("accountId", [accountId])]
  );

  if (res.documents.length === 0) return null;
  return res.documents[0];
}

// Convert Uint8Array → base64url string for DB storage
const toBase64Url = (input: Uint8Array | string | undefined): string => {
  if (!input) return "";
  if (typeof input === "string") return input;
  return Buffer.from(input).toString("base64url");
};

/**
 * Get WebAuthn registration options and store challenge
 */
export const getWebAuthnRegistrationOptions = async ({
  accountId,
}: {
  accountId: string;
}): Promise<ServerResult<Record<string, any>>> => {
  try {
    const databases = await getAdminDatabases();
    const user = await getUserByAccountId(accountId);

    if (!user) {
      return { success: false, error: "User not found for WebAuthn registration" };
    }

    const options = await generateRegistrationOptions({
      rpID,
      rpName,
      userName: user.email,
      userDisplayName: user.fullName || user.email,
      timeout: 60000,
      attestationType: "none",
    });

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      user.$id,
      {
        currentChallenge: options.challenge,
      }
    );

    return { success: true, data: parseStringify(options) as Record<string, any> };
  } catch (error) {
    console.error("Failed to get WebAuthn registration options", error);
    return {
      success: false,
      error: (error instanceof Error && error.message) || "Failed to get WebAuthn registration options",
    };
  }
};

/**
 * Verify WebAuthn registration response and store credential
 */
export const verifyWebAuthnRegistration = async ({

  accountId,
  credential,
}: {
  accountId: string;
  credential: any;
}): Promise<ServerResult<{ verified: boolean }>> => {
  try {
    const databases = await getAdminDatabases();
    const user = await getUserByAccountId(accountId);

    if (!user) {
      return { success: false, error: "User not found for WebAuthn verification" };
    }

    if (!user.currentChallenge) {
      return { success: false, error: "No registration challenge found for user" };
    }

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge: user.currentChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified) {
      return { success: false, error: "WebAuthn registration verification failed" };
    }

    const reg = verification.registrationInfo?.credential;
    if (!reg) {
      return { success: false, error: "No credential info returned from verification" };
    }

    const credentialID = toBase64Url(reg.id);
    const credentialPublicKey = toBase64Url(reg.publicKey);
    const counter = reg.counter ?? 0;

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      user.$id,
      {
        credentialID,
        credentialPublicKey,
        counter,
        currentChallenge: null,
        hasPasskey: true,
        authMethod: "passkey",
        passKeyCount: (user.passKeyCount ?? 0) + 1,
      }
    );

    return { success: true, data: { verified: true } };
  } catch (error) {
    console.error("Failed to verify WebAuthn registration", error);
    return {
      success: false,
      error: (error instanceof Error && error.message) || "Failed to verify WebAuthn registration",
    };
  }
};
