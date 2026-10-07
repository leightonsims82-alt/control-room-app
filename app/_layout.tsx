import { Stack } from 'expo-router';
import { AutoCloudBackup } from '../components/AutoCloudBackup';
import { ProgrammeDataProvider } from '../data/programmeStore';
import { SitePlannerProvider } from '../data/sitePlannerStore';

export default function RootLayout() {
  return (
    <SitePlannerProvider>
      <ProgrammeDataProvider>
        <AutoCloudBackup />
        <Stack screenOptions={{ headerShown: false }} />
      </ProgrammeDataProvider>
    </SitePlannerProvider>
  );
}
