import { Stack } from 'expo-router';
import { ProgrammeDataProvider } from '../data/programmeStore';

export default function RootLayout() {
  return (
    <ProgrammeDataProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </ProgrammeDataProvider>
  );
}
