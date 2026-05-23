---
title: "PRD: Reddit-style timeline UI for playbook planning"
description: "Proposal for a living, feed-based session UI that presents playbook work as a timeline of posts, replies, loops, subtasks, and human feedback."
---

# PRD: Reddit-style timeline UI for playbook planning

Status: **Draft proposal**
Owner: TBD

## 1. Product Goal

Turn the planner/playbook UI into a living stream rather than a static form +
result page.

The user should be able to open a planning session and immediately understand:

1. what the planner is doing right now
2. what has already been produced
3. what subtasks and loops exist inside the playbook
4. where the human review artifact lives
5. how to give feedback without losing the thread

The UI should feel closer to a Reddit feed or discussion thread than a
traditional admin dashboard:

- each meaningful planner event becomes a post
- subtasks appear as nested replies
- feedback appears as comments in the thread
- loops and revisions are visible as new feed items
- loading states and motion make the stream feel alive

## 2. Problem Statement

The current browser studio shows correct information, but it still reads like a
set of panels:

- lifecycle/status cards
- output cards
- feedback form
- draft structure

That is functional, but it does not match how users think about a playbook
while it is being planned.

What the user actually wants is a **timeline of work**:

- the planner prompt
- the generated playbook draft
- the task breakdown
- the human review artifact
- feedback replies
- later loops and revisions

Today the page does not communicate “living stream” semantics strongly enough.
It lacks:

- visible placeholders while a draft is loading
- motion for new posts or revisions
- obvious thread nesting
- a feed vocabulary for posts, replies, and loops

## 3. UX Principle

The playbook UI should behave like a social feed with a side rail:

- **Center column**: a timeline of posts
- **Right rail**: lifecycle, topology, and action controls

The center column is the primary surface. The right rail supports it with:

- current planner state
- outputs
- publish / reply actions
- review artifact links

This keeps the page readable on one screen while making the main story the
sequence of events.

## 4. Core Information Model

The UI should render the playbook as these feed primitives:

- **Post**: a planner event, a draft milestone, a publish step, or a human
  review artifact
- **Reply**: feedback or a nested subtask
- **Loop**: a repeated revision cycle, shown as a new post/revision marker
- **Placeholder**: an empty or loading state before the real content arrives
- **Topological summary**: a compact rail for status, revision, task count, and
  current state

This is not a new backend model. It is a presentation model over the existing
session / playbook / review data.

## 5. Proposed UI Layout

### 5.1 Session view

The session page becomes a feed first view:

- Hero: playbook name, status, revision, feedback count
- Center feed:
  - planner prompt post
  - draft playbook post
  - subtasks as nested replies
  - human feedback thread
  - loop/revision updates
- Right rail:
  - planner lifecycle
  - outputs
  - feedback reply form
  - publish action

### 5.2 Published playbook view

The published view uses the same vocabulary:

- published plan post
- task topology post
- human review artifact post
- run dashboard post
- task threads as nested replies

The two views should feel like the same product at different stages of the
same timeline.

## 6. Loading, Motion, and “Living Stream” Behavior

The UI should not go static while the planner is thinking.

Required states:

- skeleton posts while the draft is loading
- shimmer or pulse placeholders for title/body/meta
- a visible “planning” or “publishing” active indicator
- brief highlight/slide-in when a new post appears
- subtle loop/revision emphasis when feedback triggers a rerun

Motion should be restrained:

- enough to show the feed is live
- not so much that it becomes noisy
- respect `prefers-reduced-motion`

The point is to communicate that the planner is a stream of work, not a
snapshot.

## 7. Human Review Artifact

The human-in-the-loop step should remain a first-class feed item.

Requirements:

- the review artifact is persisted as HTML
- the UI links to the stored HTML artifact
- the artifact is styled as a review surface that is easy to scan
- feedback can be added directly from the playbook/session context

The review artifact should look like a report card inside the feed, not a
separate obscure page.

## 8. Acceptance Criteria

The PRD is satisfied when:

- a user can scan the session page and understand the current planner state in
  under a few seconds
- the session page reads as a living feed with posts, replies, and loops
- loading states are visible before the first draft arrives
- the published playbook page reuses the same structure and language
- the HTML review artifact is easy to open, scan, and feedback
- the UI still fits on the first screen on desktop

## 9. Non-goals

- Do not introduce a new backend data model for feed items.
- Do not replace the existing local-only studio server.
- Do not add websockets unless polling becomes clearly insufficient.
- Do not build a general social product; the feed metaphor is only for playbook
  planning.

## 10. Suggested Next Step

If this PRD is accepted, the next implementation pass should:

1. add placeholder/skeleton states to the feed
2. add lightweight motion for active planning and new posts
3. refine the session page into a stronger timeline/feed hierarchy
4. keep the review artifact and task threads embedded in the stream

