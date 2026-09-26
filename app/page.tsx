import { Suspense } from "react";
import CourseList from "./_components/CourseList";
import Hero from "./_components/Hero";
import HomeTabs from "./_components/HomeTabs";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 w-full">
      <main className="flex-1 w-full px-4 py-10">
        <Suspense>
          <HomeTabs generateSlot={<Hero />} coursesSlot={<CourseList />} />
        </Suspense>
      </main>
    </div>
  );
}
