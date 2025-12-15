"use client";
import { useState } from "react";

export default function FaceIDScanner({
  onScan,
}: {
  onScan: () => Promise<void>;
}) {
  const [state, setState] = useState<"idle" | "scanning" | "success" | "error">(
    "idle"
  );

  const handleScan = async () => {
    setState("scanning");
    try {
      await onScan();
      setState("success");
    } catch (err) {
      setState("error");
      setTimeout(() => setState("idle"), 1500);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        onClick={handleScan}
        className={`relative w-32 h-32 rounded-2xl border-4 flex items-center justify-center cursor-pointer transition-all
          ${state === "idle" ? "border-gray-300" : ""}
          ${state === "scanning" ? "border-blue-500 animate-pulse" : ""}
          ${state === "success" ? "border-green-500" : ""}
          ${state === "error" ? "border-red-500" : ""}
        `}
      >
        <img src="/faceid.svg" alt="Face ID" className="w-20" />
        {state === "scanning" && (
          <div className="absolute inset-0 rounded-2xl bg-blue-200/20 animate-[ping_1.5s_ease-out_infinite]"></div>
        )}
      </div>

      {state === "scanning" && <p className="text-blue-600">Scanning...</p>}
      {state === "success" && <p className="text-green-600">Authenticated!</p>}
      {state === "error" && <p className="text-red-600">Failed. Try again.</p>}
    </div>
  );
}
