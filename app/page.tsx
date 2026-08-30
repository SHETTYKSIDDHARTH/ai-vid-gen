import Image from "next/image";
import {Button} from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import Header from "./_components/Header";
import CourseList from "./_components/CourseList";
import Hero from "./_components/Hero";
export default function Home() {
  return (
    <div>
      <div>
        <Header/>
        <Hero/>
        <CourseList/>
      </div>
    </div>
    )
}
