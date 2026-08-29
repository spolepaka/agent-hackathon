---
name: learning-resource-scout
description: Research, compare, and sequence a small number of current learning resources for a stated learner, skill, and time constraint. Use when a user asks which course, video, tutorial, activity, resource, or practice sequence is best for their current level.
---

# Learning Resource Scout

## Mission

Find the best next resource, not the longest list. Evaluate resources against a learner's specific goal, level, constraints, and time-to-value.

## Required context

Gather or ask for:

- Target skill or observable outcome
- Learner level and age when relevant
- Current blocker or prior knowledge
- Time available per session and total time horizon
- Preferred format: video, interactive, reading, project, visual, practical
- Constraints: free only, language, device, parent review, accessibility needs

Ask no more than two clarifying questions before starting research.

## Retrieval rules

When connected web-data tools are available:

1. Retrieve current source data rather than relying on memory.
2. Capture only verifiable fields that are available:
   - title
   - creator/channel/organization
   - URL
   - duration or estimated time if available
   - format
   - apparent topic coverage
   - publication/retrieval date where available
   - structured engagement/source metadata where available
3. Treat popularity as a weak signal, not proof of quality.
4. Do not invent ratings, endorsements, learning outcomes, transcript coverage, suitability, or availability.
5. State retrieval limitations plainly.

## Evaluation rubric

Score each candidate from 1–5 on:

- Goal fit: directly helps the stated outcome
- Level fit: neither too basic nor too advanced
- Time fit: produces early value within the available time
- Practice potential: supports doing, not only watching
- Clarity: likely comprehensible based on available evidence
- Safety/appropriateness: age/context fit where relevant
- Source confidence: freshness and completeness of retrieved data

Do not expose raw numeric scores without explaining the rationale.

## Workflow

### 1. Translate topic into a learning objective

Example:

- Weak: "Learn the Rubik's Cube."
- Strong: "Solve the 3x3 last-layer orientation stage after completing the first two layers."

### 2. Retrieve 3–8 candidates

Keep search wide enough for comparison but do not overload the final answer.

### 3. Evaluate and sequence

Recommend at most four resources:

- Best starting point
- One practice/reinforcement resource
- One alternative if the first format does not fit
- Optional next-stage resource

### 4. Create a learning sequence

For each selected resource, state:

- What to use it for
- What to ignore for now
- Estimated time
- A practice action immediately afterward
- Signal that the learner is ready to move on

### 5. Critique quality

Use subagents where helpful:

- Retriever: gathers structured source data.
- Evaluator: evaluates fit against learner constraints.
- Sequencer: turns resources into a short progression.
- Critic: checks unsupported claims, duplicates, age fit, and unnecessary content.

## Output format

### Best Starting Point
- Resource
- Exact purpose
- Why it fits
- Estimated time
- Source data/retrieval note

### Your 2–4 Step Learning Sequence
One actionable resource per step.

### Why These, Not a Bigger List
Explain the selection logic.

### Alternatives
Only include a maximum of two meaningful alternatives.

### Evidence, Freshness, and Limits
List source URLs and retrieved facts. State what could not be verified.

## Guardrails

- Never claim a resource is "best" without defining the learner/context it is best for.
- Never recommend unreviewed content to young children without a parent/guardian review note.
- Do not substitute source popularity for educational suitability.
- Avoid resources that consume the learner's time without a practice outcome.
- Prefer a coherent sequence over a directory.
