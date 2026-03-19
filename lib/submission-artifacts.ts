function sanitiseDocumentBaseName(input: string) {
  return input
    .replace(/[<>:"/\\|?*\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

export function buildSubmissionSubject(project: string, surveyType: string, surveyDate: string) {
  return `${project} - ${surveyType} - ${surveyDate}`;
}

export function buildSubmissionArtifactBaseName(project: string, surveyType: string, surveyDate: string) {
  return sanitiseDocumentBaseName(buildSubmissionSubject(project, surveyType, surveyDate)) || "Glidepath survey";
}
