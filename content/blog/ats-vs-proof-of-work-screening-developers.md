---
title: "ATS vs proof-of-work: how to screen developers"
description: "An applicant tracking system sorts resumes. Proof-of-work screening checks the work behind them. Here is what each one catches, what each one misses, and how to use both."
date: 2026-10-09
author: "groundtruth"
---

If you hire developers, you have probably felt this: a role goes live, hundreds of applications arrive, and they all sound the same.

Most teams reach for an applicant tracking system (ATS) to cope. It helps, but it solves a different problem from the one that is actually hurting. Here is the difference between screening with an ATS and screening with proof of work, and when each one is the right tool.

## What an ATS is good at

An ATS is built to manage a pipeline. It collects applications in one place, tracks who is at which stage, schedules interviews and keeps a record for compliance. For a team handling many roles, that organisation is valuable, and nothing in this post argues you should drop it.

Many also rank or filter applicants by matching keywords from the job post against the resume.

That filtering step is where the trouble starts.

## Where an ATS struggles with developers

A keyword match tells you what a resume says, not whether it is true. If the job post asks for React, Node and AWS, a resume that lists React, Node and AWS passes, whether or not the person has ever shipped anything with them.

That was always a weakness. It has become a bigger one now that anyone can paste a job description into an AI tool and get back a polished resume tuned to it. The result is a stack of applications that match the keywords perfectly and look almost identical, so the filter stops separating strong candidates from weak ones.

Meanwhile a genuinely good developer with a plain resume can get filtered out for phrasing their experience differently.

An ATS reads claims. It was never designed to check them.

Here is the problem in its simplest form. Nothing stops me from typing "CEO of OpenAI" or "CEO of SpaceX" on my CV tonight. The ATS would not blink. A keyword filter would note that the right words are present and send me through. You would only find out something was off when we spoke, or when someone went and verified it, and that second step is extra time spent on a person who should never have reached you.

Now imagine hundreds of candidates doing the quieter version of the same thing. Not "CEO of SpaceX", but "led the backend rewrite that cut load times in half". It is the same move, only much harder to catch.

## A story from the other side

Someone I know built a bot that scraped job listings, rewrote his CV to fit each one, and applied automatically. At its peak it was sending around 800 applications a day.

From his side, it made sense. Applying by hand felt like shouting into a void, so he automated the shouting. It is also a clever piece of engineering.

From the hiring side, it is a catastrophe. Every one of those applications arrives tuned to the job post, with the right keywords in the right order. Now multiply that by everyone doing something similar. The inbox fills with applications that are individually convincing and collectively meaningless, and the person reading them can no longer tell effort from automation, or skill from a good prompt.

He was not the villain here. He was responding sensibly to a broken system. But it shows why keyword filters can't survive this: once applying costs nothing, a resume stops being evidence of anything. What is left is the work.

## What proof-of-work screening does differently

Proof-of-work screening starts from the work itself. For developers, the most checkable evidence is their public code, so the question changes from "what does this resume claim?" to "what can we verify?"

In practice that means looking at things like:

- Whether repositories are original work or forks
- Whether projects are maintained or were abandoned after one push
- Whether live deployments and releases actually exist and still work
- Merged contributions to other people's open-source projects
- Consistency of activity over time

Each of these can be checked against something real, which is why a claim like "built and deployed a production app" can be confirmed or flagged instead of taken on trust.

## Side by side

| | ATS | Proof-of-work screening |
| --- | --- | --- |
| Main job | Manage the pipeline | Verify the candidate |
| Works from | The resume and form answers | Real work and activity |
| Strong at | Organisation, tracking, compliance | Telling real from claimed |
| Weak at | Checking whether claims are true | Candidates with little public work |
| Easy to game with AI | Yes | Much harder |

## Where proof of work falls short

It would be dishonest to pretend this approach is perfect.

**Private work is invisible.** Many developers do their best work for employers, in repositories nobody outside can see. Public evidence will understate them, and a good screening tool should treat unverifiable work as unscored, not as a negative.

**Some strong developers have little public code.** That is more common for experienced engineers who spend all their time on closed projects, and for people early in their careers who haven't built much yet.

**It doesn't measure everything.** Communication, collaboration and judgement under pressure don't show up in a repository. Proof of work tells you who is worth a conversation. It doesn't replace the conversation.

## Use both, for different jobs

The better question is not which one to choose, but what each is for.

Keep your ATS for what it does well: managing stages, scheduling and records. Use proof-of-work screening for the step that is currently failing, which is deciding which applicants deserve your attention first.

A simple flow looks like this:

1. Candidates apply and land in your pipeline as usual.
2. Their public work is checked and scored against the specific role.
3. You open the top of the ranked list, read the evidence, and invite the strongest to interview.
4. The interview covers what code can't: how they think, communicate and work with others.

That keeps the human judgement where it matters and removes the guessing from the first filter.

## Try proof-of-work screening on a real role

Groundtruth reads a candidate's GitHub, checks what is actually real, and gives you a ranked report where every line traces back to evidence. Candidates apply with GitHub instead of uploading a resume, and each one is scored against your specific role.

[Create an account](/login) and run it on your next opening.
