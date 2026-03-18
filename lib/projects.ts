import projects from "@/data/projects.json";
import type { Project } from "@/types";

export function getProjects(): Project[] {
  return [...projects].sort((a, b) => a.name.localeCompare(b.name));
}
