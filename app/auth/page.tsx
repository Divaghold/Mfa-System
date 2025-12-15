"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
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
} from "@simplewebauthn/browser";

// WebAuthn server actions (registration)
import {
  getWebAuthnRegistrationOptions,
  verifyWebAuthnRegistration,
} from "@/app/(auth)/register/actions";

// WebAuthn server actions (login)
import {
  getWebAuthnLoginOptions,
  verifyWebAuthnLogin,
} from "@/app/(auth)/login/actions";

import { toast } from "sonner"; // 👈 NEW

type FormType = "sign-in" | "sign-up";
type SignInMethod = "otp" | "passkey";

const authFormSchema = (formType: FormType) => {
  return z.object({
    email: z.string().email(),
    fullName:
      formType === "sign-up"
        ? z.string().min(2).max(50)
        : z.string().optional(),
  });
};

// 🔐 Registration WebAuthn flow (using accountId from auth.actions)
async function registerPasskeyOnClient(accountId: string, email: string) {
  const options = await getWebAuthnRegistrationOptions({ accountId });
  console.log('WebAuthn Registration Options:', options);

  const attResp = await startRegistration(options);
  console.log('Attestation Response:', attResp);

  const verifyResult = await verifyWebAuthnRegistration({
    accountId,
    credential: attResp,
  });

  if (!verifyResult?.verified) {
    throw new Error("WebAuthn registration verification failed");
  }

  await registerUserPasskey({ email, accountId });

  return true;
}

// 🔐 Login WebAuthn flow (using accountId from auth.actions)
async function loginWithPasskey(accountId: string) {
  const options = await getWebAuthnLoginOptions({ accountId });
  console.log('WebAuthn Login Options:', options);

  const assertion = await startAuthentication(options);
  console.log('Assertion Response:', assertion);

  const verifyResult = await verifyWebAuthnLogin({
    accountId,
    credential: assertion,
  });

  if (!verifyResult?.verified) {
    throw new Error("WebAuthn login verification failed");
  }

  await createPasskeySession(accountId);

  return true;
}

const AuthForm = ({ type: initialType = "sign-in" }: { type?: FormType }): JSX.Element => {
  const [isLoading, setIsLoading] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [panel, setPanel] = useState<FormType>(initialType);
  const [signInMethod, setSignInMethod] = useState<SignInMethod>("otp");

  const router = useRouter();

  const formSchema = authFormSchema(panel) as ReturnType<typeof authFormSchema>;
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema as any),
    defaultValues: {
      fullName: "",
      email: "", 

    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);

    try {
      // === SIGN-IN FLOW ===
      if (panel === "sign-in") {
        const user = await signInUser({ email: values.email });

        if (!user?.accountId) {
          toast.error("Sign-in failed", {
            description: user?.error || "User not found",
          });
          return;
        }

        setAccountId(user.accountId);
        setHasPasskey(user.hasPasskey || false);

        if (signInMethod === "passkey") {
          // user chose passkey
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

            // After sign-in → main page
            router.push("/");
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
          // OTP method
          toast("OTP sent", {
            description: "Check your email to complete sign-in.",
          });
          // UnifiedVerificationModal will handle final verification + redirect
        }
      }

      // === SIGN-UP FLOW ===
      if (panel === "sign-up") {
        const user = await createAccount({
          fullName: values.fullName || "",
          email: values.email,
        });

        if (!user?.accountId) {
          toast.error("Sign-up failed", {
            description: "Failed to create account. Please try again.",
          });
          return;
        }

        setAccountId(user.accountId);

        // Register passkey (biometrics)
        try {
          await registerPasskeyOnClient(user.accountId, values.email);
          setHasPasskey(true);
          toast.success("Passkey registered", {
            description:
              "Your biometrics were registered successfully. Please sign in.",
          });
        } catch (err) {
          console.error("Passkey registration failed:", err);
          toast.error("Biometric enrollment failed", {
            description:
              "Account created, but passkey enrollment failed. You can try again later or use OTP.",
          });
        }

        // After sign-up → go to login
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
      {/* Neon rotating frame */}
      <div className="relative w-[800px] h-[480px] rounded-xl overflow-hidden">
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

        {/* Inner content container */}
        <div className="absolute inset-[3px] bg-gradient-to-r from-[#0F2027] via-[#203A43] to-[#2C5364] rounded-xl flex overflow-hidden">
          {/* SIGN-IN PANEL */}
          <motion.div
            className={`relative w-1/2 h-full ${
              panel === "sign-in"
                ? "translate-y-0 z-20"
                : "translate-y-full opacity-0 z-10"
            }`}
            transition={{ duration: 0.7 }}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="h-full flex flex-col items-center justify-center bg-[#28292d] text-white px-6"
              >
                <h1 className="text-2xl font-bold">Sign In</h1>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="w-4/5 mt-6">
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          className="mt-1 bg-transparent border-white text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />

                {/* Choose OTP vs Passkey */}
                <div className="w-4/5 flex items-center justify-between gap-2 mt-4">
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

                <Link href="/sign-in" className="text-gray-300 text-sm mt-2">
                  Don’t have an account?
                </Link>

                <Button
                  type="submit"
                  className="mt-6 w-4/5 bg-black cursor-pointer"
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
            className={`absolute top-0 left-1/2 w-1/2 h-full ${
              panel === "sign-up"
                ? "translate-x-0 z-20 opacity-100"
                : "-translate-x-full opacity-0 z-10"
            }`}
            transition={{ duration: 0.7 }}
          >
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="h-full flex flex-col items-center justify-center bg-[#28292d] text-white px-6"
              >
                <h1 className="text-2xl font-bold">Sign Up</h1>

                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem className="w-4/5 mt-6">
                      <FormLabel className="text-white">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your full name"
                          className="mt-1 bg-transparent border-white text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem className="w-4/5 mt-4">
                      <FormLabel className="text-white">Email</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your email"
                          className="mt-1 bg-transparent border-white text-white"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className="text-red-400 text-sm" />
                    </FormItem>
                  )}
                />

                <Link href="/sign-in" className="text-gray-300 text-sm mt-2">
                  Already have an account?
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
            className="absolute right-0 w-1/2 h-full bg-gradient-to-r from-[#0F2027] via-[#203A43] to-[#2C5364] text-white flex flex-col items-center justify-center px-8 text-center"
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
                    To keep connecting with us, please login with your
                    personal info. Need quick authentication?
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
                    Try our improved feature: register your biometrics and
                    make sign-in faster. Your security, our priority.
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

      {/* OTP / Unified flow */}
      {accountId && (
        <UnifiedVerificationModal
          email={form.getValues("email") ?? ""}
          accountId={accountId}
          hasPasskey={hasPasskey}
          onSuccess={() => {
            toast.success("Signed in", {
              description: "Welcome back!",
            });
            router.push("/");
          }}
        />
      )}
    </div>
  );
};

export default AuthForm;
