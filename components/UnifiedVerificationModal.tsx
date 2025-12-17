"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  verifySecret,
  sendEmailOTP,
  createPasskeySession,
} from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";
import { beginPasskeyLogin, finishPasskeyLogin } from "@/lib/appwrite/passkey";
import { toast } from "sonner"; // 👈 NEW

type VerificationMethod = "otp" | "passkey";

interface UnifiedVerificationModalProps {
  accountId: string;
  email: string;
  hasPasskey?: boolean;
  onSuccess?: () => void; // 👈 NEW
}

const UnifiedVerificationModal = ({
  accountId,
  email,
  hasPasskey = false,
  onSuccess,
}: UnifiedVerificationModalProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [method, setMethod] = useState<VerificationMethod>("otp");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Handle OTP verification
   */
  const handleOtpSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      if (!otp || otp.length !== 6) {
        const msg = "Please enter a valid 6-digit OTP";
        setError(msg);
        toast.error("Invalid OTP", { description: msg });
        setIsLoading(false);
        return;
      }

      const sessionId = await verifySecret({ accountId, password: otp });

      if (sessionId) {
        toast.success("OTP verified", {
          description: "You are now signed in.",
        });

        setIsOpen(false);

        // If parent passed a callback, let it handle redirect/toast
        if (onSuccess) {
          onSuccess();
        } else {
          // fallback: go to main page
          router.push("/docs");
        }
      } else {
        const msg = "Invalid OTP. Please try again.";
        setError(msg);
        toast.error("Invalid OTP", { description: msg });
      }
    } catch (error) {
      console.log("Failed to verify OTP", error);
      const msg = "Invalid OTP. Please try again.";
      setError(msg);
      toast.error("OTP verification failed", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Passkey verification
   */
  const handlePasskeyLogin = async () => {
    setIsLoading(true);
    setError("");

    try {
      // Step 1: Get challenge from server
      const start = await beginPasskeyLogin();
      const publicKey = start.publicKey;

      // Step 2: Browser WebAuthn - get credential
      const credential = (await navigator.credentials.get({
        publicKey,
      })) as PublicKeyCredential | null;

      if (!credential) {
        const msg = "Passkey authentication cancelled or not available";
        setError(msg);
        toast.error("Passkey cancelled", { description: msg });
        setIsLoading(false);
        return;
      }

      const assertionResponse =
        credential.response as AuthenticatorAssertionResponse;

      // Step 3: Send back to Appwrite
      await finishPasskeyLogin({
        passkeyId: credential.id,
        clientDataJSON: btoa(
          String.fromCharCode(
            ...Array.from(new Uint8Array(assertionResponse.clientDataJSON))
          )
        ),
        authenticatorData: btoa(
          String.fromCharCode(
            ...Array.from(new Uint8Array(assertionResponse.authenticatorData))
          )
        ),
        signature: btoa(
          String.fromCharCode(
            ...Array.from(new Uint8Array(assertionResponse.signature))
          )
        ),
      });

      // Step 4: Create session
      await createPasskeySession(accountId);

      toast.success("Passkey authenticated", {
        description: "You are now signed in.",
      });

      setIsOpen(false);

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/docs");
      }
    } catch (err) {
      console.error(err);
      const msg = "Passkey authentication failed. Please try again.";
      setError(msg);
      toast.error("Passkey authentication failed", { description: msg });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle resend OTP
   */
  const handleResendOtp = async () => {
    try {
      await sendEmailOTP({ email });
      setError("");
      toast.success("OTP resent", {
        description: `A new code has been sent to ${email}`,
      });
    } catch (error) {
      const msg = "Failed to resend OTP";
      setError(msg);
      toast.error("Resend failed", { description: msg });
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogContent className="shad-alert-dialog z-50">
        <AlertDialogHeader className="relative flex justify-center">
          <div className="flex items-center justify-between w-full">
            <AlertDialogTitle className="h2 text-center text-gray-400 flex-1">
              Verify Your Identity
            </AlertDialogTitle>
            <Image
              src="/assets/icons/close-dark.svg"
              alt="close"
              width={20}
              height={20}
              onClick={() => setIsOpen(false)}
              className="otp-close-button cursor-pointer"
            />
          </div>
          <AlertDialogDescription className="subtitle-2 text-center text-light-100">
            Choose your preferred verification method
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Verification Method Tabs */}
        {/* <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setMethod("otp");
              setError("");
              setOtp("");
            }}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
              method === "otp"
                ? "bg-brand text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            📧 Email OTP
          </button>

          {hasPasskey && (
            <button
              onClick={() => {
                setMethod("passkey");
                setError("");
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                method === "passkey"
                  ? "bg-brand text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              👆 Passkey
            </button>
          )}
        </div> */}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red border border-red-400 text-red rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* OTP Method */}
        {method === "otp" && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We&apos;ve sent a 6-digit code to{" "}
                <span className="font-semibold text-[#45f3ff]">{email}</span>
              </p>

              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup className="shad-otp">
                  <InputOTPSlot index={0} className="shad-otp-slot" />
                  <InputOTPSlot index={1} className="shad-otp-slot" />
                  <InputOTPSlot index={2} className="shad-otp-slot" />
                  <InputOTPSlot index={3} className="shad-otp-slot" />
                  <InputOTPSlot index={4} className="shad-otp-slot" />
                  <InputOTPSlot index={5} className="shad-otp-slot" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <AlertDialogFooter>
              <div className="flex w-full flex-col gap-4">
                <AlertDialogAction
                  onClick={handleOtpSubmit}
                  className="shad-submit-btn h-12"
                  type="button"
                  disabled={isLoading || otp.length !== 6}
                >
                  Verify OTP
                  {isLoading && (
                    <Image
                      src="/assets/icons/loader.svg"
                      alt="loader"
                      width={24}
                      height={24}
                      className="ml-2 animate-spin"
                    />
                  )}
                </AlertDialogAction>

                <div className="subtitle-2 mt-2 text-center text-light-100">
                  Didn&apos;t get a code?
                  <Button
                    type="button"
                    variant="link"
                    className="pl-1 text-[#45f3ff]"
                    onClick={handleResendOtp}
                    disabled={isLoading}
                  >
                    Click to resend
                  </Button>
                </div>
              </div>
            </AlertDialogFooter>
          </>
        )}

        {/* Passkey Method */}
        {method === "passkey" && (
          <>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Use your registered passkey (fingerprint, face, or security
                key) to verify your identity.
              </p>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Passkey verification is faster and more secure than OTP.
                </p>
              </div>
            </div>

            <AlertDialogFooter>
              <div className="flex w-full flex-col gap-4">
                <AlertDialogAction
                  onClick={handlePasskeyLogin}
                  className="shad-submit-btn h-12"
                  type="button"
                  disabled={isLoading}
                >
                  Authenticate with Passkey
                  {isLoading && (
                    <Image
                      src="/assets/icons/loader.svg"
                      alt="loader"
                      width={24}
                      height={24}
                      className="ml-2 animate-spin"
                    />
                  )}
                </AlertDialogAction>

                <p className="text-xs text-center text-gray-500">
                  Make sure your device is unlocked and ready for biometric
                  authentication.
                </p>
              </div>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnifiedVerificationModal;
