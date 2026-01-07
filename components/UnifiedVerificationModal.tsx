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
import { toast } from "sonner";

type VerificationMethod = "otp" | "passkey";

interface UnifiedVerificationModalProps {
  accountId: string;
  email: string;
  hasPasskey?: boolean;
  onSuccess?: () => void;
}

const UnifiedVerificationModal = ({
  accountId,
  email,
  hasPasskey = false,
  onSuccess,
}: UnifiedVerificationModalProps) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [method] = useState<VerificationMethod>("otp");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  /**
   * Handle OTP verification
   */ const handleOtpSubmit = async (
    e: React.MouseEvent<HTMLButtonElement>
  ) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // ✅ Validate input length
      if (otp.length !== 6) {
        const msg = "Please enter the 6-digit code sent to your email.";
        setError(msg);
        toast.error("Invalid input", { description: msg });
        return;
      }

      // ✅ Call server action to verify OTP
      const result = await verifySecret({ accountId, password: otp });

      // ❌ OTP invalid
      if (!result.success) {
        const msg =
          result.message === "Invalid token passed in the request."
            ? "Invalid OTP. Please enter the correct code sent to your email."
            : result.message;

        setError(msg);
        toast.error("OTP verification failed", { description: msg });
        return;
      }

      // ✅ OTP valid → show success and navigate
      toast.success("OTP verified", {
        description: "You are now signed in.",
      });

      // Redirect or call parent success handler
      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/docs");
      }
    } catch (err: any) {
      const msg =
        err?.response?.message ||
        err?.message ||
        "Failed to verify OTP. Please try again.";
      setError(msg);
      toast.error("OTP verification failed", { description: msg });
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
      setOtp(""); // ✅ reset input
      setError("");

      toast.success("OTP resent", {
        description: `A new code has been sent to ${email}`,
      });
    } catch (error) {
      const msg = "Failed to resend OTP. Please try again.";
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
          <AlertDialogDescription className="subtitle-2 text-center">
            Enter the verification code sent to your email
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* ❌ Error message */}
        {error && (
          <div className="rounded-lg border border-red-400 bg-transparent p-3 text-sm text-error">
            {error}
          </div>
        )}

        {/* OTP Section */}
        <div className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            We&apos;ve sent a 6-digit code to{" "}
            <span className="font-semibold text-[#45f3ff]">{email}</span>
          </p>

          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => {
              // ✅ digits only
              if (/^\d*$/.test(value)) {
                setOtp(value);
                setError("");
              }
            }}
          >
            <InputOTPGroup className="shad-otp">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <InputOTPSlot key={i} index={i} className="shad-otp-slot" />
              ))}
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

            <div className="subtitle-2 text-center">
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
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnifiedVerificationModal;
