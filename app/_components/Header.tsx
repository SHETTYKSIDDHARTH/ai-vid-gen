"use client"
import React from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

function Header() {
  const { user } = useUser();
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/70 backdrop-blur-md border-b border-border">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10 border border-primary/30">
          <Sparkles className="size-4.5 text-primary" />
        </div>
        <span className="text-lg font-bold font-heading tracking-tight">AI Video Course</span>
      </Link>

      <div className="flex items-center gap-3">
        {user ? (
          <UserButton />
        ) : (
          <SignInButton mode="modal">
            <Button className="rounded-full px-5">Get Started</Button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
export default Header;