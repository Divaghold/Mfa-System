"use server";

import { createAdminClient } from "@/lib/appwrite/index";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query } from "node-appwrite";
import { parseStringify } from "@/lib/utils";

import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";

const rpID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const expectedOrigin =
  process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";

/** Unified response type (reuse) */
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

// base64url string → Uint8Array
const fromBase64Url = (str: string): Uint8Array => {
  return new Uint8Array(Buffer.from(str, "base64url"));
};

/**
 * Get WebAuthn login options for a given accountId
 */
export const getWebAuthnLoginOptions = async ({
  accountId,
}: {
  accountId: string;
}): Promise<ServerResult<Record<string, any>>> => {
  try {
    const databases = await getAdminDatabases();
    const user = await getUserByAccountId(accountId);

    if (!user) {
      return { success: false, error: "User not found for WebAuthn login" };
    }

    if (!user.credentialID || !user.credentialPublicKey) {
      return { success: false, error: "User does not have a registered WebAuthn credential" };
    }

    const options = await generateAuthenticationOptions({
      rpID,
      timeout: 60000,
      userVerification: "preferred",
      // allowCredentials expects objects with id as BufferSource on the browser; we stringify/send id as base64url.
      allowCredentials: [
        {
          id: user.credentialID as string,
        },
      ],
    });

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      user.$id,
      {
        currentAuthChallenge: options.challenge,
      }
    );

    return { success: true, data: parseStringify(options) as Record<string, any> };
  } catch (error) {
    console.error("Failed to get WebAuthn login options", error);
    return {
      success: false,
      error: (error instanceof Error && error.message) || "Failed to get WebAuthn login options",
    };
  }
};

export const verifyWebAuthnLogin = async ({
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
      return { success: false, error: "User not found for WebAuthn login verification" };
    }

    if (!user.currentAuthChallenge) {
      return { success: false, error: "No auth challenge stored for user" };
    }

    if (!user.credentialID || !user.credentialPublicKey) {
      return { success: false, error: "No stored WebAuthn credential for user" };
    }

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: user.currentAuthChallenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: user.credentialID as string,
        publicKey: Buffer.from(user.credentialPublicKey as string, "base64url") as any,
        counter: (user.counter as number) ?? 0,
      },
    });

    if (!verification.verified) {
      return { success: true, data: { verified: false } };
    }

    const newCounter =
      verification.authenticationInfo?.newCounter ?? ((user.counter as number) ?? 0);

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      user.$id,
      {
        counter: newCounter,
        currentAuthChallenge: null,
      }
    );

    return { success: true, data: { verified: true } };
  } catch (error) {
    console.error("Failed to verify WebAuthn login", error);
    return {
      success: false,
      error: (error instanceof Error && error.message) || "Failed to verify WebAuthn login",
    };
  }
};
