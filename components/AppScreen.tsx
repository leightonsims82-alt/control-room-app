import { ReactNode } from 'react';
import { router, usePathname } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AppScreen({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const showBackButton = pathname !== '/';

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.maxWidth}>
          {showBackButton ? (
            <Pressable style={styles.backButton} onPress={goBack}>
              <Text style={styles.backButtonText}>← Back</Text>
            </Pressable>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 18,
    paddingBottom: 96,
  },
  maxWidth: {
    width: '100%',
    maxWidth: 1100,
    alignSelf: 'center',
    gap: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#0f172a',
    fontWeight: '900',
    fontSize: 13,
  },
});
