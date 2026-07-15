import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ProgressBar } from '../components/ProgressBar';
import { colors, radii, spacing } from '../theme';
import { LibraryTitle } from '../types';
import { nextUnreadVolume, progressOf } from '../utils';

interface StatsScreenProps {
  titles: LibraryTitle[];
}

function StatCard({
  icon,
  value,
  label,
  tone,
}: {
  icon: 'checkmark-done' | 'hourglass-outline' | 'library-outline' | 'flame-outline';
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

export function StatsScreen({ titles }: StatsScreenProps) {
  const read = titles.reduce((sum, title) => sum + title.readVolumes.length, 0);
  const total = titles.reduce((sum, title) => sum + title.totalVolumes, 0);
  const remaining = Math.max(0, total - read);
  const completed = titles.filter((title) => title.status === 'completed').length;
  const thisWeek = titles.reduce(
    (sum, title) =>
      sum +
      Object.values(title.readDates).filter((timestamp) => Date.now() - timestamp < 604_800_000)
        .length,
    0,
  );
  const overall = total ? read / total : 0;
  const manga = titles.filter((title) => title.kind === 'manga');
  const novels = titles.filter((title) => title.kind === 'light-novel');
  const nearlyFinished = [...titles]
    .filter((title) => nextUnreadVolume(title) && progressOf(title) >= 0.5)
    .sort((a, b) => progressOf(b) - progressOf(a))
    .slice(0, 4);

  return (
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
              <Text style={styles.heroLabel}>OVERALL SHELF</Text>
              <Text style={styles.heroValue}>{Math.round(overall * 100)}%</Text>
            </View>
            <View style={styles.heroRing}>
              <Ionicons name="book" size={30} color={colors.accent} />
            </View>
          </View>
          <ProgressBar progress={overall} color={colors.accent} height={10} />
          <Text style={styles.heroCaption}>
            {total ? `${read} of ${total} tracked volumes finished` : 'Add a title to begin tracking.'}
          </Text>
        </LinearGradient>

        <View style={styles.statGrid}>
          <StatCard icon="checkmark-done" value={read} label="Volumes read" tone={colors.green} />
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
              {manga.reduce((sum, title) => sum + title.readVolumes.length, 0)} read
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
              {novels.reduce((sum, title) => sum + title.readVolumes.length, 0)} read
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Nearly finished</Text>
        {nearlyFinished.length ? (
          <View style={styles.nearlyCard}>
            {nearlyFinished.map((title, index) => {
              const remainingForTitle = title.totalVolumes - title.readVolumes.length;
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
                      <ProgressBar progress={progressOf(title)} height={6} />
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
              Titles over halfway complete will appear here.
            </Text>
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
});
