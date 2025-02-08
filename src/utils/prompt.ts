export const generatePrompt = (locale: string = "English") => {
  return [
    "Given the following list of commit messages, categorize and generate a release message with sections from prefix or content of commit message",
    `Message language: ${locale}`,
    "Use bullet points in an unordered list format and attach type as prefix for each list (e.g. feature, bug fix, refactor, etc.)",
    "You must group commit messages by type prefix. and attach header for each group",
    "Exclude anything unnecessary such as translation. Make response as text only without markdown syntax",
  ]
    .filter(Boolean)
    .join("\n");
};
