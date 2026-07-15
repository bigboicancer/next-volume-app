import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing } from '../theme';
import { LibraryTitle } from '../types';
import { kindLabel, nextUnreadVolume, progressOf } from '../utils';
import { ProgressBar } from './ProgressBar';

interface SeriesCardProps {
  title: LibraryTitle;
  width: number;
  onOpen: () => void;
  onMarkNext: () => void;
}

export function SeriesCard({ title, width, onOpen, onMarkNext }: SeriesCardProps) {
  const next = nextUnreadVolume(title);
  const progress = progressOf(title);

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
          {title.readVolumes.length} of {title.totalVolumes} volumes
        </Text>
        <ProgressBar progress={progress} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={next ? `Mark volume ${next} read` : `${title.title} completed`}
          disabled={!next}
          onPress={(event) => {
            event.stopPropagation();
            onMarkNext();
          }}
          style={({ pressed }) => [
            styles.nextButton,
            !next && styles.completeButton,
            pressed && styles.nextPressed,
          ]}
        >
          <Ionicons
            name={next ? 'checkmark-circle-outline' : 'checkmark-circle'}
            size={17}
            color={next ? colors.background : colors.green}
          />
          <Text style={[styles.nextLabel, !next && styles.completeLabel]}>
            {next ? `Finish vol. ${next}` : 'Complete'}
          </Text>
        </Pressable>
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
    fontSize: 12,
    fontWeight: '600',
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
});
