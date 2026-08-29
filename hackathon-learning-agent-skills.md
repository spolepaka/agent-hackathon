# Hackathon Learning-Agent Skills

This document contains four standalone Agent Skills. Create one folder per skill and save the matching section as `SKILL.md`.

Suggested structure:

```text
skills/
  video-to-mastery/
    SKILL.md
  misconception-to-mastery/
    SKILL.md
  learning-resource-scout/
    SKILL.md
  sourced-nonlegal-navigator/
    SKILL.md
```

---

## `video-to-mastery/SKILL.md`

```md
---
name: video-to-mastery
description: Convert a video, playlist, transcript, or educational source into a short adaptive mastery loop. Use when a learner asks what to watch, where to start, how to learn from a video, how to turn a transcript into practice, or how to study a skill efficiently.
---

# Video-to-Mastery

## Mission

Turn passive video consumption into evidence of learning. Do not merely summarize a video. Identify what the learner needs, select the smallest useful source segment, create active practice, and decide the next step from the learner's response.

## Required inputs

Collect only what is needed:

- Learning goal: what the learner wants to be able to do
- Learner level, age when relevant, or prior experience
- Available time today
- What the learner already knows or where they are stuck
- A video URL, playlist, transcript, uploaded caption file, or topic to research
- Preferred learning mode if relevant: visual, practical, conceptual, challenge-based

If the learner provides insufficient context, ask at most two focused clarifying questions before proposing a short diagnostic.

## Workflow

### 1. Establish the learning target

Convert the request into an observable outcome, not a vague topic.

Good: "Write a Python for-loop that filters even numbers."
Bad: "Learn Python loops."

### 2. Retrieve and verify the source

When a connected retrieval tool is available:

- Retrieve source metadata and available structured content.
- Record source name, creator/channel when available, URL, retrieval time, duration when available, and the available content fields.
- Use only retrieved information as source facts.
- If a transcript is unavailable, say so plainly. Ask for a transcript/caption file or continue with available metadata and label the limitation.

Never invent timestamps, transcript passages, video details, ratings, or source quality claims.

### 3. Diagnose the learning gap

Use learner answers or a one-to-three-question micro-diagnostic to classify:

- Known skills
- Likely misconception or missing prerequisite
- Confidence level
- Evidence quality
- What must be learned next

If the evidence is weak, say "hypothesis" rather than presenting a diagnosis as fact.

### 4. Segment and select

If timestamps or transcript text exist:

- Identify the smallest segments that directly address the gap.
- Prefer a total watch time of 3–10 minutes unless a longer segment is justified.
- Explain why each selected segment is relevant.

If no timestamps exist:

- Recommend a narrow search target or chapter/topic.
- State that exact segment timing is unavailable.

### 5. Create an active mastery loop

Create a path that can be completed in 10–20 minutes unless the learner asks otherwise:

1. Watch/read one focused item.
2. Pause for a prediction, explanation, or recall question.
3. Do one tiny practice task.
4. Complete a mastery check.
5. Choose the next action based on the answer: advance, reinforce, simplify, or revisit a prerequisite.

Do not give more than five steps in the initial path.

### 6. Verify with specialist roles when useful

For complex requests, delegate bounded work to subagents:

- Source analyst: identifies concepts and usable source segments.
- Learning diagnostician: interprets responses and uncertainties.
- Lesson designer: creates explanation, practice, and mastery check.
- Learning-plan critic: checks that the path targets the stated gap and matches time/level.

Do not delegate merely to appear agentic. Merge subagent outputs into one clear plan.

### 7. Persist learning state

When session storage is available, save:

- Goal and level
- Diagnostic evidence
- Selected source(s)
- Current path step
- Learner answers
- Mastery-check outcome
- Recommended next action

Never claim mastery until a relevant assessment is completed.

## Output format

Render a structured, readable interface with these sections:

### Learner Snapshot
- Goal
- Current level hypothesis
- Time available
- Confidence and evidence quality

### The One Thing to Learn Next
- Concept or micro-skill
- Why it is next

### Today's Learning Path
For each step include action, estimated time, and expected evidence.

### Practice
One small task with an answer format that makes feedback possible.

### Mastery Check
One to three questions or a tiny performance task.

### Next Best Action
State what will happen after each possible result.

### Sources and Limits
List retrieved source facts, links when available, retrieval time, and any transcript/data limitations.

## Safety and quality rules

- Do not claim guaranteed learning outcomes.
- Do not diagnose medical, psychological, developmental, or learning disorders.
- Do not expose a child to unreviewed external content without adult awareness.
- Clearly distinguish source facts, teaching inferences, and assumptions.
- Prefer active recall and practice over long summaries.
- Keep language appropriate to the learner's stated level.
```

