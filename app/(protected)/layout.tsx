import React from "react";
import DocsSidebar from "@/components/DocsSidebar";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {

return <>  
   <div className="flex min-h-screen bg-[#0b0f14] text-white">
      <DocsSidebar />
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  
  </>;
}
