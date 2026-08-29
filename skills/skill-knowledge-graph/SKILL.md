---
name: skill-knowledge-graph
description: Build and update LearnLoop’s Mastery Map: a compact, evidence-based knowledge graph of learner concepts, prerequisites, learning signals, source artifacts, mastery confidence, and the Next Best Step. Use when starting a learning session, diagnosing a Growth Edge, creating a Today’s Loop, receiving sandbox results, evaluating a Proof Check, or updating persistent learner progress.
---

# LearnLoop Mastery Map

## Mission

Build an inspectable, learner-specific Mastery Map that explains:

- What the learner has demonstrated
- What they are currently practicing
- What is blocking progress
- Which prerequisite matters next
- Why LearnLoop selected the Next Best Step

The Mastery Map is a transparent planning model. It must be updated from evidence, not assumptions, motivation, or generic curriculum order.

## Core graph model

The graph contains:

- **Concept nodes** — skills or concepts, such as `variables`, `range()`, or `for loops`
- **Prerequisite edges** — one concept materially supports another
- **Evidence** — learner answers, sandbox results, Proof Checks, and retrieved source facts
- **Artifacts** — visual traces, source cards, practice missions, code tasks, or explanations
- **Statuses** — current evidence-based learning state
- **Confidence** — how strongly the evidence supports the current status
- **Next Best Step** — one recommended learning action

## Allowed node statuses

Use only one of these statuses for each concept:

| Status | Meaning |
|---|---|
| `mastered` | Meaningful performance evidence and/or a successful transfer or explain-back Proof Check supports competence |
| `practicing` | The learner is actively working on the concept, but evidence of stable mastery is incomplete |
| `stuck` | A clear or repeated error pattern indicates a current Growth Edge |
| `unknown` | No meaningful learner evidence exists yet |
| `locked` | A needed prerequisite lacks sufficient evidence |
| `recommended_next` | The one highest-leverage concept to address in the next Today’s Loop |

## Evidence rules

1. Never mark a node `mastered` from self-report alone.
2. Never mark a node `stuck` from a vague statement such as “I am bad at Python.”
3. Use `practicing` rather than `stuck` if there is only limited or ambiguous evidence.
4. Use `unknown` where no evidence exists.
5. Use `locked` only when the missing prerequisite materially prevents progress.
6. Mark exactly one concept as `recommended_next` when enough evidence exists.
7. Do not modify graph state unless new Learning Signals justify it.
8. Preserve prior evidence-supported states across sessions.
9. Store short evidence summaries; do not include raw transcripts, full chat history, secrets, or unnecessary personal data.
10. Clearly distinguish:
   - learner-provided evidence;
   - sandbox result;
   - retrieved source fact;
   - persistent Learning Memory;
   - agent inference;
   - uncertainty.

## Beginner Python demo graph

For the hackathon, keep the Mastery Map limited to these concepts:

```text
variables
expressions
boolean_conditions
lists
for_loops
range
loop_boundaries
functions
```

Recommended prerequisite relationships:

```text
variables            → expressions
variables            → range
expressions          → boolean_conditions
variables            → lists
variables            → for_loops
range                → for_loops
loop_boundaries      → for_loops
for_loops            → functions
lists                → functions
boolean_conditions   → functions
```

Do not show all relationships unless they help the learner understand the current Next Best Step.

## Inputs to use

Use relevant information from:

- Learner’s stated goal
- Learner’s code
- Learner’s output/error
- Learner’s answer or explanation
- Learning Diagnostician findings
- Teaching Strategy Selector recommendation
- Source Curator verified source data
- Practice Lab sandbox result
- Proof Check result
- Relevant consented Learning Memory

Treat all information as provisional unless it contains clear evidence.

## Update workflow

### 1. Identify the current target

State the observable micro-skill.

Example:

```text
Predict and explain the values produced by range(5).
```

Not:

```text
Learn Python loops.
```

### 2. Identify affected nodes

Choose only the concepts affected by the new Learning Signal.

Example learner statement:

```text
“I think range(5) means 1 through 5.”
```

Likely affected nodes:

```text
range
loop_boundaries
for_loops
```

Do not alter unrelated nodes.

### 3. Add concise evidence

Examples:

```text
Learner stated that range(5) includes values 1 through 5.
```

```text
Sandbox output showed range(1, 5) printed 1, 2, 3, 4; expected output was 0, 1, 2, 3, 4.
```

