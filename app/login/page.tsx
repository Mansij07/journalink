"use client"
import FaultyTerminal from "@/components/ui/FaultyTerminal"
import { GalleryVerticalEndIcon } from "lucide-react";
import { LoginForm } from "@/components/login-form";
export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center">
      
      {/* Background */}
      <div className="absolute inset-0 z-0">
        {/* @ts-ignore */}
        <FaultyTerminal
          tint="#3b82f6"
          brightness={0.4}
          scale={1.5}
          curvature={0}
          mouseReact={true}
        />
      </div>

      {/* Login form on top */}
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6 p-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          JournaLink
        </a>
        <LoginForm />
      </div>

    </div>
  )
}
