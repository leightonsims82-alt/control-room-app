# Base44 Server Function Reference

This file records the server-side Base44 logic that should be considered during the Expo rebuild.

## Functions represented in pasted Base44 code

### 1. Trade performance / Performer of the Month
Purpose:
- Calculate monthly trade performance.
- Exclude held plots.
- Group completed stages by trade.
- Apply qualifying rule: minimum 5 assigned/completed stages.
- Award points for completed stages.
- Add weekend bonus.
- Rank trades by performance, early/on-time/late metrics.
- Identify Performer of the Month.
- Identify Weekend Warrior.
- Identify Most Improved compared with previous month.

Expo rebuild implication:
- Current `getTradePerformance` is only a simplified placeholder.
- It should eventually be replaced with a Base44-style monthly scoring function.
- This can run client-side while local-first, then later move server-side if Supabase or another backend is added.

### 2. Sample plot generation
Purpose:
- Admin-only function.
- Creates sample plots across phases.
- Avoids duplicate plot references.
- Cycles through available house types.
- Generates stages from StageTemplate records.
- Uses working-day calculations.
- Sets one sample plot on hold for testing hold logic.

Expo rebuild implication:
- Create Plot flow should use this as behavioural reference.
- New plots should generate stages from templates.
- Working days should be used instead of plain calendar days.
- Hold logic must be visible in plot/stage views.

### 3. PH1 bulk programme generation
Purpose:
- Admin-only function.
- Deletes existing PH1 plot stages.
- Generates staged programmes in batches.
- Uses a defined stage sequence.
- Staggers start dates across plots.
- Adds delays and inspection statuses to specific examples.
- Marks key stages such as Foundations, Pre Plaster and Pre Handover.

Expo rebuild implication:
- Later add a bulk programme/regenerate programme tool.
- Stage generation must support key stages, delays and inspection status.

### 4. Share token generation
Purpose:
- Generates a secure public share token for an IssuedProgramme.
- Stores shareToken and shareCreatedAt.
- Returns a public programme URL.

Expo rebuild implication:
- Programme sharing should be a later phase.
- For local-first, represent the data model now but do not build real public sharing yet.

### 5. Public programme lookup
Purpose:
- Fetches an issued programme by share token.
- Allows public access to an issued programme snapshot.

Expo rebuild implication:
- Later needs backend support.
- Do not build this fully until a backend exists.

### 6. Supervisor seed data
Purpose:
- Admin-only function.
- Creates realistic supervisors for trades.
- Creates TradeSupervisor assignments.
- Avoids duplicate supervisors and assignments.

Expo rebuild implication:
- Trades screen should eventually show assigned supervisors.
- TradeSupervisor and Supervisor models have already been added to `types/models.ts`.

### 7. Email programme to supervisors
Purpose:
- Sends a grouped 2-week programme email to supervisor emails.
- Includes share link and selected supervisor trades.
- Uses Base44 Core SendEmail integration.

Expo rebuild implication:
- Email/share workflow is a later backend phase.
- Do not build while local-first unless using a placeholder preview.

## Priority conversion order

1. Working-day date helpers.
2. Stage generation from templates.
3. Create Plot flow.
4. Hold and delay workflows.
5. Inspection status workflows.
6. More realistic trade performance logic.
7. Supervisor assignment views.
8. Issued Programme snapshot model.
9. Public share link and email workflow after backend choice.

## Guardrails

- Do not copy Deno/Base44 SDK code directly into Expo.
- Convert business logic into TypeScript utilities.
- Keep local-first architecture until backend is chosen.
- Preserve Base44 terminology and behaviour where practical.
