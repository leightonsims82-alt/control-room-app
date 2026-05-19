# Base44 SiteProg Parity Target

This document records the Base44 export used as the product blueprint for the Expo React Native rebuild.

## Product direction

The Base44 SiteProg app is the reference product. The Expo app should become the professional Play Store and browser-ready equivalent of this Base44 app.

Do not invent a different product flow unless required for mobile/web compatibility.

## Base44 export structure reviewed

The uploaded Base44 export contains the following key files:

### Pages

- `src/pages/Dashboard.jsx`
- `src/pages/TwoWeekBoard.jsx`
- `src/pages/MasterProgramme.jsx`
- `src/pages/PlotDetail.jsx`
- `src/pages/Plots.jsx`
- `src/pages/PlotTwoWeekView.jsx`
- `src/pages/HouseTypes.jsx`
- `src/pages/TradeProgramme.jsx`
- `src/pages/TradeSettings.jsx`
- `src/pages/SupervisorDashboard.jsx`
- `src/pages/PublicProgrammeView.jsx`
- `src/pages/Settings.jsx`

### Core components

- `src/components/PlotSetupWizard.jsx`
- `src/components/ProgrammeSidePanel.jsx`
- `src/components/HandoverChecklistPanel.jsx`
- `src/components/InspectionPanel.jsx`
- `src/components/ProgrammeSharing.jsx`
- `src/components/TradePerformanceLeaderboard.jsx`
- `src/components/StageTemplateList.jsx`
- `src/components/StageLibrary.jsx`
- `src/components/StageRow.jsx`
- `src/components/PlotForm.jsx`
- `src/components/TradeWorkList.jsx`
- `src/components/PerformerOfTheMonth.jsx`
- `src/components/BedroomFilterBar.jsx`
- `src/components/SiteStatusBadge.jsx`

### Logic and utility files

- `src/lib/scheduleUtils.js`
- `src/lib/keyStages.js`
- `src/lib/stageTradeMapping.js`
- `src/lib/stageColors.js`
- `src/lib/masterStageMap.js`
- `src/lib/plotUtils.js`
- `src/lib/offlineSync.js`
- `src/lib/bedroomTemplates.js`

### Base44 entities

- `base44/entities/HouseType.jsonc`
- `base44/entities/StageTemplate.jsonc`
- `base44/entities/PlotProgramme.jsonc`
- `base44/entities/PlotStage.jsonc`
- `base44/entities/HandoverChecklist.jsonc`
- `base44/entities/HandoverChecklistItem.jsonc`
- `base44/entities/Supervisor.jsonc`
- `base44/entities/TradeSupervisor.jsonc`
- `base44/entities/IssuedProgramme.jsonc`
- `base44/entities/ASMConfig.jsonc`
- `base44/entities/Site.jsonc`
- `base44/entities/User.jsonc`

## Feature areas to replicate first

1. Dashboard layout and data behaviour
2. Plot list and plot detail flow
3. Plot setup wizard / create plot flow
4. Stage template generation
5. Master Programme
6. 2-Week Programme
7. Stage editing, delay, hold and inspection workflows
8. Handover checklist
9. Trade programme and supervisor allocation
10. Programme sharing / issued programme flow

## Important technical direction

The Base44 app is React, Vite, Tailwind and Base44 SDK.

The professional rebuild is Expo React Native and TypeScript.

Therefore, do not copy Base44 files directly into the running Expo app. Convert the behaviour, screen structure, terminology and logic into React Native compatible code.

## Current rebuild status

The Expo app already has:

- Dashboard
- Plots tab
- Plot detail page
- Master Programme
- 2-Week Programme
- Trades
- More
- Stage status controls
- Early local data model
- PR #2 adding AsyncStorage persistence

## Next priority after PR #2

Build the Base44-style create plot flow using `PlotSetupWizard.jsx`, `Plots.jsx`, `StageTemplateList.jsx`, and the StageTemplate entity structure as reference.

This should include:

- New Plot button
- Create plot screen
- Plot name
- Phase
- House type
- Start date
- End date
- Forward/reverse mode
- Stage generation from default templates
- Local persistence through the programme store

## Guardrails

- Preserve current Expo visual direction while moving closer to the Base44 flow.
- Keep app compatible with web and Android.
- Do not add Supabase yet.
- Do not add Stripe yet.
- Do not add login yet.
- Do not add payment logic yet.
- Do not redesign from scratch.
