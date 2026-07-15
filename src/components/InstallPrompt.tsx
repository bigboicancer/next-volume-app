import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function runningStandalone(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return Platform.OS !== 'web';
  const navigatorWithStandalone = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean(navigatorWithStandalone.standalone)
  );
}

export function InstallPrompt() {
  const [hidden, setHidden] = useState(runningStandalone);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent>();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const finishInstall = () => setHidden(true);

    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', finishInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', finishInstall);
    };
  }, []);

  if (Platform.OS !== 'web' || hidden) return null;

  const isAppleMobile =
    typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') setHidden(true);
      setInstallEvent(undefined);
      return;
    }

    Alert.alert(
      'Add Next Volume to your Home Screen',
      isAppleMobile
        ? 'Open this page in Safari, tap the Share button, choose “Add to Home Screen”, then tap Add.'
        : 'Open your browser menu and choose “Install app” or “Add to Home Screen”.',
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.icon}>
        <Ionicons name="phone-portrait-outline" size={23} color={colors.accent} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Keep it on your Home Screen</Text>
        <Text style={styles.text}>
          Install once, then open Next Volume like a normal app without your computer.
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={install}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>{installEvent ? 'Install' : 'How'}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss install reminder"
        onPress={() => setHidden(true)}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}
      >
        <Ionicons name="close" size={17} color={colors.textDim} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    minHeight: 86,
    marginBottom: spacing.lg,
    padding: spacing.md,
    paddingRight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#443D68',
    backgroundColor: '#201D32',
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,180,84,0.11)',
  },
  copy: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  text: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  button: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  buttonText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
  },
  close: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
