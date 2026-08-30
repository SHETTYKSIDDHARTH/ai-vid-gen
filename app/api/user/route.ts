import {NextRequest, NextResponse} from "next/server";
import {currentUser} from "@clerk/nextjs/server";
import {eq} from "drizzle-orm";
import { usersTable } from "@/config/schema";
import { db } from "@/config/db";
export async function POST(req: NextRequest) {
const user = await currentUser();
//if user already exists in db
const existingUsers = await db.select().from(usersTable)
.where(eq(usersTable.email, user?.primaryEmailAddress?.emailAddress as string));

//if not create new user in db

if(existingUsers?.length===0){
  const newUser = await db.insert(usersTable).values({
    email:user?.primaryEmailAddress?.emailAddress as string,
    name:user?.fullName as string,
    lastName:user?.lastName as string,
    clerkId:user?.id as string,
  }).returning();
  return NextResponse.json({message:"User created successfully",user:newUser});
}

return NextResponse.json({message:"User already exists",user:existingUsers});
}