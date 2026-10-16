---
title: "How groundtruth scores candidates"
description: "Every candidate gets a 0 to 10 score per job. Here is what goes into it, what stays out, and why unverifiable work never moves the number."
date: 2026-10-09
author: "groundtruth"
---

A score you can't explain is just another opinion. If groundtruth tells you a candidate is a 7.4 for your role, you should be able to ask why and get a real answer.

So here is exactly how the score works.

## One score per job, not one per person

The same developer can be a strong fit for one role and a weak fit for another. A candidate with deep backend and infrastructure work will score differently for a UI role than for an API role, and that is the point.

So groundtruth never gives a candidate a single score for everyone. Each candidate is scored from **0 to 10 against the specific job** they applied to, and the report explains why, in both directions.

## What goes into the score

Four things make up the number.

**Stack match.** How closely their real work overlaps with the stack you asked for. Not the skills they list, but what shows up in the code they actually wrote.

**Evidence strength.** How strong and verifiable their projects are. A maintained project with real activity counts for more than a repository that got one push and was never touched again.

**Contributions.** Merged pull requests to other people's open-source projects. This is hard to fake, because someone else had to review and accept the work.

**AI review.** An AI reviewer reads the profile and code and gives an overall assessment. It is one input among four, and it is kept separate from the facts (more on that below).

## What we check before anything is scored

Before a candidate gets a number, groundtruth reads their GitHub directly. Candidates sign in with GitHub, so the account is provably theirs, and then we look at what is really there.

- Whether repositories are original work or just forks
- Whether projects are maintained or abandoned after one push
- Whether the live deployments and links they point to still work
- Whether projects were really shipped: a live deployment, or for tools and apps without a website, a published release with downloadable binaries
- Their commit activity over time

Dead links are flagged in the report, not hidden and not quietly counted as real. The same goes for releases: a release only counts if it is actually there.

## When there is nothing to run

Plenty of good work has no live site and no release: a library, a backend service, a project still in progress. When those proofs of shipping are missing, groundtruth doesn't give up on the repository. It weighs what the code itself shows:

- **Code density.** How much real, substantial code is there, compared with boilerplate and empty scaffolding.
- **Tree structure.** How the project is organised, because a thoughtful layout is hard to fake over a whole codebase.
- **Traces of production practice.** Signs that the project was built to actually run, not just to sit in a folder. Docker setup is the most common example, but this is not a fixed checklist. The system recognises other production signals as it reads each repository.

These are indirect evidence, because nobody can open and run the project to see it working. But they let real work without a public link still count for something.

## What we do with work we can't verify

This one matters, so it gets its own section.

When a repository is private, GitHub returns the same response as it does for a repository that doesn't exist. That is deliberate, and it means there is no way for us to tell the two apart.

So we don't guess. Anything we can't verify contributes **nothing** to the score. It is shown in the report for transparency, but it never moves the number up or down.

That has a cost: a great developer who does most of their work in private repositories can look thinner than they are. We accept that, because the alternative is giving credit for claims nobody can check, which is exactly the problem with resumes.

## Facts and opinions live in different places

Every report separates what we found from what we think about it. The facts are things like repositories, activity and deployments, each with a pointer back to where it came from. The opinions are the interpretation on top.

You can always tell which is which, and no claim in a report exists without a source behind it.

## What the score is not

It is not a verdict, and it does not replace an interview. A high score means the evidence behind a candidate is strong for your role. It does not tell you whether they would be good to work with, or whether they would thrive on your team.

Use the score to decide who deserves your time first. Then read the evidence, and talk to the person.

## See it on your own role

The easiest way to understand the score is to see one. Create a job, share the apply link, and watch the first candidates come in ranked with their evidence.

[Create an account](/login) and try it on a real role.
