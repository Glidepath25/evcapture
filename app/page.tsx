import { SurveyForm } from "@/components/survey-form";
import { SURVEY_TEMPLATE } from "@/data/survey-template";
import { getServerConfig } from "@/lib/config";
import { getProjects } from "@/lib/projects";

export default function HomePage() {
  const config = getServerConfig();
  const projects = getProjects();

  return (
    <main className="min-h-screen px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="surface-card overflow-hidden rounded-[28px]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_1.35fr]">
            <div className="hidden bg-[linear-gradient(160deg,#10315a_0%,#153c6d_58%,#24588f_100%)] px-6 py-8 text-white sm:px-8 lg:block lg:px-10">
              <div className="mb-8 inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/8 px-4 py-2 text-sm font-medium uppercase tracking-[0.18em] text-white/90">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
                Glidepath Solutions
              </div>
              <h1 className="max-w-md text-3xl font-semibold tracking-tight sm:text-4xl">EVcapture site survey</h1>
              <p className="mt-4 max-w-lg text-sm leading-6 text-slate-200 sm:text-base">
                Complete the site survey on your phone, attach photos from camera or gallery, and submit a structured record that automatically generates a PDF and CSV for the office team.
              </p>
              <div className="mt-8 grid gap-3 text-sm text-slate-100 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="font-semibold">Public access</p>
                  <p className="mt-1 text-slate-200">No login or account required. Open the link and submit on site.</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="font-semibold">Instant outputs</p>
                  <p className="mt-1 text-slate-200">The system saves the record, generates PDF and CSV files, and emails them automatically.</p>
                </div>
              </div>
              <dl className="mt-10 grid gap-4 text-sm text-slate-200">
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <dt className="font-semibold text-white">Projects</dt>
                  <dd className="mt-1">Loaded from editable JSON seed data for v1, so the list can be updated quickly without an admin portal.</dd>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/8 p-4">
                  <dt className="font-semibold text-white">Abuse protection</dt>
                  <dd className="mt-1">Includes a hidden honeypot, upload limits, filename sanitisation, and IP-based rate limiting.</dd>
                </div>
              </dl>
            </div>
            <div className="bg-white px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
              <SurveyForm
                projects={projects}
                templateRows={SURVEY_TEMPLATE}
                maxUploadCount={config.maxUploadCount}
                maxUploadMb={config.maxUploadMb}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
