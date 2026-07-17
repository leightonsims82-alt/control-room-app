import { Stack } from 'expo-router';
import { ProgrammeDataProvider } from '../data/programmeStore';
import { QADataProvider } from '../data/qaStore';
import { SitePlannerProvider } from '../data/sitePlannerStore';

export default function RootLayout() {
  return (
    <ProgrammeDataProvider>
      <SitePlannerProvider>
        <QADataProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </QADataProvider>
      </SitePlannerProvider>
    </ProgrammeDataProvider>
  );
}
