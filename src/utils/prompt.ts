export const generatePrompt = (locale: string = "English") => {
  return [
    "Given the following list of commit messages, categorize and generate a release message with sections from prefix or content of commit message",
    `Message language: ${locale}`,
    "Add the type as a prefix for each item (e.g., 'Feature', 'Fix', 'QAQC', 'Chore', 'Improve', 'Hotfix' etc.) if not already included.",
    "Cleanup and sanitize the message content without markdown syntax",
    "Use bullet points in an unordered list format",
    "You must group commit messages by type prefix. and attach header for each group",
    "Exclude anything unnecessary such as translation. do not drop suffix like (#100)",
    "Do not generate release notes",
  ]
    .filter(Boolean)
    .join("\n");
};
