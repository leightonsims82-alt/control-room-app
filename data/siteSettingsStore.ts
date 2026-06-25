import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { RegulationsJurisdiction } from '../types/models';
import { FoundationType } from '../types/regulations';

const SITE_SETTINGS_KEY = 'siteprog:site-settings:v1';

export const jurisdictionOptions: RegulationsJurisdiction[] = ['England', 'Wales'];

export const foundationTypeOptions: FoundationType[] = [
  'Strip foundation',
  'Trench fill foundation',
  'Raft foundation',
  'Piled foundation',
  'Pier and beam foundation',
  'Engineered fill foundation',
  'Ground improvement foundation',
  'Unknown',
];

export type SiteSettings = {
  siteName: string;
  jurisdiction: RegulationsJurisdiction;
  defaultFoundationType: FoundationType;
};

export const defaultSiteSettings: SiteSettings = {
  siteName: 'Current site',
  jurisdiction: 'England',
  defaultFoundationType: 'Unknown',
};

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSiteSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      try {
        const stored = await AsyncStorage.getItem(SITE_SETTINGS_KEY);
        const parsed = stored ? (JSON.parse(stored) as SiteSettings) : defaultSiteSettings;
        if (mounted) setSettings({ ...defaultSiteSettings, ...parsed });
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  async function saveSettings(update: Partial<SiteSettings>) {
    const nextSettings = { ...settings, ...update };
    setSettings(nextSettings);
    await AsyncStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(nextSettings));
  }

  return { settings, isLoaded, saveSettings };
}
