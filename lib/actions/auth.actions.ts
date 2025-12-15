"use server";

import { createAdminClient, createSessionClient, getCustomPasskeySessionAccountId } from "@/lib/appwrite/index";
import { appwriteConfig } from "@/lib/appwrite/config";
import { Query, ID } from "node-appwrite";
import { parseStringify } from "@/lib/utils";
import { cookies } from "next/headers";
import { avatarPlaceholderUrl } from "../../constants";
import { redirect } from "next/navigation";

/** Unified server result */
export type ServerResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

const getUserByEmail = async (email: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("email", [email])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const getUserByAccountId = async (accountId: string) => {
  const { databases } = await createAdminClient();

  const result = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.usersCollectionId,
    [Query.equal("accountId", [accountId])]
  );

  return result.total > 0 ? result.documents[0] : null;
};

const handleError = (error: unknown, message: string) => {
  console.error(message, error);
  throw error instanceof Error ? error : new Error(message);
};

/**
 * Send email OTP for verification
 */
export const sendEmailOTP = async ({ email }: { email: string }): Promise<ServerResult<{ accountId: string }>> => {
  try {
    const { account } = await createAdminClient();
    const session = await account.createEmailToken(ID.unique(), email);
    return { success: true, data: { accountId: session.userId } };
  } catch (error) {
    console.error("Failed to send email OTP", error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to send email OTP" };
  }
};

/**
 * Create new account (Sign Up)
 */
export const createAccount = async ({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}): Promise<ServerResult<{ accountId: string }>> => {
  try {
    const existingUser = await getUserByEmail(email);
    const sendRes = await sendEmailOTP({ email });

    if (!sendRes.success) {
      return { success: false, error: sendRes.error || "Failed to send OTP" };
    }

    const accountId = sendRes.data.accountId;
    if (!existingUser) {
      const { databases } = await createAdminClient();

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        ID.unique(),
        {
          fullName,
          email,
          accountId,
          userId: accountId,
          avatar: avatarPlaceholderUrl,
          authMethod: "otp",
          hasPasskey: false,
          passKeyCount: 0,
        }
      );
    }

    return { success: true, data: { accountId } };
  } catch (error) {
    console.error("Failed to create account", error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to create account" };
  }
};

/**
 * Sign in user (Sign In)
 */
export const signInUser = async ({ email }: { email: string }): Promise<ServerResult<{ accountId: string | null; hasPasskey: boolean }>> => {
  try {
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      const sendRes = await sendEmailOTP({ email });
      if (!sendRes.success) {
        return { success: false, error: sendRes.error || "Failed to send OTP" };
      }

      return {
        success: true,
        data: {
          accountId: existingUser.accountId,
          hasPasskey: existingUser.hasPasskey || false,
        },
      };
    }

    return { success: true, data: { accountId: null, hasPasskey: false } };
  } catch (error) {
    console.error("Failed to sign in user", error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to sign in user" };
  }
};

/**
 * Verify OTP and create Appwrite session (uses Appwrite sessions — valid only for OTP/email)
 */
export const verifySecret = async ({
  accountId,
  password,
}: {
  accountId: string;
  password: string;
}): Promise<ServerResult<{ sessionId: string }>> => {
  try {
    const { account } = await createAdminClient();

    // This is an Appwrite session creation that expects a valid secret (OTP token or password)
    const session = await account.createSession(accountId, password);

    (await cookies()).set("appwrite-session", session.secret, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return { success: true, data: { sessionId: session.$id } };
  } catch (error) {
    console.error("Failed to verify OTP", error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to verify OTP" };
  }
};

/**
 * Create custom passkey session — sets a cookie 'app-session' with the accountId.
 * This does NOT call Appwrite's createSession and is intended for passkey-authenticated users.
 */
export const createPasskeySession = async (accountId: string): Promise<ServerResult<{ accountId: string }>> => {
  try {
    (await cookies()).set("app-session", accountId, {
      path: "/",
      httpOnly: true,
      sameSite: "strict",
      secure: true,
    });

    return { success: true, data: { accountId } };
  } catch (error) {
    console.error("Failed to create passkey session", error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to create passkey session" };
  }
};

/**
 * Get current user - checks custom passkey cookie first, otherwise Appwrite session cookie.
 */
export const getCurrentUser = async (): Promise<ServerResult<any | null>> => {
  try {
    // 1) Check custom passkey session
    const customAccountId = await getCustomPasskeySessionAccountId();
    if (customAccountId) {
      const user = await getUserByAccountId(customAccountId);
      if (!user) return { success: true, data: null };
      return { success: true, data: parseStringify(user) };
    }

    // 2) Fall back to Appwrite session
    try {
      const { databases, account } = await createSessionClient();
      const result = await account.get();
      const user = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.usersCollectionId,
        [Query.equal("accountId", result.$id)]
      );
      if (user.total <= 0) return { success: true, data: null };
      return { success: true, data: parseStringify(user.documents[0]) };
    } catch (e) {
      // no appwrite session
      return { success: true, data: null };
    }
  } catch (error) {
    console.error(error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to get current user" };
  }
};

/**
 * Sign out user - delete both cookies. If Appwrite session exists, delete it server-side.
 */
export const signOutUser = async (): Promise<ServerResult<null>> => {
  try {
    // Try to delete Appwrite session if present
    try {
      const { account } = await createSessionClient();
      await account.deleteSession("current");
    } catch {
      // no-op if no appwrite session
    }

    const c = await cookies();
    c.delete("appwrite-session");
    c.delete("app-session");

    return { success: true, data: null };
  } catch (error) {
    console.error("Failed to sign out user", error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to sign out user" };
  } finally {
    redirect("/auth");
  }
};

/**
 * Register passkey for user
 */
export const registerUserPasskey = async ({
  email,
  accountId,
}: {
  email: string;
  accountId: string;
}): Promise<ServerResult<{ success: boolean }>> => {
  try {
    const { databases } = await createAdminClient();

    const user = await getUserByEmail(email);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.usersCollectionId,
      user.$id,
      {
        hasPasskey: true,
        authMethod: "passkey",
      }
    );

    return { success: true, data: { success: true } };
  } catch (error) {
    console.error("Failed to register passkey", error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to register passkey" };
  }
};

export const getUserForPasskeyLogin = async ({
  accountId,
}: {
  accountId: string;
}): Promise<ServerResult<any>> => {
  try {
    const user = await getUserByAccountId(accountId);

    if (!user) {
      return { success: false, error: "User not found" };
    }

    return { success: true, data: parseStringify(user) };
  } catch (error) {
    console.error("Failed to get user", error);
    return { success: false, error: (error instanceof Error && error.message) || "Failed to get user" };
  }
};
