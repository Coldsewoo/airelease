export const generatePrompt = (locale: string = "EN") => {
  return [
    `Using the provided commit messages, create a release note with categorized sections based on the content or prefix of each commit message (e.g., feat, fix, chore, improve, refactor).`,
    `Ensure the notes are clear, concise, and customer-friendly, without any technical explanations.`,
    `Retain the pull request numbers (e.g., #number) and remove any icons.`,
    `The release note should be generated in the specified locale (${locale}).`,
    `Exclude information related to package version updates and console cleanup.`,
    `Do not include header title.`,
  ]
    .filter(Boolean)
    .join("\n");
};
