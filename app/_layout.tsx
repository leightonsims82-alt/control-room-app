import { Stack } from 'expo-router';
import { PropsWithChildren, useEffect, useState } from 'react';
import { AutoCloudBackup } from '../components/AutoCloudBackup';
import { ProgrammeDataProvider } from '../data/programmeStore';
import { SitePlannerProvider } from '../data/sitePlannerStore';
import { clearExistingPlotDataOnce } from '../utils/programmeDateReset';

function PlotDataResetGate({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    clearExistingPlotDataOnce()
      .catch((error) => console.warn('Unable to clear existing plot data', error))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <PlotDataResetGate>
      <ProgrammeDataProvider>
        <SitePlannerProvider>
          <AutoCloudBackup />
          <Stack screenOptions={{ headerShown: false }} />
        </SitePlannerProvider>
      </ProgrammeDataProvider>
    </PlotDataResetGate>
  );
}
