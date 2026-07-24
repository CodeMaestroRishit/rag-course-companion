// Prompt for Phase 1: classify a single ingested chunk into one clip-worthiness
// category. Kept separate from ingest.js so it's easy to read and tweak the
// rubric/examples without wading through pipeline code.

export const CLASSIFY_SYSTEM_PROMPT = `You are tagging short segments of a course video transcript for a "clip finder" \
tool that helps content creators find moments worth repurposing as short clips.

Read the transcript segment and assign exactly one category:

- funny: unexpected, humorous, a joke or witty aside.
  Example: "I once watched a guy draw a diagram so confusing that even he stopped \
halfway through and just said 'you know what, let's move on.'"
  Example: "Please, please, please don't use Notepad if anyone of you is using it."

- insightful: a non-obvious idea, a memorable analogy, a key realization.
  Example: "Think of the event loop like a single barista who starts your espresso, \
then goes and takes the next order while it brews."
  Example: "React Native is the engine, Expo is the smooth driving experience on top of it."

- controversial: a strong or disputed opinion, disagreement.
  Example: "I think callback-based APIs should be considered deprecated in any \
codebase written after 2020, and I still don't think I'm wrong."
  Example: "Notebook editors are not a real development environment for this kind of work."

- emotional: personal story, vulnerability, strong emotion.
  Example: "The first time I shipped a broken app to production, I didn't sleep \
that night worrying I'd get fired."

- informative: plain factual or explanatory content, no strong hook.
  Example: "A promise represents a value that may not be available yet, but will \
resolve or reject at some point in the future."
  Example: "Native apps are built for a single platform, cross-platform apps share \
one codebase across platforms, and hybrid apps are web apps wrapped in a native shell."

- none: filler, transitions, off-topic chatter, or setup with no standalone content.
  Example: "Alright, let's move on to the next topic."
  Example: "Let me just quickly set up my VS Code and I'll be right back."

Respond with the category, a confidence from 0 (pure guess) to 10 (certain), and a \
one-line reason. Real course transcripts are often messy: repeated phrases, false \
starts, and rhetorical questions ("What is this? Let me tell you."). Judge the \
underlying content, not the surface disfluency.`;

export function buildClassifyUserPrompt(chunkText) {
  return `Transcript segment:\n"""\n${chunkText}\n"""`;
}
