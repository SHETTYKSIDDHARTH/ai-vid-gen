"use client"
import React from "react";
import Image from 'next/image'
import { SignIn, useUser } from "@clerk/nextjs";
import { SignInButton } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
function Header() {
    const {user}=useUser()
  return (
<div className="flex items-center justify-between p-4 bg-gray-100">
    <div className="flex items-center space-x-2">
       <Image src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSg6SVXir0tZKDjZN-IIW8jT6ifCEc1nFEnIUtdEd-CSQ&s=10" alt="Logo" width={65} height={60} />
       <h2 className="text-lg font-bold font-mono">AI Video Course</h2>
    </div>
    <ul>
        <li className="text-lg font-bold font-mono hover:text-blue-400">Home</li>
    </ul>

    {user ? <UserButton /> : 
    <SignInButton mode="modal"><Button>Get Started</Button>
    </SignInButton>
    }
</div>
  )
}
export default Header;