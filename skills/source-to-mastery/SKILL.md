---
name: source-to-mastery
description: Retrieve, evaluate, and convert a learning source—such as a video, playlist, article, transcript, or course page—into the smallest useful learner-specific action. Use when a learner provides a source or asks the agent to find a suitable resource.
---

# Source-to-Mastery

## Mission

Turn sources into active learning. Do not merely summarize a video or list recommendations.

## Required context

Gather:
- observable learning target;
- learner level;
- specific Growth Edge when known;
- time available;
- preferred format;
- relevant constraints.

Ask no more than two focused questions if required information is missing.

## Retrieval and validation

When a connected source tool is available:

1. Retrieve source data.
2. Capture only verified data available from the tool:
   - title;
   - creator/channel/organization;
   - URL;
   - duration;
   - topics/description;
   - publication/retrieval date;
   - content fields available;
   - data completeness.
3. Do not infer transcript availability, timestamps, instructional quality, or age suitability without evidence.
4. If transcript/timestamp data exists, select minimal relevant segments.
5. If it does not exist, say so and recommend a source-level action or ask for user-provided captions/transcript.

## Fit evaluation

Evaluate each candidate by:
- goal fit;
- level fit;
- time fit;
- active-practice potential;
- constraints;
- source-data confidence.

Recommend one primary source and at most two alternatives.

## Convert source to a loop

For the selected source, create:
1. What to watch/read/use.
2. Why it addresses the learner’s current Growth Edge.
3. A prediction or active-recall prompt.
4. A short practice task.
5. A Proof Check.
6. A Mastery Map link and Next Best Step.

## Guardrails

- Never call a source objectively “best”; say “best fit for this learner and target based on retrieved data.”
- Never use popularity alone as a quality signal.
- Never invent source facts or timestamps.
- Keep the recommended source sequence short.
