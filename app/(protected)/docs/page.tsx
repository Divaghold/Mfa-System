"use client"

import {signOutUser, getCurrentUser} from "@/lib/actions/auth.actions";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";


interface Props {
  fullName: string;
  avatar: string;
  email: string;
}

const DocsPage = ({ fullName, avatar, email }: Props) => {
  const pathname = usePathname();


  return (
    <main className="min-h-screen bg-[#0b0f14] text-white max-w-5xl mx-auto px-6 py-10">
      {/* ================= HEADER ================= */}
      <header className="flex items-center justify-between mb-10">
          <div className="sidebar-user-info">
        <Image
          src={avatar ?? "/images/avatar.png"}
          alt="Avatar"
          width={44}
          height={44}
          className="sidebar-user-avatar"
        />
        <div className="hidden lg:block">
          <p className="subtitle-2 capitalize">{fullName}</p>
          <p className="caption">{email}</p>
        </div>
      </div>

        {/* Sign out must be a form (server action) */}
          <form action={async () => { await signOutUser(); }}>
          <Button type="submit" className="sign-out-button">
            <Image
              src="/assets/icons/logout.svg"
              alt="logout"
              width={24}
              height={24}
            />
          </Button>
        </form>
      </header>

      {/* ================= CONTENT ================= */}
      <h1 className="text-3xl font-bold mb-2">
        📘 Welcome to This Project Internal Codebase Documentation
      </h1>

      <p className="text-gray-400 mb-8">
        This guide explains how this project works in the simplest possible way.

       You do NOT need to be a programmer. You do NOT need to understand code.

       Think of this as a tour guide for a building 🏢.This page explains the architecture, authentication flow, and design
        decisions of the application.
      </p>

      {/* AUTH OVERVIEW */}
      <section className="mb-10">
        <h2 className="text-xl font-semibold mb-2">Authentication Overview</h2>
        <p className="text-gray-300">
          This application uses a hybrid authentication system built on Appwrite
          and WebAuthn (Passkeys).
        </p>
      </section>
    </main>
  );
}

export default DocsPage;