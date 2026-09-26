import { SignIn } from '@clerk/nextjs'

export default function Page() {
  return(
    <div className="flex flex-col flex-1 w-full items-center justify-center py-2">
      <SignIn path="/sign-in" routing="path" signUpUrl="/sign-up" />

    </div>
  )
  
 
}