```text
Learner correctly explained that the stop value is excluded and passed a transfer task using range(2, 7).
```

### 4. Assign status and confidence

Use conservative confidence values from 0 to 1.

Suggested interpretation:

| Confidence | Meaning |
|---:|---|
| 0.00–0.24 | Very limited evidence |
| 0.25–0.49 | Plausible hypothesis / early practice |
| 0.50–0.74 | Clear but incomplete evidence |
| 0.75–0.89 | Strong performance evidence |
| 0.90–1.00 | Repeated performance and transfer evidence |

### 5. Choose Next Best Step

Select the single learning action with the highest leverage based on:

- Prerequisite importance
- Current Growth Edge
- Learner’s stated goal
- Available time
- Prior effective interventions from Learning Memory
- Whether the action is small enough to complete now

The Next Best Step should be actionable in 8–15 minutes whenever possible.

### 6. Link artifacts

Link only relevant artifacts, such as:

```text
range-visual-trace
range-prediction-card
practice-lab-range-001
proof-check-range-transfer
youtube-source-range-basics
```

## JSON contract

Always return a valid JSON object first.

```json
{
  "graph_title": "LearnLoop Mastery Map — Beginner Python",
  "updated_at": "ISO-8601 timestamp if available",
  "target_skill": "Predict and explain the values produced by range(5)",
  "nodes": [
    {
      "id": "variables",
      "label": "Variables",
      "status": "mastered",
      "confidence": 0.8,
      "evidence": [
        {
          "type": "learner_code",
          "summary": "Learner has correctly used named variables in prior code.",
          "source": "learner evidence"
        }
      ],
      "prerequisites": [],
      "linked_artifacts": [],
      "next_action": null
    },
    {
      "id": "range",
      "label": "range()",
      "status": "recommended_next",
      "confidence": 0.42,
      "evidence": [
        {
          "type": "learner_statement",
          "summary": "Learner said range(5) means numbers 1 through 5.",
          "source": "current session"
        }
      ],
      "prerequisites": ["variables"],
      "linked_artifacts": [
        "range-visual-trace",
        "range-prediction-card"
      ],
      "next_action": "Complete a visual trace and predict the output of range(2, 6)."
    }
  ],
  "edges": [
    {
      "source": "variables",
      "target": "range",
      "relationship": "prerequisite_for"
    },
    {
      "source": "range",
      "target": "for_loops",
      "relationship": "prerequisite_for"
    }
  ],
  "recommended_next": {
    "node_id": "range",
    "reason": "The learner’s incorrect endpoint model is likely blocking accurate for-loop reasoning, and a short visual trace can address it within today’s time limit.",
    "confidence": 0.72,
    "estimated_minutes": 8
  },
  "uncertainties": [
    "The learner’s understanding of range(start, stop) has not yet been tested with a prediction or code task."
  ]
}
```

## Required learner-facing summary

After the JSON, return these sections:

```md
## Mastery Map Update

### What changed
State the nodes that changed and the evidence responsible.

### Current Growth Edge
Describe the current obstacle in learner-friendly language.

### Why this is the Next Best Step
Explain the leverage of the selected node.

### What will prove progress
State the exact Proof Check or performance evidence needed to update the node.
```

## Example update: `range(5)`

Input:

```text
Learner says: “I think range(5) means the numbers 1 through 5.”
Learner can use variables and print().
No loop code has been submitted.
```

Correct direction:

```text
variables: mastered or practicing only if prior evidence supports it
range: recommended_next, confidence around 0.35–0.50
loop_boundaries: practicing or unknown, not mastered
for_loops: locked or unknown because range understanding is not yet demonstrated
```

Recommended Next Best Step:

```text
Use a visual trace of range(5), ask for an output prediction,
then use a tiny code task that prints 0 through 4.
```

Do not claim the learner is “stuck” unless a clear error pattern or code attempt supports that stronger label.

## Privacy and consent

The graph may use relevant learner information only when appropriate. Do not store raw graph history or sensitive learner information in persistent Learning Memory unless the user explicitly approves a compact, durable summary.

Appropriate memory candidate:

```text
Learner is practicing Python range() endpoint behavior and benefits from visual traces followed by a short coding task.
```

Inappropriate memory candidate:

```text
Full transcript of the session, all submitted code, or every source retrieved.
```

Before any memory write, present the exact proposed memory and ask for approval.