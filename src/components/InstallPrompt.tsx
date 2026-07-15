import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { INSTALL_PROMPT_DISMISSED_KEY } from '../storage';
import { colors, radii, spacing } from '../theme';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

async function rememberDismissal() {
  try {
    await AsyncStorage.setItem(INSTALL_PROMPT_DISMISSED_KEY, 'true');
  } catch {
    // The prompt can still be hidden for this visit if browser storage is unavailable.
  }
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
  const [preferenceReady, setPreferenceReady] = useState(Platform.OS !== 'web');
  const [showInstructions, setShowInstructions] = useState(false);
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent>();

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    let active = true;

    void AsyncStorage.getItem(INSTALL_PROMPT_DISMISSED_KEY)
      .then((dismissed) => {
        if (active && dismissed === 'true') setHidden(true);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setPreferenceReady(true);
      });

    const captureInstall = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as InstallPromptEvent);
    };
    const finishInstall = () => {
      setHidden(true);
      void rememberDismissal();
    };

    window.addEventListener('beforeinstallprompt', captureInstall);
    window.addEventListener('appinstalled', finishInstall);
    return () => {
      active = false;
      window.removeEventListener('beforeinstallprompt', captureInstall);
      window.removeEventListener('appinstalled', finishInstall);
    };
  }, []);

  if (Platform.OS !== 'web' || hidden || !preferenceReady) return null;

  const isAppleMobile =
    typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

  async function install() {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        setHidden(true);
        void rememberDismissal();
      }
      setInstallEvent(undefined);
      return;
    }

    setShowInstructions((visible) => !visible);
  }

  function dismissForever() {
    setHidden(true);
    void rememberDismissal();
  }

  return (
    <View style={styles.card}>
      <View style={styles.summary}>
        <View style={styles.icon}>
          <Ionicons name="phone-portrait-outline" size={23} color={colors.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>Keep it on your Home Screen</Text>
          <Text style={styles.text}>
            Install once, then open Next Volume like a normal app without your computer.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={dismissForever}
            hitSlop={8}
            style={({ pressed }) => [styles.neverButton, pressed && styles.pressed]}
          >
            <Text style={styles.neverText}>Don’t show again</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            installEvent
              ? 'Install Next Volume'
              : showInstructions
                ? 'Hide Home Screen instructions'
                : 'Show Home Screen instructions'
          }
          onPress={install}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <Text style={styles.buttonText}>
            {installEvent ? 'Install' : showInstructions ? 'Hide' : 'How'}
          </Text>
        </Pressable>
      </View>

      {showInstructions ? (
        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>
            {isAppleMobile ? 'Add it on iPhone or iPad' : 'Add it from your browser'}
          </Text>
          {(isAppleMobile
            ? [
                'Open this page in Safari.',
                'Tap Share — the square with the upward arrow.',
                'Choose “Add to Home Screen”, then tap “Add”.',
              ]
            : [
                'Open your browser menu.',
                'Choose “Install app” or “Add to Home Screen”.',
                'Confirm the installation.',
              ]
          ).map((step, index) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Not now"
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
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#443D68',
    backgroundColor: '#201D32',
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
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
  neverButton: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 2,
  },
  neverText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    textDecorationLine: 'underline',
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
  instructions: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#443D68',
    gap: spacing.sm,
  },
  instructionsTitle: {
    marginBottom: 2,
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  stepNumber: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: 'rgba(255,180,84,0.14)',
  },
  stepNumberText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
  },
  stepText: {
    flex: 1,
    paddingTop: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 17,
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
