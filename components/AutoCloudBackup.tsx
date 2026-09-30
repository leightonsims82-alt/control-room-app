import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { backupProgrammeData, getBackupStatus } from '../lib/cloudBackup';

const BACKUP_INTERVAL_MS = 15 * 60 * 1000;
const STARTUP_DELAY_MS = 5000;

export function AutoCloudBackup() {
  const runningRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    const runBackup = async () => {
      if (!mounted || runningRef.current) return;
      runningRef.current = true;
      try {
        const status = await getBackupStatus();
        if (!status.signedIn) return;
        await backupProgrammeData();
      } catch {
        // Automatic backup is intentionally silent. The Account & Backup
        // screen remains the place to surface connection or authentication errors.
      } finally {
        runningRef.current = false;
      }
    };

    const startupTimer = setTimeout(() => {
      runBackup().catch(() => undefined);
    }, STARTUP_DELAY_MS);

    const interval = setInterval(() => {
      runBackup().catch(() => undefined);
    }, BACKUP_INTERVAL_MS);

    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') runBackup().catch(() => undefined);
    };

    const subscription = AppState.addEventListener('change', onAppStateChange);

    return () => {
      mounted = false;
      clearTimeout(startupTimer);
      clearInterval(interval);
      subscription.remove();
    };
  }, []);

  return null;
}
