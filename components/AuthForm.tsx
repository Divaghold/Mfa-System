"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import {
  createAccount,
  signInUser,
  registerUserPasskey,
  createPasskeySession,
} from "@/lib/actions/auth.actions";
import UnifiedVerificationModal from "@/components/UnifiedVerificationModal";

import {
  startRegistration,
  startAuthentication,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/browser";

import {
  getWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
} from "@/app/(auth)/register/actions";

import {
  getWebAuthnLoginOptions,
  verifyWebAuthnLogin,
} from "@/app/(auth)/login/actions";

import { toast } from "sonner";

/** Unified server result type (Option A) */
type ServerResult<T = any> =
  | { success: true; data: T }
  | { success: false; error: string };

/** Component-specific types */
type FormType = "sign-in" | "sign-up";
type SignInMethod = "otp" | "passkey";

/** Server-returned shapes (client-side) */
interface CreateAccountData {
  accountId: string;
}
interface SignInUserData {
  accountId: string | null;
  hasPasskey: boolean;
}
interface PasskeyVerifyData {
  verified: boolean;
}
interface RegisterPasskeyData {
  success: boolean;
}
interface CreatePasskeySessionData {
  accountId: string;
}

/** WebAuthn options shape is opaque/serializable from server */
type WebAuthnOptions = Record<string, any>;

/* ----------------------
   Zod schema factory
   ---------------------- */
const authFormSchema = (formType: FormType) =>
  z.object({
    email: z.string().email({ message: "Invalid email address" }),
    fullName:
      formType === "sign-up" ? z.string().min(2).max(50) : z.string().optional(),
  });

/* ----------------------
   WebAuthn client helpers (use unified server shape)
   ---------------------- */
async function registerPasskeyOnClient(
  accountId: string,
  email: string
): Promise<boolean> {
  // Get registration options (server returns ServerResult<Record<string, any>>)
  const optsRes = (await getWebAuthnRegistrationOptions({
    accountId,
  })) as ServerResult<Record<string, any>>;

  if (!optsRes.success) {
    throw new Error(optsRes.error || "Failed to get registration options");
  }
  const options = optsRes.data as WebAuthnOptions;

  // Browser API: start registration
  const attResp = (await startRegistration(options as any)) as RegistrationResponseJSON;

  // Verify on server (returns ServerResult<{ verified: boolean }>)
  const verifyRes = (await verifyWebAuthnRegistration({
    accountId,
    credential: attResp,
  })) as ServerResult<PasskeyVerifyData>;

  if (!verifyRes.success) {
    throw new Error(verifyRes.error || "Registration verification failed");
  }
  if (!verifyRes.data.verified) {
    throw new Error("WebAuthn registration not verified");
  }

  // Mark passkey on server (registerUserPasskey returns ServerResult<{ success: boolean }>)
  const regRes = (await registerUserPasskey({
    email,
    accountId,
  })) as ServerResult<RegisterPasskeyData>;

  if (!regRes.success) {
    throw new Error(regRes.error || "Failed to register passkey server-side");
  }

  if (!regRes.data.success) {
    throw new Error("Server failed to set passkey flag");
  }

  return true;
}

async function loginWithPasskey(accountId: string): Promise<boolean> {
  // Get login options from server
  const optsRes = (await getWebAuthnLoginOptions({ accountId })) as ServerResult<Record<string, any>>;
  if (!optsRes.success) {
    throw new Error(optsRes.error || "Failed to get login options");
  }
  const options = optsRes.data as WebAuthnOptions;

  // Browser API: start authentication
  const assertion = (await startAuthentication(options as any)) as AuthenticationResponseJSON;

  // Verify on server
  const verifyRes = (await verifyWebAuthnLogin({
    accountId,
    credential: assertion,
  })) as ServerResult<PasskeyVerifyData>;

  if (!verifyRes.success) {
    throw new Error(verifyRes.error || "Passkey verification failed on server");
  }
  if (!verifyRes.data.verified) {
    throw new Error("Passkey verification returned false");
  }

  // Create custom passkey session (server sets app-session cookie)
  const sessionRes = (await createPasskeySession(accountId)) as ServerResult<CreatePasskeySessionData>;
  if (!sessionRes.success) {
    throw new Error(sessionRes.error || "Failed to create passkey session");
  }

  // sessionRes.data.accountId exists but we don't require it further here
  return true;
}

/* ----------------------
   Component
   ---------------------- */
const AuthForm = ({ type: initialType = "sign-in" }: { type?: FormType }): JSX.Element => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [hasPasskey, setHasPasskey] = useState<boolean>(false);
  const [panel, setPanel] = useState<FormType>(initialType);
  const [signInMethod, setSignInMethod] = useState<SignInMethod>("otp");

  const router = useRouter();

  const formSchema = authFormSchema(panel);
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: "",
      email: "",
    },
    shouldUnregister: true,
  });

  useEffect(() => {
    // reapply resolver/schema when panel changes, keeping current values
    const values = form.getValues();
    form.reset(values);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panel]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);

    try {
      // SIGN-IN FLOW
      if (panel === "sign-in") {
        const res = (await signInUser({ email: values.email })) as ServerResult<SignInUserData>;

        if (!res.success) {
          toast.error(res.error || "Sign-in failed");
          return;
        }

        const user = res.data;
        // If no accountId, user not found (OTP still may be sent depending on server logic)
        if (!user.accountId) {
          toast.error("Sign-in failed", { description: "User not found" });
          return;
        }

        setAccountId(user.accountId);
        setHasPasskey(Boolean(user.hasPasskey));

        if (signInMethod === "passkey") {
          if (!user.hasPasskey) {
            toast.error("No passkey registered", {
              description:
                "You don't have a passkey for this account yet. Please sign in with OTP or register a passkey during sign-up.",
            });
            return;
          }

          try {
            await loginWithPasskey(user.accountId);
            toast.success("Signed in", {
              description: "Signed in with passkey successfully ✅",
            });
            router.push("/docs");
            return;
          } catch (err) {
            console.warn("Passkey sign-in failed:", err);
            toast.error("Passkey sign-in failed", {
              description:
                "We couldn't sign you in with your passkey. Try again or use OTP instead.",
            });
            return;
          }
        } else {
          // OTP method: server already sent magic/OTP token; UnifiedVerificationModal will complete verification
          toast("OTP sent", {
            description: "Check your email to complete sign-in.",
          });
        }
      }

      // SIGN-UP FLOW
      if (panel === "sign-up") {
        const createRes = (await createAccount({
          fullName: (values.fullName as string) || "",
          email: values.email,
        })) as ServerResult<CreateAccountData>;

        if (!createRes.success) {
          toast.error(createRes.error || "Sign-up failed");
          return;
        }

        setAccountId(createRes.data.accountId);

        // Optionally register passkey right after account creation
        try {
          await registerPasskeyOnClient(createRes.data.accountId, values.email);
          setHasPasskey(true);
          toast.success("Passkey registered", {
            description: "Your biometrics were registered successfully. Please sign in.",
          });
        } catch (err) {
          console.error("Passkey registration failed:", err);
          toast.error("Biometric enrollment failed", {
            description:
              "Account created, but passkey enrollment failed. You can try again later or use OTP.",
          });
        }

        router.push("/sign-in");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error", {
        description: "Failed to process your request. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-black via-gray-500 to-gray-900 animate-[gradient_20s_ease_infinite] bg-size-[200%_200%]">
      {/* Neon Frame (Desktop/iPad vs Mobile) */}
      <div
        className="
        relative 
        rounded-xl 
        overflow-hidden

        /* Desktop / iPad original size */
        w-[800px] h-[480px]

        /* Tablets */
        md:w-[800px] md:h-[480px]

        /* Mobile layout from HTML demo */
        max-md:w-[400px] max-md:h-[500px]
        max-sm:w-[305px] max-sm:h-[460px]
      "
      >
        {/* Neon bar layer 1 */}
        <motion.div
          className="absolute inset-0"
          style={{
            mixBlendMode: "screen",
            background:
              "linear-gradient(0deg, transparent, #45f3ff, transparent, #45f3ff)",
          }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
        />

        {/* Neon bar layer 2 */}
        <motion.div
          className="absolute inset-0"
          style={{
            mixBlendMode: "screen",
            background:
              "linear-gradient(15deg, transparent, #FF7474, transparent, #FF7474)",
          }}
          animate={{ rotate: 360 }}
          transition={{
            repeat: Infinity,
            duration: 6,
            ease: "linear",
            delay: -3,
          }}
        />

        {/* Inner Content Container */}
        <div className="absolute inset-[3px] bg-gradient-to-r from-[#0F2027] via-[#203A43] to-[#2C5364] rounded-xl flex overflow-hidden">
          {/* SIGN-IN PANEL */}
          <motion.div
            className={`
    relative bg-[#28292d] text-white flex flex-col items-center justify-center px-6

    md:w-1/2 md:h-full

    max-md:w-full max-md:h-full max-md:static
    ${
      panel === "sign-in"
        ? "max-md:block max-md:z-20 max-md:opacity-100"
        : "max-md:hidden max-md:opacity-0"
    }

    ${
      panel === "sign-in"
        ? "translate-y-0 z-20"
        : "translate-y-full opacity-0 z-10 md:block"
    }
  `}
            transition={{ duration: 0.7 }}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="h-full flex flex-col items-center justify-center bg-[#28292d] text-white max-md:px-4 px-6"
              >
                <img
                  src="/images/hexagon.svg"
                  width={50}
                  className="md:hidden"
                  height={55}
                  alt="logo"
                />
                <h1 className="text-2xl font-bold max-md:mt-2">Sign In</h1>

                <FormField
                  control={form.control as any}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="w-4/5 md:w-[265px] max-sm:w-[205px] mt-6">
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          className="
                          mt-1 bg-transparent border-white text-white
        
                        "
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />

                {/* OTP / Passkey buttons */}
                <div className="w-4/5 md:w-[265px] max-sm:w-[195px] flex items-center justify-between gap-1 mt-4">
                  <Button
                    type="button"
                    variant={signInMethod === "otp" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSignInMethod("otp")}
                  >
                    Use OTP
                  </Button>
                  <Button
                    type="button"
                    variant={signInMethod === "passkey" ? "default" : "outline"}
                    className="flex-1"
                    onClick={() => setSignInMethod("passkey")}
                  >
                    Use Passkey
                  </Button>
                </div>

                <Link
                  href="/sign-up"
                  className="text-gray-300 text-sm mt-2 max-md:mt-3"
                >
                  Don’t have an account?{" "}
                  <span className="max-sm:mt-2 max-sm:cursor-pointer max-sm:text-[#45f3ff]">
                    sign up
                  </span>
                </Link>

                <Button
                  type="submit"
                  className="
                  mt-6 w-4/5 max-sm:w-[205px] md:w-[265px] bg-black cursor-pointer
                "
                  disabled={isLoading}
                >
                  Sign In
                  {isLoading && (
                    <Image
                      src="/assets/icons/loader.svg"
                      alt="loader"
                      width={24}
                      height={24}
                      className="ml-2 animate-spin"
                    />
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>

          {/* SIGN-UP PANEL */}
          <motion.div
            className={`
    absolute top-0 left-1/2 bg-[#28292d]

    md:w-1/2 md:h-full

    max-md:w-full max-md:h-full max-md:static
    ${
      panel === "sign-up"
        ? "max-md:block max-md:z-20 max-md:opacity-100"
        : "max-md:hidden max-md:opacity-0"
    }

    ${
      panel === "sign-up"
        ? "translate-x-0 z-20 opacity-100"
        : "-translate-x-full opacity-0 z-10 md:block"
    }
  `}
            transition={{ duration: 0.7 }}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="h-full flex flex-col items-center justify-center bg-[#28292d] text-white px-6"
              >
                <img
                  src="/images/hexagon.svg"
                  width={50}
                  className="md:hidden"
                  height={55}
                  alt="logo"
                />
                <h1 className="text-2xl font-bold">Sign Up</h1>

                <FormField
                  control={form.control as any}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="w-4/5 mt-6">
                      <FormLabel className="text-white">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your full name"
                          className="mt-1 bg-transparent border-white text-white  max-md:w-[95%]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control as any}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="w-4/5 mt-4">
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          className="mt-1 bg-transparent border-white text-white  max-md:w-[95%]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />

                <Link href="/sign-in" className="text-gray-300 text-sm mt-2">
                  Already have an account?{" "}
                  <span className="max-sm:mt-2 max-sm:cursor-pointer max-sm:text-[#45f3ff]">
                    sign in
                  </span>
                </Link>
                <Button
                  type="submit"
                  className="mt-6 w-4/5 bg-black cursor-pointer"
                  disabled={isLoading}
                >
                  Sign Up
                  {isLoading && (
                    <Image
                      src="/assets/icons/loader.svg"
                      alt="loader"
                      width={24}
                      height={24}
                      className="ml-2 animate-spin"
                    />
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>

          {/* OVERLAY PANEL */}
          <motion.div
            className="
            hidden md:flex
            absolute right-0 w-1/2 h-full
            bg-gradient-to-r from-[#0F2027] via-[#203A43] to-[#2C5364]
            text-white flex-col items-center justify-center px-8 text-center
          "
            animate={{ x: panel === "sign-in" ? "0%" : "-100%" }}
            transition={{ duration: 0.7, ease: "easeInOut" }}
          >
            {panel === "sign-in" ? (
              <>
                <div>
                  <img
                    src="/images/hexagon.svg"
                    width={160}
                    height={55}
                    alt="logo"
                  />
                  <h1 className="text-3xl font-bold">Hello, Friend!</h1>
                  <p className="mt-4">
                    login to connect with us, need quick authentication? Use Passkeys for a faster
                    sign-in experience.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-6 text-white border-[#45f3ff] bg-transparent"
                  onClick={() => setPanel("sign-up")}
                >
                  Sign Up
                </Button>
              </>
            ) : (
              <>

                <div>
                  <img
                    src="/images/hexagon.svg"
                    width={160}
                    height={55}
                    alt="logo"
                  />
                  <h1 className="text-3xl font-bold">Welcome Back!</h1>
                  <p className="mt-4">
                   Try our improved feature: register your biometrics and make
                    sign-up faster. Your security, our priority.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="mt-6 text-white border-[#45f3ff] bg-transparent"
                  onClick={() => setPanel("sign-in")}
                >
                  Sign In
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </div>

      {/* OTP modal unchanged */}
      {accountId && (
        <UnifiedVerificationModal
          email={form.getValues("email") ?? ""}
          accountId={accountId}
          hasPasskey={hasPasskey}
          onSuccess={() => {
            toast.success("Signed in", { description: "Welcome back!" });
            router.push("/docs");
          }}
        />
      )}
    </div>
  );
};

export default AuthForm;
