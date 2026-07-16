import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { refreshVolumeCounts } from '../services/catalog';
import { colors, radii, spacing } from '../theme';
import { LibraryTitle } from '../types';
import {
  formatShortDate,
  isCompletedOnline,
  kindLabel,
  nextUnreadOwnedVolume,
  nextUnreadUnownedVolume,
  ownedVolumeCount,
  ownedVolumeNumbersOf,
  onlineReadVolumesOf,
  progressOf,
  rangeThrough,
  statusLabel,
  totalReadCount,
} from '../utils';

interface SeriesScreenProps {
  title: LibraryTitle;
  onBack: () => void;
  onEdit: () => void;
  onToggleVolume: (volume: number) => void;
  onToggleOwnedVolume: (volume: number) => void;
  onToggleOnlineVolume: (volume: number) => void;
  onUpdate: (update: Partial<LibraryTitle>) => void;
}

export function SeriesScreen({
  title,
  onBack,
  onEdit,
  onToggleVolume,
  onToggleOwnedVolume,
  onToggleOnlineVolume,
  onUpdate,
}: SeriesScreenProps) {
  const { width } = useWindowDimensions();
  const compactVolumeHeader = width < 560;
  const [refreshing, setRefreshing] = useState(false);
  const [volumeMode, setVolumeMode] = useState<'read' | 'owned' | 'online'>('read');
  const progress = progressOf(title);
  const next = nextUnreadOwnedVolume(title);
  const nextOnline = nextUnreadUnownedVolume(title);
  const readSet = new Set(title.readVolumes);
  const ownedSet = new Set(ownedVolumeNumbersOf(title));
  const onlineSet = new Set(onlineReadVolumesOf(title));
  const ownedCount = ownedVolumeCount(title);
  const onlineCount = onlineSet.size;
  const readCount = totalReadCount(title);
  const completedOnline = isCompletedOnline(title);

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const lookup = await refreshVolumeCounts({
        sourceId: title.sourceId || '',
        title: title.title,
        originalVolumes: title.onlineOriginalVolumes,
        kind: title.kind,
        sourceType: kindLabel(title.kind),
        publishing: Boolean(title.publishing),
        statusLabel: '',
      });
      const preferred =
        title.edition === 'english' ? lookup.englishEstimate : lookup.originalVolumes;
      const nextTotal = Math.max(title.totalVolumes, preferred || 0);
      onUpdate({
        totalVolumes: nextTotal,
        onlineEnglishVolumes: lookup.englishEstimate,
        onlineOriginalVolumes: lookup.originalVolumes,
        lastCheckedAt: lookup.checkedAt,
      });

      if (preferred && preferred > title.totalVolumes) {
        Alert.alert(
          'New volumes found',
          `${title.title} has been expanded from ${title.totalVolumes} to ${preferred} total volumes to read.`,
        );
      } else if (preferred) {
        Alert.alert('Already current', `The online count still shows ${preferred} volumes.`);
      } else {
        Alert.alert(
          'No reliable count found',
          'This often happens with ongoing series. Your manually chosen count has been kept.',
        );
      }
    } catch {
      Alert.alert('Could not refresh', 'Check your connection and try again in a moment.');
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to shelf"
          onPress={onBack}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          Series details
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit title"
          onPress={onEdit}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Ionicons name="ellipsis-horizontal" size={23} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.page}>
          <LinearGradient colors={['#302949', '#192435', '#111923']} style={styles.hero}>
            <View style={styles.heroGlow} />
            {title.coverUrl ? (
              <Image source={{ uri: title.coverUrl }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Ionicons name="book-outline" size={50} color={colors.textDim} />
              </View>
            )}
            <View style={styles.heroCopy}>
              <View style={styles.badges}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{kindLabel(title.kind).toUpperCase()}</Text>
                </View>
                <View style={[styles.badge, styles.statusBadge]}>
                  <Text style={[styles.badgeText, styles.statusBadgeText]}>
                    {completedOnline ? 'COMPLETED ONLINE' : statusLabel(title.status).toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.title}>{title.title}</Text>
              {title.alternativeTitle ? (
                <Text style={styles.altTitle} numberOfLines={2}>
                  {title.alternativeTitle}
                </Text>
              ) : null}
              <View style={styles.heroProgressRow}>
                <Text style={styles.heroProgress}>{Math.round(progress * 100)}%</Text>
                <Text style={styles.heroProgressMeta}>
                  {readCount} / {title.totalVolumes} volumes
                </Text>
              </View>
              <Text style={styles.heroOwnership}>
                {ownedCount} owned{onlineCount ? ` · ${onlineCount} read online` : ''} ·{' '}
                {title.totalVolumes} total to read
              </Text>
              <ProgressBar progress={progress} color={colors.accent} height={9} />
            </View>
          </LinearGradient>

          {next ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => onToggleVolume(next)}
              style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}
            >
              <View style={styles.nextButtonIcon}>
                <Ionicons name="checkmark" size={20} color={colors.background} />
              </View>
              <View style={styles.nextButtonCopy}>
                <Text style={styles.nextButtonTitle}>Mark volume {next} read</Text>
                <Text style={styles.nextButtonText}>One tap, then the next volume is queued.</Text>
              </View>
              <Ionicons name="chevron-forward" size={21} color={colors.background} />
            </Pressable>
          ) : nextOnline && ownedCount === 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mark volume ${nextOnline} read online`}
              onPress={() => onToggleOnlineVolume(nextOnline)}
              style={({ pressed }) => [styles.onlineNextButton, pressed && styles.pressed]}
            >
              <View style={styles.onlineNextIcon}>
                <Ionicons name="globe-outline" size={21} color={colors.blue} />
              </View>
              <View style={styles.nextButtonCopy}>
                <Text style={styles.onlineNextTitle}>Read next online</Text>
                <Text style={styles.onlineNextText}>Mark volume {nextOnline} as read online.</Text>
              </View>
              <Ionicons name="chevron-forward" size={21} color={colors.blue} />
            </Pressable>
          ) : nextOnline ? (
            <View style={styles.caughtUpGroup}>
              <View style={[styles.ownedCaughtUpBanner, styles.groupedCaughtUpBanner]}>
                <Ionicons name="albums-outline" size={29} color={colors.accent} />
                <View style={styles.caughtUpCopy}>
                  <Text style={styles.ownedCaughtUpTitle}>Owned volumes caught up</Text>
                  <Text style={styles.ownedCaughtUpText}>
                    Every owned volume is read. Volume {nextOnline} is next and unowned.
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Mark volume ${nextOnline} read online`}
                onPress={() => onToggleOnlineVolume(nextOnline)}
                style={({ pressed }) => [
                  styles.onlineNextButton,
                  styles.groupedOnlineNextButton,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.onlineNextIcon}>
                  <Ionicons name="globe-outline" size={21} color={colors.blue} />
                </View>
                <View style={styles.nextButtonCopy}>
                  <Text style={styles.onlineNextTitle}>Read next online</Text>
                  <Text style={styles.onlineNextText}>Mark volume {nextOnline} as read online.</Text>
                </View>
                <Ionicons name="chevron-forward" size={21} color={colors.blue} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.finishedBanner}>
              <Ionicons name="checkmark-done-circle" size={30} color={colors.green} />
              <View>
                <Text style={styles.finishedTitle}>All caught up</Text>
                <Text style={styles.finishedText}>
                  {completedOnline
                    ? `Every volume is read, including ${onlineCount} read online.`
                    : 'Every tracked volume is marked read.'}
                </Text>
              </View>
            </View>
          )}

          {title.description ? (
            <View style={styles.aboutSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutText}>{title.description}</Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.sectionHeader, compactVolumeHeader && styles.sectionHeaderCompact]}>
            <View style={styles.sectionHeaderCopy}>
              <Text style={styles.sectionTitle}>Volumes</Text>
              <Text style={styles.sectionHint}>
                {volumeMode === 'read'
                  ? 'Only owned volumes can be marked read.'
                  : volumeMode === 'owned'
                    ? 'Tap any volume to add or remove it from your collection.'
                    : 'Only unowned volumes can be marked as read online.'}
              </Text>
            </View>
            <View
              style={[
                styles.volumeModeControl,
                compactVolumeHeader && styles.volumeModeControlCompact,
              ]}
              accessibilityRole="tablist"
            >
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: volumeMode === 'read' }}
                onPress={() => setVolumeMode('read')}
                style={[
                  styles.volumeModeButton,
                  compactVolumeHeader && styles.volumeModeButtonCompact,
                  volumeMode === 'read' && styles.volumeModeSelected,
                ]}
              >
                <Text style={[styles.volumeModeText, volumeMode === 'read' && styles.volumeModeTextSelected]}>
                  Read
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: volumeMode === 'owned' }}
                onPress={() => setVolumeMode('owned')}
                style={[
                  styles.volumeModeButton,
                  compactVolumeHeader && styles.volumeModeButtonCompact,
                  volumeMode === 'owned' && styles.volumeModeSelected,
                ]}
              >
                <Text style={[styles.volumeModeText, volumeMode === 'owned' && styles.volumeModeTextSelected]}>
                  Owned
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: volumeMode === 'online' }}
                onPress={() => setVolumeMode('online')}
                style={[
                  styles.volumeModeButton,
                  compactVolumeHeader && styles.volumeModeButtonCompact,
                  volumeMode === 'online' && styles.volumeModeSelected,
                ]}
              >
                <Text
                  style={[
                    styles.volumeModeText,
                    volumeMode === 'online' && styles.volumeModeTextSelected,
                  ]}
                >
                  Online
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.volumeGrid}>
            {rangeThrough(title.totalVolumes).map((volume) => {
              const read = readSet.has(volume);
              const owned = ownedSet.has(volume);
              const online = onlineSet.has(volume);
              const selected = volumeMode === 'read' ? read : volumeMode === 'owned' ? owned : online;
              return (
                <Pressable
                  key={volume}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Volume ${volume}, ${read ? 'read' : 'not normally read'}, ${online ? 'read online' : 'not read online'}, ${owned ? 'owned' : 'not owned'}`}
                  onPress={() => {
                    if (volumeMode === 'read' && !owned) {
                      Alert.alert(
                        'You do not own this volume',
                        `Mark volume ${volume} as owned before marking it read.`,
                      );
                      return;
                    }
                    if (volumeMode === 'owned' && owned && read) {
                      Alert.alert(
                        'This volume is marked read',
                        `Mark volume ${volume} unread before removing it from ownership.`,
                      );
                      return;
                    }
                    if (volumeMode === 'online' && owned) {
                      Alert.alert(
                        'This volume is owned',
                        `Use the Read tab to mark owned volume ${volume} as read.`,
                      );
                      return;
                    }
                    if (volumeMode === 'owned' && !owned && online) {
                      Alert.alert(
                        'Move this read to owned?',
                        `Volume ${volume} is marked as read online. Adding it to your collection will convert it to an owned, normally read volume.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Move to owned', onPress: () => onToggleOwnedVolume(volume) },
                        ],
                      );
                      return;
                    }
                    if (volumeMode === 'read') onToggleVolume(volume);
                    else if (volumeMode === 'owned') onToggleOwnedVolume(volume);
                    else onToggleOnlineVolume(volume);
                  }}
                  style={({ pressed }) => [
                    styles.volume,
                    volumeMode === 'read' && !owned && !read && styles.volumeUnowned,
                    volumeMode === 'read' && read && styles.volumeRead,
                    volumeMode === 'owned' && !owned && styles.volumeUnowned,
                    volumeMode === 'owned' && owned && styles.volumeOwned,
                    volumeMode === 'online' && owned && styles.volumeUnavailableOnline,
                    volumeMode === 'online' && !owned && !online && styles.volumeUnowned,
                    volumeMode === 'online' && online && styles.volumeOnline,
                    pressed && styles.volumePressed,
                  ]}
                >
                  {selected ? (
                    <Ionicons
                      name={volumeMode === 'online' ? 'globe-outline' : 'checkmark'}
                      size={17}
                      color={colors.background}
                    />
                  ) : (
                    <Text style={[styles.volumeText, !owned && styles.volumeTextUnowned]}>
                      {volume}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Volume information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="albums-outline" size={19} color={colors.accent} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoTitle}>Volumes owned</Text>
                <Text style={styles.infoText}>
                  {ownedCount} of {title.totalVolumes} total volumes
                </Text>
              </View>
            </View>
            {onlineCount ? (
              <>
                <View style={styles.infoDivider} />
                <View style={styles.infoRow}>
                  <View style={[styles.infoIcon, styles.onlineInfoIcon]}>
                    <Ionicons name="globe-outline" size={19} color={colors.blue} />
                  </View>
                  <View style={styles.infoCopy}>
                    <Text style={styles.infoTitle}>Volumes read online</Text>
                    <Text style={styles.infoText}>
                      {onlineCount} unowned {onlineCount === 1 ? 'volume' : 'volumes'}
                    </Text>
                  </View>
                </View>
              </>
            ) : null}
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="language-outline" size={19} color={colors.blue} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoTitle}>Edition tracked</Text>
                <Text style={styles.infoText}>
                  {title.edition === 'english' ? 'English releases' : 'Original/Japanese releases'}
                </Text>
              </View>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name="cloud-done-outline" size={19} color={colors.green} />
              </View>
              <View style={styles.infoCopy}>
                <Text style={styles.infoTitle}>Last checked online</Text>
                <Text style={styles.infoText}>{formatShortDate(title.lastCheckedAt)}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={refreshing}
                onPress={refresh}
                style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <>
                    <Ionicons name="refresh" size={16} color={colors.accent} />
                    <Text style={styles.refreshLabel}>Refresh</Text>
                  </>
                )}
              </Pressable>
            </View>
            {title.publishing ? (
              <View style={styles.ongoingNote}>
                <Ionicons name="information-circle-outline" size={18} color={colors.accent} />
                <Text style={styles.ongoingText}>
                  This series is ongoing. Online databases may lag, so your manual count is never
                  reduced during refresh.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    height: 62,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  topTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  page: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    padding: spacing.xl,
  },
  hero: {
    minHeight: 250,
    padding: spacing.xl,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#423A5F',
  },
  heroGlow: {
    position: 'absolute',
    width: 240,
    height: 240,
    top: -110,
    right: -70,
    borderRadius: radii.round,
    backgroundColor: 'rgba(139,124,255,0.13)',
  },
  cover: {
    width: 128,
    height: 184,
    alignSelf: 'center',
    zIndex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCopy: {
    flex: 1,
    zIndex: 1,
    paddingLeft: spacing.xl,
    justifyContent: 'center',
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  badge: {
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.purpleSoft,
  },
  statusBadge: {
    backgroundColor: colors.greenSoft,
  },
  badgeText: {
    color: colors.purple,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  statusBadgeText: {
    color: colors.green,
  },
  title: {
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
    letterSpacing: -0.8,
  },
  altTitle: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  heroProgressRow: {
    marginTop: spacing.lg,
    marginBottom: 2,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  heroProgress: {
    color: colors.accent,
    fontSize: 19,
    fontWeight: '900',
  },
  heroProgressMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  heroOwnership: {
    marginBottom: 7,
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
  },
  nextButton: {
    minHeight: 76,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.accent,
  },
  nextButtonIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: 'rgba(11,14,20,0.14)',
  },
  nextButtonCopy: {
    flex: 1,
  },
  nextButtonTitle: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '900',
  },
  nextButtonText: {
    marginTop: 2,
    color: '#493216',
    fontSize: 11,
    fontWeight: '600',
  },
  finishedBanner: {
    minHeight: 76,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.greenSoft,
    backgroundColor: '#10251F',
  },
  ownedCaughtUpBanner: {
    minHeight: 76,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: '#493E2D',
    backgroundColor: '#2E281F',
  },
  caughtUpGroup: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  groupedCaughtUpBanner: {
    marginTop: 0,
    marginBottom: 0,
  },
  caughtUpCopy: {
    flex: 1,
  },
  ownedCaughtUpTitle: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  ownedCaughtUpText: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  onlineNextButton: {
    minHeight: 76,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.blueSoft,
    backgroundColor: colors.blueSoft,
  },
  groupedOnlineNextButton: {
    marginTop: 0,
    marginBottom: 0,
  },
  onlineNextIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.surface,
  },
  onlineNextTitle: {
    color: colors.blue,
    fontSize: 16,
    fontWeight: '900',
  },
  onlineNextText: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  finishedTitle: {
    color: colors.green,
    fontSize: 16,
    fontWeight: '900',
  },
  finishedText: {
    marginTop: 2,
    color: colors.textMuted,
    fontSize: 11,
  },
  sectionHeader: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  aboutSection: {
    marginBottom: spacing.xxl,
  },
  aboutCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  aboutText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  sectionHeaderCompact: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  sectionHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 21,
    fontWeight: '900',
  },
  sectionHint: {
    marginTop: 3,
    color: colors.textDim,
    fontSize: 12,
  },
  volumeModeControl: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  volumeModeControlCompact: {
    width: '100%',
  },
  volumeModeButton: {
    minHeight: 34,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  volumeModeButtonCompact: {
    flex: 1,
  },
  volumeModeSelected: {
    backgroundColor: colors.surfaceRaised,
  },
  volumeModeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  volumeModeTextSelected: {
    color: colors.accent,
  },
  volumeGrid: {
    marginBottom: spacing.xxxl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  volume: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  volumeRead: {
    borderColor: colors.green,
    backgroundColor: colors.green,
  },
  volumeOwned: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  volumeOnline: {
    borderColor: colors.blue,
    backgroundColor: colors.blue,
  },
  volumeUnavailableOnline: {
    opacity: 0.42,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.backgroundRaised,
  },
  volumeUnowned: {
    opacity: 0.48,
    borderStyle: 'dashed',
    backgroundColor: colors.backgroundRaised,
  },
  volumePressed: {
    opacity: 0.68,
    transform: [{ scale: 0.94 }],
  },
  volumeText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
  },
  volumeTextUnowned: {
    color: colors.textDim,
  },
  infoCard: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  infoRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoIcon: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  onlineInfoIcon: {
    backgroundColor: colors.blueSoft,
  },
  infoCopy: {
    flex: 1,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  infoText: {
    marginTop: 2,
    color: colors.textDim,
    fontSize: 11,
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  refreshButton: {
    minWidth: 78,
    minHeight: 36,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radii.md,
    backgroundColor: '#312A22',
  },
  refreshLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  ongoingNote: {
    marginBottom: spacing.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#2E281F',
  },
  ongoingText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
});
