import { Stack } from 'expo-router';
import { ProgrammeDataProvider } from '../data/programmeStore';
import { SitePlannerProvider } from '../data/sitePlannerStore';

export default function RootLayout() {
  return (
    <ProgrammeDataProvider>
      <SitePlannerProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SitePlannerProvider>
    </ProgrammeDataProvider>
  );
}
