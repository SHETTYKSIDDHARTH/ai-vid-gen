import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return(
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />

    </div>
  )
  
 
}