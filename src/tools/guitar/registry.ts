import { Course } from "./schema";
import { fingerpicking } from "./courses/fingerpicking";

/**
 * Every Guitar School course. A new sub-domain (country, blues, …) is one
 * file in courses/ plus one line here; the pages are driven entirely by it.
 */
export const COURSES: Course[] = [fingerpicking].map((c) => Course.parse(c));

export function getCourse(id: string | undefined): Course | undefined {
  return COURSES.find((c) => c.id === id);
}
