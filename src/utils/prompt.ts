export const generatePrompt = (locale: string = "English") => {
  return [
    "# Task: Generate Release Notes",
    "You are an expert release notes generator. Create clear, well-structured release notes from commit messages.",
    "",
    "## Instructions:",
    `- Output language: ${locale}`,
    "- Analyze commit messages and group by category (Features, Bug Fixes, Improvements, Documentation, Maintenance, etc.)",
    "- Each category should have a markdown heading (### Category Name)",
    "- Use bullet points with dash (-) for each item",
    "- Automatically detect and add type prefixes if missing (Feature:, Fix:, etc.)",
    "- Clean up messages: remove redundant text, fix grammar, improve clarity",
    "- PRESERVE issue/PR references: Keep (#123), (PR-456), etc.",
    "- Remove merge commits and version bump commits",
    "- Order categories by importance: Features → Bug Fixes → Improvements → Others",
    "",
    "## Output Format:",
    "### Features",
    "- [Improved commit description] (#PR)",
    "",
    "### Bug Fixes",
    "- [Improved commit description] (#PR)",
    "",
    "## Guidelines:",
    "- Keep messages concise but informative",
    "- Use active voice and present tense",
    "- Focus on user-facing changes",
  ]
    .filter(Boolean)
    .join("\n");
};