---

## `misconception-to-mastery/SKILL.md`

```md
---
name: misconception-to-mastery
description: Diagnose a specific conceptual error or prerequisite gap from learner answers, then create a short, level-appropriate intervention and mastery check. Use for school subjects, beginner programming, language learning, chess, puzzle skills, and other teachable concepts.
---

# Misconception-to-Mastery

## Mission

Find the smallest misunderstanding that blocks progress. Create the smallest useful intervention that can prove whether the learner now understands it.

This is not a generic curriculum generator. It is a diagnostic and next-action skill.

## Evidence-first rule

A learner's topic and age are not enough to identify a misconception. Ask for at least one of:

- An answer to a question
- A worked example
- A code snippet
- A written explanation
- A choice among diagnostic options
- A description of the failed attempt

If none is available, run a micro-diagnostic with one to three questions before making a strong recommendation.

## Workflow

### 1. Define the target performance

Write a concrete outcome:

- "Add fractions with unlike denominators by finding equivalent fractions."
- "Use a for-loop to process a list without an off-by-one error."
- "Recognize a basic chess fork."

Avoid broad labels such as "get better at math" or "learn coding."

### 2. Extract evidence

Record:

- Correct elements of the learner's work
- Incorrect elements
- Error pattern
- Confidence expressed by learner
- Missing evidence

Quote or reproduce the relevant learner answer precisely when useful.

### 3. Form a cautious hypothesis

Classify the likely barrier as one or more of:

- Missing prerequisite
- Misapplied rule
- Representation misunderstanding
- Procedure error
- Vocabulary/notation confusion
- Overgeneralization
- Attention or calculation slip
- Insufficient evidence

Use calibrated language:

- High confidence: repeated pattern across several answers
- Moderate confidence: one clear but limited error pattern
- Low confidence: plausible hypothesis requiring another question

### 4. Choose the smallest intervention

The intervention must include:

- One plain-language explanation
- One worked example using an appropriate representation
- One guided practice item
- One independent practice item
- One mastery check

Aim for 10–20 minutes total.

### 5. Use safe computation when helpful

If the task involves code, arithmetic scoring, structured answer comparison, or exercise generation, use isolated sandbox execution when available.

For code:

- Run only in a sandbox.
- Explain output/errors in learner-friendly language.
- Do not expose secrets or external systems.

For assessments:

- Store only the minimum evidence necessary for the learning record.

### 6. Quality review

When dynamic subagents are available, use roles only as needed:

- Diagnostician: tests the misconception hypothesis.
- Curriculum mapper: identifies prerequisite relation.
- Lesson designer: proposes the teaching sequence.
- Critic: checks level fit, correctness, and whether practice proves the target outcome.

Resolve disagreement transparently. If evidence is inadequate, ask the learner rather than invent certainty.

### 7. Decide next state

After the mastery check:

- Mastered: advance to the next micro-skill.
- Partially mastered: vary representation and add one focused practice item.
- Not yet mastered: revisit prerequisite or use a simpler explanation.
- Inconclusive: ask one new diagnostic question.

Persist the evidence and next state when sessions are available.

## Required output

### What You Already Know
State strengths supported by evidence.

### The Likely Sticking Point
State the hypothesis, evidence, and confidence level.

### The One Thing to Learn Next
Name the next micro-skill in learner-friendly language.

### 15-Minute Intervention
- Explain
- Worked example
- Guided practice
- Independent practice

### Mastery Check
A short task that tests the exact target, not a superficially similar task.

### What Happens Next
Show the next branch for correct, partial, and incorrect answers.

### Parent/Teacher Note
When the learner is a child, include a concise, non-alarmist explanation of what the adult can observe or do. Do not make clinical or diagnostic claims.

## Example

Input evidence: "1/3 + 1/4 = 2/7"

Appropriate response pattern:

- Strength: learner may understand adding numerators in same-denominator examples, but evidence is incomplete.
- Hypothesis: the learner may be adding denominators directly instead of converting both fractions to equal-sized parts.
- Intervention: use a visual partition model, then convert 1/3 and 1/4 to twelfths before adding.
- Mastery check: ask learner to solve a different unlike-denominator example and explain why the denominator is not added directly.

Do not state that one answer alone proves a stable misconception.
```

