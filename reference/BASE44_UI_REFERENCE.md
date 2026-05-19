# Base44 UI Reference

The Base44 export uses web React UI infrastructure that cannot be copied directly into Expo React Native.

## Base44 web stack observed

- `@base44/sdk`
- Radix UI primitives
- shadcn-style components
- Tailwind utility classes
- lucide-react icons
- class-variance-authority
- `cn` helper for class merging

## Components observed

- Accordion
- AlertDialog
- Alert
- Avatar
- Badge
- Breadcrumb
- Button variants

## Expo rebuild implication

These components should not be imported directly into the Expo React Native app.

Instead, the Expo app should recreate the same design language using React Native primitives:

- `View`
- `Text`
- `Pressable`
- `ScrollView`
- `Modal`
- `StyleSheet`
- Expo vector icons

## Design cues to preserve

- Rounded cards
- Strong badge styling
- Clean status pills
- Clear destructive/warning states
- Professional alert cards
- Simple section hierarchy
- Compact, readable programme rows
- Consistent spacing and borders

## Guardrail

Do not add Radix UI, Tailwind, shadcn, lucide-react or Base44 SDK to the Expo app unless a future web-specific strategy requires it.

For now, keep the Expo app native-compatible and recreate the look using React Native components.