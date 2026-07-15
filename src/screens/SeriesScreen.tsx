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
  View,
} from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { refreshVolumeCounts } from '../services/catalog';
import { colors, radii, spacing } from '../theme';
import { LibraryTitle } from '../types';
import {
  formatShortDate,
  kindLabel,
  nextUnreadVolume,
  progressOf,
  rangeThrough,
  statusLabel,
} from '../utils';

interface SeriesScreenProps {
  title: LibraryTitle;
  onBack: () => void;
  onEdit: () => void;
  onToggleVolume: (volume: number) => void;
  onUpdate: (update: Partial<LibraryTitle>) => void;
}

export function SeriesScreen({
  title,
  onBack,
  onEdit,
  onToggleVolume,
  onUpdate,
}: SeriesScreenProps) {
  const [refreshing, setRefreshing] = useState(false);
  const progress = progressOf(title);
  const next = nextUnreadVolume(title);
  const readSet = new Set(title.readVolumes);

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
          `${title.title} has been expanded from ${title.totalVolumes} to ${preferred} tracked volumes.`,
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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
                    {statusLabel(title.status).toUpperCase()}
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
                  {title.readVolumes.length} / {title.totalVolumes} volumes
                </Text>
              </View>
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
          ) : (
            <View style={styles.finishedBanner}>
              <Ionicons name="checkmark-done-circle" size={30} color={colors.green} />
              <View>
                <Text style={styles.finishedTitle}>All caught up</Text>
                <Text style={styles.finishedText}>Every tracked volume is marked read.</Text>
              </View>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Volumes</Text>
              <Text style={styles.sectionHint}>Tap any volume to change it.</Text>
            </View>
            <View style={styles.legend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Read</Text>
            </View>
          </View>

          <View style={styles.volumeGrid}>
            {rangeThrough(title.totalVolumes).map((volume) => {
              const read = readSet.has(volume);
              return (
                <Pressable
                  key={volume}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: read }}
                  accessibilityLabel={`Volume ${volume}`}
                  onPress={() => onToggleVolume(volume)}
                  style={({ pressed }) => [
                    styles.volume,
                    read && styles.volumeRead,
                    pressed && styles.volumePressed,
                  ]}
                >
                  {read ? (
                    <Ionicons name="checkmark" size={17} color={colors.background} />
                  ) : (
                    <Text style={styles.volumeText}>{volume}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Volume information</Text>
          <View style={styles.infoCard}>
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
    marginBottom: 7,
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
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: radii.round,
    backgroundColor: colors.green,
  },
  legendText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
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
  volumePressed: {
    opacity: 0.68,
    transform: [{ scale: 0.94 }],
  },
  volumeText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '800',
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
