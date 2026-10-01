import { Stack } from 'expo-router';
import { PropsWithChildren, useEffect, useState } from 'react';
import { AutoCloudBackup } from '../components/AutoCloudBackup';
import { ProgrammeDataProvider } from '../data/programmeStore';
import { SitePlannerProvider } from '../data/sitePlannerStore';
import { clearExistingProgrammeDatesOnce } from '../utils/programmeDateReset';

function ProgrammeDateResetGate({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    clearExistingProgrammeDatesOnce()
      .catch((error) => console.warn('Unable to clear existing programme dates', error))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <ProgrammeDateResetGate>
      <ProgrammeDataProvider>
        <SitePlannerProvider>
          <AutoCloudBackup />
          <Stack screenOptions={{ headerShown: false }} />
        </SitePlannerProvider>
      </ProgrammeDataProvider>
    </ProgrammeDateResetGate>
  );
}
