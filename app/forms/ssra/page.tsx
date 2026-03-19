import { SsraForm } from "@/components/ssra-form";
import { getProjects } from "@/lib/projects";

export const dynamic = "force-dynamic";

export default function SsraPage() {
  return <SsraForm projects={getProjects()} />;
}
