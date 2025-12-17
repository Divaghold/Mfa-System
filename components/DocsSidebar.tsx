"use client";

import { Folder } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOutUser } from "@/lib/actions/auth.actions";
import { DOCS_STRUCTURE } from "@/lib/doc-structure";
import { Button } from "@/components/ui/button";


export default function DocsSidebar() {
  const pathname = usePathname();


  return (
    <aside className="sidebar">
      {/* NAV */}
      <nav className="sidebar-nav">
        <h2 className="text-sm font-semibold text-[#45f3ff] mb-4">
          Codebase Structure
        </h2>

        {Object.keys(DOCS_STRUCTURE).map((folder) => {
          const active = pathname === `/docs/${folder}`;

          return (
            <Link
              key={folder}
              href={`/docs/${folder}`}
              className={`flex items-center gap-4 transition ${
                active ? "text-white" : "text-gray-300 hover:text-white"
              }`}
            >
              <Folder size={14} />
              {folder}/
            </Link>
          );
        })}
      </nav>

      {/* USER INFO */}
       {/* Sign out must be a form (server action) */}
          <form action={async () => { await signOutUser(); }}>
          <Button type="submit" className="sign-out-button">
            <Image
              src="/assets/icons/logout.svg"
              alt="logout"
              width={24}
              height={24}
            />
          </Button>Logout
        </form>
    </aside>
  );
}
