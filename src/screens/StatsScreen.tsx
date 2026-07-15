import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { ProgressBar } from '../components/ProgressBar';
import { colors, radii, spacing } from '../theme';
import { LibraryTitle } from '../types';
import {
  nextUnreadOwnedVolume,
  ownedProgressOf,
  ownedReadCount,
  ownedVolumeCount,
} from '../utils';

interface StatsScreenProps {
  titles: LibraryTitle[];
  onEraseAllData: () => Promise<void> | void;
}

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon:
    | 'checkmark-done'
    | 'albums-outline'
    | 'hourglass-outline'
    | 'library-outline'
    | 'flame-outline';
  value: number;
  label: string;
  tone: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${tone}20` }]}>
        <Ionicons name={icon} size={20} color={tone} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function StatsScreen({ titles, onEraseAllData }: StatsScreenProps) {
  const [eraseConfirmVisible, setEraseConfirmVisible] = useState(false);
  const [erasing, setErasing] = useState(false);
  const [eraseError, setEraseError] = useState('');
  const read = titles.reduce((sum, title) => sum + ownedReadCount(title), 0);
  const owned = titles.reduce((sum, title) => sum + ownedVolumeCount(title), 0);
  const remaining = Math.max(0, owned - read);
  const completed = titles.filter((title) => title.status === 'completed').length;
  const thisWeek = titles.reduce(
    (sum, title) =>
      sum +
      Object.values(title.readDates).filter((timestamp) => Date.now() - timestamp < 604_800_000)
        .length,
    0,
  );
  const overall = owned ? read / owned : 0;
  const manga = titles.filter((title) => title.kind === 'manga');
  const novels = titles.filter((title) => title.kind === 'light-novel');
  const nearlyFinished = [...titles]
    .filter((title) => nextUnreadOwnedVolume(title) && ownedProgressOf(title) >= 0.5)
    .sort((a, b) => ownedProgressOf(b) - ownedProgressOf(a))
    .slice(0, 4);

  function openEraseConfirmation() {
    setEraseError('');
    setEraseConfirmVisible(true);
  }

  function closeEraseConfirmation() {
    if (!erasing) setEraseConfirmVisible(false);
  }

  async function eraseEverything() {
    setErasing(true);
    setEraseError('');
    try {
      await onEraseAllData();
      setEraseConfirmVisible(false);
    } catch {
      setEraseError('Could not erase the saved data. Please try again.');
    } finally {
      setErasing(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
        <Text style={styles.kicker}>THE NUMBERS</Text>
        <Text style={styles.heading}>Reading stats</Text>
        <Text style={styles.subtitle}>Useful context, without turning reading into homework.</Text>

        <LinearGradient colors={['#3A315A', '#1A283B']} style={styles.hero}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroLabel}>OWNED SHELF</Text>
              <Text style={styles.heroValue}>{Math.round(overall * 100)}%</Text>
            </View>
            <View style={styles.heroRing}>
              <Ionicons name="book" size={30} color={colors.accent} />
            </View>
          </View>
          <ProgressBar progress={overall} color={colors.accent} height={10} />
          <Text style={styles.heroCaption}>
            {owned
              ? `${read} of ${owned} owned volumes read`
              : titles.length
                ? 'Mark volumes as owned to measure your shelf.'
                : 'Add a title to begin tracking.'}
          </Text>
        </LinearGradient>

        <View style={styles.statGrid}>
          <StatCard icon="checkmark-done" value={read} label="Owned volumes read" tone={colors.green} />
          <StatCard icon="albums-outline" value={owned} label="Volumes owned" tone={colors.blue} />
          <StatCard
            icon="hourglass-outline"
            value={remaining}
            label="Remaining"
            tone={colors.accent}
          />
          <StatCard
            icon="library-outline"
            value={completed}
            label="Series complete"
            tone={colors.purple}
          />
          <StatCard
            icon="flame-outline"
            value={thisWeek}
            label="Read this week"
            tone={colors.blue}
          />
        </View>

        <Text style={styles.sectionTitle}>Shelf split</Text>
        <View style={styles.splitCard}>
          <View style={styles.splitRow}>
            <View style={[styles.splitIcon, { backgroundColor: colors.purpleSoft }]}>
              <Ionicons name="images-outline" size={21} color={colors.purple} />
            </View>
            <View style={styles.splitCopy}>
              <Text style={styles.splitTitle}>Manga</Text>
              <Text style={styles.splitMeta}>{manga.length} series</Text>
            </View>
            <Text style={styles.splitValue}>
              {manga.reduce((sum, title) => sum + ownedReadCount(title), 0)} owned read
            </Text>
          </View>
          <View style={styles.splitDivider} />
          <View style={styles.splitRow}>
            <View style={[styles.splitIcon, { backgroundColor: colors.blueSoft }]}>
              <Ionicons name="reader-outline" size={21} color={colors.blue} />
            </View>
            <View style={styles.splitCopy}>
              <Text style={styles.splitTitle}>Light novels</Text>
              <Text style={styles.splitMeta}>{novels.length} series</Text>
            </View>
            <Text style={styles.splitValue}>
              {novels.reduce((sum, title) => sum + ownedReadCount(title), 0)} owned read
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Nearly finished</Text>
        {nearlyFinished.length ? (
          <View style={styles.nearlyCard}>
            {nearlyFinished.map((title, index) => {
              const remainingForTitle = ownedVolumeCount(title) - ownedReadCount(title);
              return (
                <View key={title.id}>
                  <View style={styles.nearlyRow}>
                    <View style={styles.nearlyNumber}>
                      <Text style={styles.nearlyNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.nearlyCopy}>
                      <Text style={styles.nearlyTitle} numberOfLines={1}>
                        {title.title}
                      </Text>
                      <ProgressBar progress={ownedProgressOf(title)} height={6} />
                    </View>
                    <Text style={styles.nearlyRemaining}>
                      {remainingForTitle} {remainingForTitle === 1 ? 'left' : 'left'}
                    </Text>
                  </View>
                  {index < nearlyFinished.length - 1 ? <View style={styles.splitDivider} /> : null}
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.noData}>
            <Ionicons name="flag-outline" size={27} color={colors.textDim} />
            <Text style={styles.noDataText}>
              Owned titles over halfway read will appear here.
            </Text>
          </View>
        )}

          <View style={styles.dataSection}>
            <Text style={styles.sectionTitle}>Data & testing</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Erase all app data"
              onPress={openEraseConfirmation}
              style={({ pressed }) => [styles.eraseButton, pressed && styles.pressed]}
            >
              <View style={styles.eraseIcon}>
                <Ionicons name="trash-outline" size={21} color={colors.danger} />
              </View>
              <View style={styles.eraseCopy}>
                <Text style={styles.eraseTitle}>Erase all app data</Text>
                <Text style={styles.eraseDescription}>
                  Clear the shelf, reading progress and saved preferences.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textDim} />
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={eraseConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={closeEraseConfirmation}
      >
        <View style={styles.confirmBackdrop} accessibilityViewIsModal>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeEraseConfirmation} />
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Ionicons name="warning-outline" size={24} color={colors.danger} />
            </View>
            <Text style={styles.confirmTitle}>Erase all app data?</Text>
            <Text style={styles.confirmText}>
              Every series, volume tick, reading date and saved preference on this device will be
              permanently removed. This cannot be undone.
            </Text>
            {eraseError ? <Text style={styles.eraseError}>{eraseError}</Text> : null}
            <View style={styles.confirmActions}>
              <Pressable
                accessibilityRole="button"
                disabled={erasing}
                onPress={closeEraseConfirmation}
                style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Permanently erase all app data"
                disabled={erasing}
                onPress={eraseEverything}
                style={({ pressed }) => [styles.confirmEraseButton, pressed && styles.pressed]}
              >
                {erasing ? (
                  <ActivityIndicator size="small" color={colors.text} />
                ) : (
                  <Ionicons name="trash-outline" size={17} color={colors.text} />
                )}
                <Text style={styles.confirmEraseText}>{erasing ? 'Erasing…' : 'Erase all'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 116,
  },
  page: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  kicker: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  heading: {
    marginTop: 2,
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  subtitle: {
    maxWidth: 500,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  hero: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#443D68',
  },
  heroTop: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  heroValue: {
    marginTop: 2,
    color: colors.text,
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -1.5,
  },
  heroRing: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: 'rgba(255,180,84,0.35)',
    backgroundColor: 'rgba(255,180,84,0.10)',
  },
  heroCaption: {
    marginTop: spacing.md,
    color: colors.textMuted,
    fontSize: 13,
  },
  statGrid: {
    marginBottom: spacing.xxl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    minWidth: '46%',
    flex: 1,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statIcon: {
    width: 38,
    height: 38,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  statValue: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  sectionTitle: {
    marginBottom: spacing.md,
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  splitCard: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  splitRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  splitIcon: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
  },
  splitCopy: {
    flex: 1,
  },
  splitTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  splitMeta: {
    marginTop: 2,
    color: colors.textDim,
    fontSize: 12,
  },
  splitValue: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  splitDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  nearlyCard: {
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  nearlyRow: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  nearlyNumber: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceRaised,
  },
  nearlyNumberText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
  },
  nearlyCopy: {
    flex: 1,
    gap: 7,
  },
  nearlyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  nearlyRemaining: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  noData: {
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  noDataText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  dataSection: {
    marginTop: spacing.xxl,
  },
  eraseButton: {
    minHeight: 88,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.surface,
  },
  eraseIcon: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  eraseCopy: {
    flex: 1,
  },
  eraseTitle: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '900',
  },
  eraseDescription: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.99 }],
  },
  confirmBackdrop: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 440,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.surface,
  },
  confirmIcon: {
    width: 48,
    height: 48,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  confirmText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 19,
  },
  eraseError: {
    marginTop: spacing.md,
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
  },
  confirmActions: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    minHeight: 48,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  cancelText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  confirmEraseButton: {
    minHeight: 48,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
  },
  confirmEraseText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
});
