import { Stack } from 'expo-router';
import { AutoCloudBackup } from '../components/AutoCloudBackup';
import { ProgrammeDataProvider } from '../data/programmeStore';
import { SitePlannerProvider } from '../data/sitePlannerStore';

export default function RootLayout() {
  return (
    <ProgrammeDataProvider>
      <SitePlannerProvider>
        <AutoCloudBackup />
        <Stack screenOptions={{ headerShown: false }} />
      </SitePlannerProvider>
    </ProgrammeDataProvider>
  );
}
