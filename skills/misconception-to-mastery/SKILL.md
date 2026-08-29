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
