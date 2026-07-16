import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { FilterChip } from '../components/FilterChip';
import { InstallPrompt } from '../components/InstallPrompt';
import { ProgressBar } from '../components/ProgressBar';
import { SeriesCard } from '../components/SeriesCard';
import { colors, radii, shadows, spacing } from '../theme';
import { LibraryTitle, ShelfFilter, ShelfSort } from '../types';
import {
  lastActivity,
  nextUnreadOwnedVolume,
  nextUnreadVolume,
  ownedVolumeCount,
  progressOf,
  totalReadCount,
} from '../utils';

interface ShelfScreenProps {
  titles: LibraryTitle[];
  onAdd: () => void;
  onOpen: (id: string) => void;
  onToggleVolume: (id: string, volume: number) => void;
  filter: ShelfFilter;
  sort: ShelfSort;
  onFilterChange: (filter: ShelfFilter) => void;
  onSortChange: (sort: ShelfSort) => void;
  initialScrollPosition: number;
  onScrollPositionChange: (position: number) => void;
}

function NextUpCard({
  title,
  onOpen,
  onMark,
}: {
  title: LibraryTitle;
  onOpen: () => void;
  onMark: () => void;
}) {
  const next = nextUnreadOwnedVolume(title);

  return (
    <LinearGradient
      colors={['#342C55', '#1D2840', '#15212B']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.nextCard}
    >
      <View style={styles.nextGlow} />
      <View style={styles.nextTop}>
        <View style={styles.nextCopy}>
          <View style={styles.eyebrowRow}>
            <Ionicons name="sparkles" size={14} color={colors.accent} />
            <Text style={styles.eyebrow}>NEXT ON YOUR SHELF</Text>
          </View>
          <Text style={styles.nextTitle} numberOfLines={2}>
            {title.title}
          </Text>
          <Text style={styles.nextMeta}>
            {next ? `Volume ${next} is ready when you are` : 'Every listed volume is finished'}
          </Text>
          <Text style={styles.nextOwnership}>
            {ownedVolumeCount(title)} owned
          </Text>
        </View>
        {title.coverUrl ? (
          <Image source={{ uri: title.coverUrl }} style={styles.nextCover} resizeMode="cover" />
        ) : (
          <View style={[styles.nextCover, styles.nextCoverFallback]}>
            <Ionicons name="book" size={44} color={colors.textDim} />
          </View>
        )}
      </View>
      <View style={styles.nextProgress}>
        <View style={styles.nextProgressTrack}>
          <ProgressBar progress={progressOf(title)} color={colors.accent} height={8} />
        </View>
        <Text style={styles.nextProgressLabel}>
          {Math.round(progressOf(title) * 100)}%
        </Text>
      </View>
      <View style={styles.nextActions}>
        {next ? (
          <Pressable
            accessibilityRole="button"
            onPress={onMark}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Ionicons name="checkmark" size={18} color={colors.background} />
            <Text style={styles.primaryButtonText}>Finish vol. {next}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onOpen}
          style={({ pressed }) => [styles.ghostButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.ghostButtonText}>Open</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

export function ShelfScreen({
  titles,
  onAdd,
  onOpen,
  onToggleVolume,
  filter,
  sort,
  onFilterChange,
  onSortChange,
  initialScrollPosition,
  onScrollPositionChange,
}: ShelfScreenProps) {
  const { width } = useWindowDimensions();
  const [query, setQuery] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const scrollRestored = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: initialScrollPosition, animated: false });
      scrollRestored.current = true;
    }, 0);
    return () => clearTimeout(timer);
  }, [initialScrollPosition]);

  const nextUp = useMemo(
    () => {
      const candidates = titles.filter(
        (title) => title.status !== 'paused' && nextUnreadOwnedVolume(title),
      );
      return candidates[Math.floor(Math.random() * candidates.length)];
    },
    [titles],
  );

  const filtered = useMemo(() => {
    const clean = query.trim().toLowerCase();
    const matches = titles
      .filter((title) => filter === 'all' || title.kind === filter)
      .filter(
        (title) =>
          !clean ||
          title.title.toLowerCase().includes(clean) ||
          title.alternativeTitle?.toLowerCase().includes(clean),
      );

    return [...matches].sort((a, b) => {
      if (sort === 'title') return a.title.localeCompare(b.title);
      if (sort === 'progress') {
        return progressOf(b) - progressOf(a) || a.title.localeCompare(b.title);
      }
      return lastActivity(b) - lastActivity(a) || a.title.localeCompare(b.title);
    });
  }, [filter, query, sort, titles]);

  const availableWidth = Math.min(width, 1040) - spacing.xl * 2;
  const columns = width >= 900 ? 4 : width >= 650 ? 3 : 2;
  const cardWidth = Math.max(145, (availableWidth - spacing.md * (columns - 1)) / columns);
  const readCount = titles.reduce((sum, title) => sum + totalReadCount(title), 0);
  const ownedCount = titles.reduce((sum, title) => sum + ownedVolumeCount(title), 0);
  const everySeriesComplete = titles.every((title) => !nextUnreadVolume(title));

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={80}
      onScroll={(event) => {
        if (scrollRestored.current) onScrollPositionChange(event.nativeEvent.contentOffset.y);
      }}
    >
      <View style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.kicker}>NEXT VOLUME</Text>
            <Text style={styles.heading}>Your shelf</Text>
            <Text style={styles.subtitle}>No guilt. Just keep your place.</Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="book-outline" size={24} color={colors.accent} />
          </View>
        </View>

        <InstallPrompt />

        {nextUp ? (
          <NextUpCard
            title={nextUp}
            onOpen={() => onOpen(nextUp.id)}
            onMark={() => {
              const next = nextUnreadOwnedVolume(nextUp);
              if (next) onToggleVolume(nextUp.id, next);
            }}
          />
        ) : titles.length ? (
          <LinearGradient colors={['#153B31', '#16242A']} style={styles.completeBanner}>
            <Ionicons name="checkmark-done-circle" size={34} color={colors.green} />
            <View style={styles.completeCopy}>
              <Text style={styles.completeTitle}>
                {everySeriesComplete ? 'All reading complete' : 'Owned shelf caught up'}
              </Text>
              <Text style={styles.completeText}>
                {everySeriesComplete
                  ? 'Every volume in every tracked series is read.'
                  : 'You have read every volume currently marked as owned.'}
              </Text>
            </View>
          </LinearGradient>
        ) : null}

        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Text style={styles.quickValue}>{readCount}</Text>
            <Text style={styles.quickLabel}>volumes read</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.quickStat}>
            <Text style={styles.quickValue}>{ownedCount}</Text>
            <Text style={styles.quickLabel}>volumes owned</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Library</Text>
          <Text style={styles.sectionCount}>{filtered.length} titles</Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search" size={19} color={colors.textDim} />
          <TextInput
            accessibilityLabel="Search your shelf"
            value={query}
            onChangeText={setQuery}
            placeholder="Search your shelf"
            placeholderTextColor={colors.textDim}
            selectionColor={colors.accent}
            style={styles.searchInput}
          />
          {query ? (
            <Pressable accessibilityLabel="Clear search" onPress={() => setQuery('')}>
              <Ionicons name="close-circle" size={19} color={colors.textDim} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <FilterChip label="All" selected={filter === 'all'} onPress={() => onFilterChange('all')} />
          <FilterChip
            label="Manga"
            selected={filter === 'manga'}
            onPress={() => onFilterChange('manga')}
          />
          <FilterChip
            label="Light novels"
            selected={filter === 'light-novel'}
            onPress={() => onFilterChange('light-novel')}
          />
        </ScrollView>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortOptions}
          >
            <FilterChip
              label="Recent"
              selected={sort === 'recent'}
              onPress={() => onSortChange('recent')}
            />
            <FilterChip
              label="A–Z"
              selected={sort === 'title'}
              onPress={() => onSortChange('title')}
            />
            <FilterChip
              label="Progress"
              selected={sort === 'progress'}
              onPress={() => onSortChange('progress')}
            />
          </ScrollView>
        </View>

        {filtered.length ? (
          <View style={styles.grid}>
            {filtered.map((title) => {
              const next = nextUnreadOwnedVolume(title);
              return (
                <SeriesCard
                  key={title.id}
                  title={title}
                  width={cardWidth}
                  onOpen={() => onOpen(title.id)}
                  onMarkNext={() => {
                    if (next) onToggleVolume(title.id, next);
                  }}
                />
              );
            })}
          </View>
        ) : (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name={titles.length ? 'search-outline' : 'library-outline'}
                size={38}
                color={colors.accent}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {titles.length ? 'Nothing matches' : 'Build your shelf'}
            </Text>
            <Text style={styles.emptyText}>
              {titles.length
                ? 'Try a different title or filter.'
                : 'Search online for manga and light novels, then tick off each volume as you finish it.'}
            </Text>
            {!titles.length ? (
              <Pressable
                accessibilityRole="button"
                onPress={onAdd}
                style={({ pressed }) => [styles.emptyButton, pressed && styles.buttonPressed]}
              >
                <Ionicons name="add" size={19} color={colors.background} />
                <Text style={styles.emptyButtonLabel}>Add your first title</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
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
    maxWidth: 1040,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    marginBottom: 2,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2.2,
  },
  heading: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  subtitle: {
    marginTop: spacing.xs,
    color: colors.textMuted,
    fontSize: 14,
  },
  headerIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  nextCard: {
    minHeight: 220,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: '#443D68',
    ...shadows.card,
  },
  nextTop: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
  },
  nextGlow: {
    position: 'absolute',
    width: 170,
    height: 170,
    top: -90,
    left: -40,
    borderRadius: radii.round,
    backgroundColor: 'rgba(255,180,84,0.12)',
  },
  nextCopy: {
    flex: 1,
    zIndex: 2,
    minWidth: 0,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.25,
  },
  nextTitle: {
    maxWidth: 500,
    marginTop: spacing.md,
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 29,
    letterSpacing: -0.6,
  },
  nextMeta: {
    marginTop: 5,
    color: colors.textMuted,
    fontSize: 13,
  },
  nextOwnership: {
    marginTop: 4,
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  nextProgress: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    zIndex: 3,
  },
  nextProgressTrack: {
    flex: 1,
    minWidth: 0,
  },
  nextProgressLabel: {
    minWidth: 34,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  nextActions: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignSelf: 'flex-start',
    gap: spacing.sm,
    zIndex: 3,
  },
  primaryButton: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    flexShrink: 1,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
  },
  ghostButton: {
    minHeight: 40,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  ghostButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  buttonPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
  nextCover: {
    width: 118,
    height: 168,
    alignSelf: 'center',
    zIndex: 2,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
    transform: [{ rotate: '3deg' }],
  },
  nextCoverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeBanner: {
    marginBottom: spacing.lg,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.greenSoft,
  },
  completeCopy: {
    flex: 1,
  },
  completeTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  completeText: {
    marginTop: 3,
    color: colors.textMuted,
    fontSize: 13,
  },
  quickStats: {
    marginBottom: spacing.xxl,
    paddingVertical: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  quickStat: {
    flex: 1,
    alignItems: 'center',
  },
  quickValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  quickLabel: {
    marginTop: 2,
    color: colors.textDim,
    fontSize: 10,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  sectionHeader: {
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  sectionCount: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
  },
  searchBox: {
    height: 48,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: colors.text,
    fontSize: 15,
  },
  filters: {
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  sortRow: {
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sortLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
  },
  sortOptions: {
    gap: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  empty: {
    paddingVertical: 52,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.backgroundRaised,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    marginBottom: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    backgroundColor: '#2F2A24',
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  emptyText: {
    maxWidth: 390,
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
  emptyButton: {
    minHeight: 44,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  emptyButtonLabel: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
});