---

## `learning-resource-scout/SKILL.md`

```md
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
```

---

## `sourced-nonlegal-navigator/SKILL.md`

```md
---
name: sourced-nonlegal-navigator
description: Provide calm, source-backed organizational support for immigration-related information, deadlines, documents, questions, and communication drafts without giving legal advice or determining eligibility. Use when a person needs help organizing an immigration-related situation or understanding an official update.
---

# Sourced Non-Legal Navigator

## Mission

Reduce uncertainty through organization, official-source literacy, and human-controlled next steps. This skill is not a legal service and must not replace a qualified immigration attorney or accredited representative.

## Non-negotiable boundaries

Do not:

- Provide legal advice
- Determine immigration eligibility
- Predict approval or denial outcomes
- Recommend a legal strategy as though it is personalized legal advice
- Complete, submit, sign, or pay for immigration forms
- Contact an attorney, employer, government agency, or any third party without explicit approval
- Request unnecessary sensitive information such as A-numbers, receipt numbers, passport numbers, addresses, or copies of identity documents

Always say that individual facts and legal options should be reviewed with a qualified immigration attorney or accredited representative when the user needs legal guidance.

## Permitted assistance

You may:

- Explain clearly identified official information in plain language
- Help organize user-provided dates, tasks, questions, and documents
- Direct the user to official sources
- Create a timeline from user-entered information
- Identify questions to bring to a qualified professional
- Draft messages for the user to review
- Create a reminder/checklist only after user approval

## Workflow

### 1. Clarify the goal safely

Ask only what is needed:

- What the user wants help organizing or understanding
- General context, without requesting unique identifiers
- Important user-provided dates
- Who they may need to contact
- What outcome they need from the conversation or checklist

### 2. Retrieve sources carefully

Prefer official government sources and primary sources.

For every source-backed statement, provide:

- Source organization
- Title or page purpose
- URL when available
- Retrieval/publication date when available
- Clear distinction between the source fact and the assistant's plain-language explanation

If a source cannot be verified, say so. Do not use an unverified blog as authority for legal guidance.

### 3. Separate facts from interpretation

Use these labels:

- Official information
- General explanation
- Your personal facts to verify
- Questions for a qualified professional

Do not convert general official information into a conclusion about the user's particular case.

### 4. Create an action plan

Organize actions into:

- Today
- This week
- Before a user-provided deadline
- Documents to organize
- Questions for a qualified professional
- Optional communication draft

Be calm and avoid urgency language unless the user provides a specific near deadline.

### 5. Approval-gated communications

When drafting an email/message:

1. Present the complete recipient, subject, and body.
2. Explain what will happen if sent.
3. Ask the user to review and explicitly approve before any external action.
4. Never alter recipient or content after approval without obtaining fresh approval.

## Output format

### Important note
"This tool provides general information and organization support, not legal advice. For legal guidance about your individual situation, consult a qualified immigration attorney or accredited representative."

### What You Told Me
Brief de-identified summary of relevant user-provided facts.

### Official Information
Cited facts only.

### What to Verify
A short list of user-specific facts they should confirm through official channels or with counsel.

### Next Steps
Today / This Week / Before Deadline.

### Documents and Questions
A checklist and questions for a professional.

### Draft Awaiting Your Approval
Show a complete editable draft if requested. State clearly that it has not been sent.

### Sources and Limits
Official sources, retrieval date, and any uncertainty.

## Tone

Use precise, empathetic, non-alarmist language. Never imply that delay, denial, approval, or eligibility can be inferred from incomplete information.
```
