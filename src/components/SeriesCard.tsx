import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing } from '../theme';
import { LibraryTitle } from '../types';
import {
  completionMethodOf,
  nextUnreadOwnedVolume,
  nextUnreadUnownedVolume,
  onlineReadVolumesOf,
  ownedVolumeCount,
  progressOf,
  totalReadCount,
} from '../utils';
import { ProgressBar } from './ProgressBar';

interface SeriesCardProps {
  title: LibraryTitle;
  width: number;
  onOpen: () => void;
  onMarkNext: () => void;
  onMarkNextOnline: () => void;
}

export function SeriesCard({
  title,
  width,
  onOpen,
  onMarkNext,
  onMarkNextOnline,
}: SeriesCardProps) {
  const next = nextUnreadOwnedVolume(title);
  const nextOnline = nextUnreadUnownedVolume(title);
  const progress = progressOf(title);
  const onlineCount = onlineReadVolumesOf(title).length;
  const ownedCount = ownedVolumeCount(title);
  const completionMethod = completionMethodOf(title);
  const completedOnline = completionMethod === 'online';
  const completedMixed = completionMethod === 'mixed';
  const onlineOnlyNext = ownedCount === 0 && Boolean(nextOnline);
  const caughtUpWithOwned = ownedCount > 0 && !next && Boolean(nextOnline);
  const stackCaughtUpActions = width < 230;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${title.title}`}
      onPress={onOpen}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
    >
      <View style={styles.coverWrap}>
        {title.coverUrl ? (
          <Image source={{ uri: title.coverUrl }} style={styles.cover} resizeMode="cover" />
        ) : (
          <View style={[styles.cover, styles.fallback]}>
            <Ionicons name="book-outline" size={34} color={colors.textDim} />
          </View>
        )}
        <View style={styles.kindBadge}>
          <Text style={styles.kindText}>{title.kind === 'manga' ? 'MANGA' : 'NOVEL'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title.title}
        </Text>
        <Text style={styles.meta}>
          {totalReadCount(title)} read
          {onlineCount ? ` · ${onlineCount} online` : ''} · {ownedCount} owned
        </Text>
        <ProgressBar progress={progress} />

        {caughtUpWithOwned ? (
          <View style={[styles.caughtUpActions, stackCaughtUpActions && styles.caughtUpActionsStacked]}>
            <View
              style={[
                styles.nextButton,
                styles.splitButton,
                styles.caughtUpButton,
                stackCaughtUpActions && styles.stackedButton,
              ]}
            >
              <Ionicons name="albums-outline" size={15} color={colors.accent} />
              <Text
                style={[
                  styles.nextLabel,
                  styles.caughtUpLabel,
                  stackCaughtUpActions && styles.stackedLabel,
                ]}
                numberOfLines={stackCaughtUpActions ? 1 : 2}
              >
                Owned caught up
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Mark volume ${nextOnline} read online`}
              onPress={(event) => {
                event.stopPropagation();
                onMarkNextOnline();
              }}
              style={({ pressed }) => [
                styles.nextButton,
                styles.splitButton,
                styles.readOnlineButton,
                stackCaughtUpActions && styles.stackedButton,
                pressed && styles.nextPressed,
              ]}
            >
              <Ionicons name="globe-outline" size={15} color={colors.blue} />
              <Text
                style={[
                  styles.nextLabel,
                  styles.readOnlineLabel,
                  stackCaughtUpActions && styles.stackedLabel,
                ]}
                numberOfLines={stackCaughtUpActions ? 1 : 2}
              >
                Read next online
              </Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              next
                ? `Mark volume ${next} read`
                : onlineOnlyNext
                  ? `Mark volume ${nextOnline} read online`
                  : `${title.title} completed`
            }
            disabled={!next && !onlineOnlyNext}
            onPress={(event) => {
              event.stopPropagation();
              if (next) onMarkNext();
              else if (onlineOnlyNext) onMarkNextOnline();
            }}
            style={({ pressed }) => [
              styles.nextButton,
              !next && !onlineOnlyNext && styles.completeButton,
              completedOnline && styles.onlineCompleteButton,
              completedMixed && styles.mixedCompleteButton,
              onlineOnlyNext && styles.readOnlineButton,
              pressed && styles.nextPressed,
            ]}
          >
            <Ionicons
              name={
                next
                  ? 'checkmark-circle-outline'
                  : onlineOnlyNext || completedOnline
                    ? 'globe-outline'
                    : completedMixed
                      ? 'git-merge-outline'
                      : 'checkmark-circle'
              }
              size={17}
              color={
                next
                  ? colors.background
                  : onlineOnlyNext || completedOnline
                    ? colors.blue
                    : completedMixed
                      ? colors.purple
                      : colors.green
              }
            />
            <Text
              style={[
                styles.nextLabel,
                !next && !onlineOnlyNext && styles.completeLabel,
                completedOnline && styles.onlineCompleteLabel,
                completedMixed && styles.mixedCompleteLabel,
                onlineOnlyNext && styles.readOnlineLabel,
              ]}
            >
              {next
                ? `Finish vol. ${next}`
                : onlineOnlyNext
                  ? 'Read next online'
                  : completedOnline
                    ? 'Completed online'
                    : completedMixed
                      ? 'Complete · mixed'
                      : 'Complete'}
            </Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.988 }],
  },
  coverWrap: {
    position: 'relative',
    width: '100%',
    aspectRatio: 0.7,
    backgroundColor: colors.surfaceRaised,
  },
  cover: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  kindBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(11,14,20,0.84)',
  },
  kindText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  content: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  title: {
    minHeight: 40,
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    lineHeight: 20,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 15,
  },
  nextButton: {
    minHeight: 36,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  completeButton: {
    borderWidth: 1,
    borderColor: colors.greenSoft,
    backgroundColor: colors.greenSoft,
  },
  onlineCompleteButton: {
    borderColor: colors.blueSoft,
    backgroundColor: colors.blueSoft,
  },
  mixedCompleteButton: {
    borderColor: colors.purpleSoft,
    backgroundColor: colors.purpleSoft,
  },
  caughtUpButton: {
    borderColor: '#493E2D',
    backgroundColor: '#312A22',
  },
  caughtUpActions: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: 6,
  },
  caughtUpActionsStacked: {
    flexDirection: 'column',
  },
  splitButton: {
    minWidth: 0,
    marginTop: 0,
    paddingHorizontal: 5,
    flex: 1,
  },
  stackedButton: {
    width: '100%',
    flexGrow: 0,
    flexBasis: 'auto',
  },
  readOnlineButton: {
    borderWidth: 1,
    borderColor: colors.blueSoft,
    backgroundColor: colors.blueSoft,
  },
  nextPressed: {
    opacity: 0.75,
  },
  nextLabel: {
    color: colors.background,
    fontSize: 12,
    fontWeight: '900',
  },
  completeLabel: {
    color: colors.green,
  },
  onlineCompleteLabel: {
    color: colors.blue,
  },
  mixedCompleteLabel: {
    color: colors.purple,
  },
  caughtUpLabel: {
    color: colors.accent,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  readOnlineLabel: {
    color: colors.blue,
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  stackedLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
});
