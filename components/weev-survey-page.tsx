import { SurveyForm } from "@/components/survey-form";
import { SURVEY_TEMPLATE } from "@/data/survey-template";
import { getServerConfig } from "@/lib/config";
import { getProjects } from "@/lib/projects";

export function WeevSurveyPage() {
  const config = getServerConfig();
  const projects = getProjects();

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="surface-card rounded-[28px] bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
          <SurveyForm
            projects={projects}
            templateRows={SURVEY_TEMPLATE}
            maxUploadCount={config.maxUploadCount}
            maxUploadMb={config.maxUploadMb}
          />
        </section>
      </div>
    </main>
  );
}
