import AnimatedBackground from "@/components/ui/AnimatedBackground"
import { GalleryVerticalEndIcon } from "lucide-react"
import { SignupForm } from "@/components/signup-form"

export default function SignupPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center">
      <AnimatedBackground />
      <div className="relative z-10 flex w-full max-w-sm flex-col gap-6 p-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GalleryVerticalEndIcon className="size-4" />
          </div>
          JournaLink
        </a>
        <SignupForm />
      </div>
    </div>
  )
}