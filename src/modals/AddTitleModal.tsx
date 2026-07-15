import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FilterChip } from '../components/FilterChip';
import { lookupVolumeCounts, searchCatalog } from '../services/catalog';
import { colors, radii, spacing } from '../theme';
import {
  CatalogResult,
  Edition,
  LibraryTitle,
  MediaKind,
  TitleDraft,
  VolumeLookup,
} from '../types';
import {
  clamp,
  formatVolumeSelection,
  kindLabel,
  parseVolumeSelection,
  rangeThrough,
  unownedReadVolumes,
} from '../utils';

type AddMode = 'search' | 'confirm' | 'manual';
type CatalogFilter = 'all' | MediaKind;

interface AddTitleModalProps {
  visible: boolean;
  existingTitles: LibraryTitle[];
  onClose: () => void;
  onAdd: (draft: TitleDraft) => void;
}

function Counter({
  label,
  help,
  value,
  min,
  max = 300,
  onChange,
}: {
  label: string;
  help?: string;
  value: number;
  min: number;
  max?: number;
  onChange: (value: number) => void;
}) {
  return (
    <View style={styles.counterRow}>
      <View style={styles.counterCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {help ? <Text style={styles.fieldHelp}>{help}</Text> : null}
      </View>
      <View style={styles.counterControl}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(clamp(value - 1, min, max))}
          style={({ pressed }) => [styles.counterButton, pressed && styles.pressed]}
        >
          <Ionicons name="remove" size={18} color={colors.text} />
        </Pressable>
        <TextInput
          accessibilityLabel={label}
          value={String(value)}
          onChangeText={(text) => {
            const parsed = Number(text.replace(/[^0-9]/g, ''));
            if (Number.isFinite(parsed)) onChange(clamp(parsed, min, max));
          }}
          keyboardType="number-pad"
          selectTextOnFocus
          style={styles.counterValue}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onChange(clamp(value + 1, min, max))}
          style={({ pressed }) => [styles.counterButton, pressed && styles.pressed]}
        >
          <Ionicons name="add" size={18} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}

export function AddTitleModal({
  visible,
  existingTitles,
  onClose,
  onAdd,
}: AddTitleModalProps) {
  const [mode, setMode] = useState<AddMode>('search');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CatalogFilter>('all');
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selected, setSelected] = useState<CatalogResult>();
  const [lookup, setLookup] = useState<VolumeLookup>();
  const [checkingVolumes, setCheckingVolumes] = useState(false);
  const [edition, setEdition] = useState<Edition>('english');
  const [totalVolumes, setTotalVolumes] = useState(1);
  const [ownedInput, setOwnedInput] = useState('');
  const [readThrough, setReadThrough] = useState(0);
  const [manualTitle, setManualTitle] = useState('');
  const [manualKind, setManualKind] = useState<MediaKind>('manga');
  const abortRef = useRef<AbortController | undefined>(undefined);

  useEffect(() => {
    if (visible) return;
    abortRef.current?.abort();
    setMode('search');
    setQuery('');
    setFilter('all');
    setResults([]);
    setSearchError('');
    setSelected(undefined);
    setLookup(undefined);
    setCheckingVolumes(false);
    setEdition('english');
    setTotalVolumes(1);
    setOwnedInput('');
    setReadThrough(0);
    setManualTitle('');
    setManualKind('manga');
  }, [visible]);

  async function performSearch() {
    if (query.trim().length < 2) {
      setSearchError('Type at least two letters.');
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setSearchError('');
    try {
      const found = await searchCatalog(query, filter, controller.signal);
      setResults(found);
      if (!found.length) setSearchError('No matching titles found. Try the Japanese title or add it manually.');
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        setSearchError((error as Error).message || 'Search failed.');
      }
    } finally {
      setSearching(false);
    }
  }

  async function chooseResult(result: CatalogResult) {
    if (existingTitles.some((title) => title.sourceId === result.sourceId)) {
      Alert.alert('Already on your shelf', `${result.title} is already being tracked.`);
      return;
    }
    setSelected(result);
    setLookup(undefined);
    setEdition('english');
    setReadThrough(0);
    setOwnedInput('');
    setTotalVolumes(result.originalVolumes || 1);
    setMode('confirm');
    setCheckingVolumes(true);
    try {
      const counts = await lookupVolumeCounts(result);
      setLookup(counts);
      const detectedTotal = counts.englishEstimate || result.originalVolumes || 1;
      setTotalVolumes(detectedTotal);
      setReadThrough((current) => Math.min(current, detectedTotal));
    } finally {
      setCheckingVolumes(false);
    }
  }

  function switchEdition(nextEdition: Edition) {
    setEdition(nextEdition);
    const suggested =
      nextEdition === 'english'
        ? lookup?.englishEstimate
        : lookup?.originalVolumes || selected?.originalVolumes;
    if (suggested) {
      setTotalVolumes(suggested);
      setReadThrough((current) => Math.min(current, suggested));
    }
  }

  function finishOnlineAdd() {
    if (!selected) return;
    const readVolumes = rangeThrough(Math.min(readThrough, totalVolumes));
    const ownedVolumeNumbers = parseVolumeSelection(ownedInput, totalVolumes);
    const missingOwnership = unownedReadVolumes(readVolumes, ownedVolumeNumbers);
    if (missingOwnership.length) {
      Alert.alert(
        'Own read volumes first',
        `Add ${formatVolumeSelection(missingOwnership)} to your owned volumes, or lower “Already read through”.`,
      );
      return;
    }
    onAdd({
      sourceId: selected.sourceId,
      sourceUrl: selected.sourceUrl,
      title: selected.title,
      alternativeTitle: selected.alternativeTitle,
      coverUrl: selected.coverUrl,
      kind: selected.kind,
      edition,
      ownedVolumes: ownedVolumeNumbers.length,
      ownedVolumeNumbers,
      totalVolumes,
      onlineOriginalVolumes: lookup?.originalVolumes || selected.originalVolumes,
      onlineEnglishVolumes: lookup?.englishEstimate,
      publishing: selected.publishing,
      readVolumes,
      readDates: {},
      status:
        readVolumes.length >= totalVolumes ? 'completed' : readVolumes.length ? 'reading' : 'planned',
      lastCheckedAt: lookup?.checkedAt,
    });
    onClose();
  }

  function finishManualAdd() {
    const cleanTitle = manualTitle.trim();
    if (!cleanTitle) {
      Alert.alert('Add a title', 'Enter the name of the manga or light novel.');
      return;
    }
    if (existingTitles.some((title) => title.title.toLowerCase() === cleanTitle.toLowerCase())) {
      Alert.alert('Already on your shelf', `${cleanTitle} is already being tracked.`);
      return;
    }
    const readVolumes = rangeThrough(Math.min(readThrough, totalVolumes));
    const ownedVolumeNumbers = parseVolumeSelection(ownedInput, totalVolumes);
    const missingOwnership = unownedReadVolumes(readVolumes, ownedVolumeNumbers);
    if (missingOwnership.length) {
      Alert.alert(
        'Own read volumes first',
        `Add ${formatVolumeSelection(missingOwnership)} to your owned volumes, or lower “Already read through”.`,
      );
      return;
    }
    onAdd({
      title: cleanTitle,
      kind: manualKind,
      edition,
      ownedVolumes: ownedVolumeNumbers.length,
      ownedVolumeNumbers,
      totalVolumes,
      readVolumes,
      readDates: {},
      status:
        readVolumes.length >= totalVolumes ? 'completed' : readVolumes.length ? 'reading' : 'planned',
    });
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
        <View style={styles.header}>
          {mode === 'search' ? (
            <View style={styles.headerSpacer} />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back"
              onPress={() => setMode('search')}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={23} color={colors.text} />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>
            {mode === 'search' ? 'Add to shelf' : mode === 'manual' ? 'Add manually' : 'Check details'}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>

        {mode === 'search' ? (
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.page}>
              <Text style={styles.kicker}>ONLINE LOOKUP</Text>
              <Text style={styles.heading}>What are you reading?</Text>
              <Text style={styles.subtitle}>
                Find the series once. The app will build the volume checklist for you.
              </Text>

              <View style={styles.searchBox}>
                <Ionicons name="search" size={20} color={colors.textDim} />
                <TextInput
                  autoFocus
                  returnKeyType="search"
                  value={query}
                  onChangeText={setQuery}
                  onSubmitEditing={performSearch}
                  placeholder="Bleach, Frieren, Spice and Wolf…"
                  placeholderTextColor={colors.textDim}
                  selectionColor={colors.accent}
                  style={styles.searchInput}
                />
                {searching ? <ActivityIndicator size="small" color={colors.accent} /> : null}
              </View>

              <View style={styles.filterRow}>
                <FilterChip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
                <FilterChip
                  label="Manga"
                  selected={filter === 'manga'}
                  onPress={() => setFilter('manga')}
                />
                <FilterChip
                  label="Light novels"
                  selected={filter === 'light-novel'}
                  onPress={() => setFilter('light-novel')}
                />
              </View>

              <Pressable
                accessibilityRole="button"
                disabled={searching}
                onPress={performSearch}
                style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
              >
                <Text style={styles.searchButtonLabel}>Search online</Text>
              </Pressable>

              {searchError ? (
                <View style={styles.messageBox}>
                  <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
                  <Text style={styles.messageText}>{searchError}</Text>
                </View>
              ) : null}

              {results.length ? <Text style={styles.resultHeading}>Results</Text> : null}
              <View style={styles.results}>
                {results.map((result) => (
                  <Pressable
                    key={result.sourceId}
                    accessibilityRole="button"
                    onPress={() => chooseResult(result)}
                    style={({ pressed }) => [styles.result, pressed && styles.resultPressed]}
                  >
                    {result.coverUrl ? (
                      <Image source={{ uri: result.coverUrl }} style={styles.resultCover} />
                    ) : (
                      <View style={[styles.resultCover, styles.resultCoverFallback]}>
                        <Ionicons name="book-outline" size={25} color={colors.textDim} />
                      </View>
                    )}
                    <View style={styles.resultCopy}>
                      <Text style={styles.resultTitle} numberOfLines={2}>
                        {result.title}
                      </Text>
                      {result.alternativeTitle ? (
                        <Text style={styles.resultAlt} numberOfLines={1}>
                          {result.alternativeTitle}
                        </Text>
                      ) : null}
                      <View style={styles.resultMetaRow}>
                        <Text style={styles.resultMeta}>{kindLabel(result.kind)}</Text>
                        <View style={styles.metaDot} />
                        <Text style={styles.resultMeta}>
                          {result.originalVolumes
                            ? `${result.originalVolumes} original volumes`
                            : result.publishing
                              ? 'Ongoing'
                              : 'Count not listed'}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="chevron-forward" size={21} color={colors.textDim} />
                  </Pressable>
                ))}
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setMode('manual');
                  setEdition('english');
                  setTotalVolumes(1);
                  setOwnedInput('');
                  setReadThrough(0);
                }}
                style={({ pressed }) => [styles.manualLink, pressed && styles.pressed]}
              >
                <Ionicons name="create-outline" size={18} color={colors.accent} />
                <Text style={styles.manualLinkText}>Can't find it? Add it manually</Text>
              </Pressable>

              <Text style={styles.sourceNote}>
                Series metadata comes from Kitsu with MyAnimeList via Jikan as a backup. English
                volume totals are estimated from Google Books and Open Library, so you can always
                correct the number before adding.
              </Text>
            </View>
          </ScrollView>
        ) : mode === 'confirm' && selected ? (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.page}>
              <View style={styles.selectedHero}>
                {selected.coverUrl ? (
                  <Image source={{ uri: selected.coverUrl }} style={styles.selectedCover} />
                ) : (
                  <View style={[styles.selectedCover, styles.resultCoverFallback]}>
                    <Ionicons name="book-outline" size={34} color={colors.textDim} />
                  </View>
                )}
                <View style={styles.selectedCopy}>
                  <Text style={styles.selectedType}>{kindLabel(selected.kind).toUpperCase()}</Text>
                  <Text style={styles.selectedTitle}>{selected.title}</Text>
                  <Text style={styles.selectedStatus}>{selected.statusLabel}</Text>
                </View>
              </View>

              <Text style={styles.formHeading}>Which edition are you tracking?</Text>
              <View style={styles.segmented}>
                <Pressable
                  onPress={() => switchEdition('english')}
                  style={[styles.segment, edition === 'english' && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, edition === 'english' && styles.segmentTextSelected]}>
                    English
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => switchEdition('original')}
                  style={[styles.segment, edition === 'original' && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, edition === 'original' && styles.segmentTextSelected]}>
                    Original / JP
                  </Text>
                </Pressable>
              </View>

              <View style={styles.lookupCard}>
                {checkingVolumes ? (
                  <View style={styles.lookupLoading}>
                    <ActivityIndicator color={colors.accent} />
                    <Text style={styles.lookupLoadingText}>Checking book indexes…</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.lookupRow}>
                      <Text style={styles.lookupLabel}>English books indexed</Text>
                      <Text style={styles.lookupValue}>{lookup?.englishEstimate || 'Not found'}</Text>
                    </View>
                    <View style={styles.infoDivider} />
                    <View style={styles.lookupRow}>
                      <Text style={styles.lookupLabel}>Original series total</Text>
                      <Text style={styles.lookupValue}>
                        {lookup?.originalVolumes || selected.originalVolumes || 'Ongoing / unknown'}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              <Counter
                label="Total volumes to read"
                help="The full count for this edition. Completion uses this number."
                value={totalVolumes}
                min={1}
                onChange={(value) => {
                  setTotalVolumes(value);
                  setReadThrough((current) => Math.min(current, value));
                }}
              />
              <View style={styles.formDivider} />
              <View style={styles.ownershipField}>
                <Text style={styles.fieldLabel}>Volumes you own</Text>
                <Text style={styles.fieldHelp}>Enter individual numbers or ranges, e.g. 1-3, 7, 12-14.</Text>
                <TextInput
                  accessibilityLabel="Volumes you own"
                  value={ownedInput}
                  onChangeText={setOwnedInput}
                  placeholder="1-3, 7, 12-14"
                  placeholderTextColor={colors.textDim}
                  selectionColor={colors.accent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.ownershipInput}
                />
              </View>
              <View style={styles.formDivider} />
              <Counter
                label="Already read through"
                help="All volumes from 1 through this number will be ticked."
                value={readThrough}
                min={0}
                max={totalVolumes}
                onChange={setReadThrough}
              />

              <View style={styles.correctionNote}>
                <Ionicons name="shield-checkmark-outline" size={19} color={colors.green} />
                <Text style={styles.correctionText}>
                  Your number wins. Online refreshes can add newly found volumes, but they will never
                  shrink your checklist.
                </Text>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={finishOnlineAdd}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <Ionicons name="add-circle" size={20} color={colors.background} />
                <Text style={styles.addButtonText}>Add to my shelf</Text>
              </Pressable>
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            style={styles.scroll}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.page}>
              <Text style={styles.kicker}>MANUAL ENTRY</Text>
              <Text style={styles.heading}>Make your own checklist</Text>
              <Text style={styles.subtitle}>Useful for obscure editions, box sets and brand-new series.</Text>

              <Text style={styles.fieldLabel}>Title</Text>
              <TextInput
                autoFocus
                value={manualTitle}
                onChangeText={setManualTitle}
                placeholder="Series name"
                placeholderTextColor={colors.textDim}
                selectionColor={colors.accent}
                style={styles.textField}
              />

              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.segmented}>
                <Pressable
                  onPress={() => setManualKind('manga')}
                  style={[styles.segment, manualKind === 'manga' && styles.segmentSelected]}
                >
                  <Text
                    style={[styles.segmentText, manualKind === 'manga' && styles.segmentTextSelected]}
                  >
                    Manga
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setManualKind('light-novel')}
                  style={[styles.segment, manualKind === 'light-novel' && styles.segmentSelected]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      manualKind === 'light-novel' && styles.segmentTextSelected,
                    ]}
                  >
                    Light novel
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.fieldLabel}>Edition</Text>
              <View style={styles.segmented}>
                <Pressable
                  onPress={() => setEdition('english')}
                  style={[styles.segment, edition === 'english' && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, edition === 'english' && styles.segmentTextSelected]}>
                    English
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setEdition('original')}
                  style={[styles.segment, edition === 'original' && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, edition === 'original' && styles.segmentTextSelected]}>
                    Original / JP
                  </Text>
                </Pressable>
              </View>

              <Counter
                label="Total volumes to read"
                help="Use the full series or edition count, not only the books you own."
                value={totalVolumes}
                min={1}
                onChange={(value) => {
                  setTotalVolumes(value);
                  setReadThrough((current) => Math.min(current, value));
                }}
              />
              <View style={styles.formDivider} />
              <View style={styles.ownershipField}>
                <Text style={styles.fieldLabel}>Volumes you own</Text>
                <Text style={styles.fieldHelp}>Enter individual numbers or ranges, e.g. 1-3, 7, 12-14.</Text>
                <TextInput
                  accessibilityLabel="Volumes you own"
                  value={ownedInput}
                  onChangeText={setOwnedInput}
                  placeholder="1-3, 7, 12-14"
                  placeholderTextColor={colors.textDim}
                  selectionColor={colors.accent}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.ownershipInput}
                />
              </View>
              <View style={styles.formDivider} />
              <Counter
                label="Already read through"
                value={readThrough}
                min={0}
                max={totalVolumes}
                onChange={setReadThrough}
              />

              <Pressable
                accessibilityRole="button"
                onPress={finishManualAdd}
                style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
              >
                <Ionicons name="add-circle" size={20} color={colors.background} />
                <Text style={styles.addButtonText}>Add to my shelf</Text>
              </Pressable>
            </View>
          </ScrollView>
        )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 62,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  headerSpacer: {
    width: 42,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.7,
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
    maxWidth: 720,
    alignSelf: 'center',
    padding: spacing.xl,
  },
  kicker: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  heading: {
    marginTop: 4,
    color: colors.text,
    fontSize: 29,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  searchBox: {
    height: 54,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radii.lg,
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
  filterRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  searchButton: {
    height: 46,
    marginTop: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  searchButtonLabel: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  messageBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#2D271F',
  },
  messageText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  resultHeading: {
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  results: {
    gap: spacing.sm,
  },
  result: {
    minHeight: 108,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  resultPressed: {
    opacity: 0.76,
    borderColor: colors.accent,
  },
  resultCover: {
    width: 56,
    height: 80,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceRaised,
  },
  resultCoverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultCopy: {
    flex: 1,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 20,
  },
  resultAlt: {
    marginTop: 2,
    color: colors.textDim,
    fontSize: 11,
  },
  resultMetaRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  resultMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: radii.round,
    backgroundColor: colors.textDim,
  },
  manualLink: {
    minHeight: 48,
    marginTop: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  manualLinkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  sourceNote: {
    marginTop: spacing.lg,
    color: colors.textDim,
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  selectedHero: {
    marginBottom: spacing.xxl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedCover: {
    width: 86,
    height: 122,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  selectedCopy: {
    flex: 1,
  },
  selectedType: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  selectedTitle: {
    marginTop: spacing.sm,
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 27,
  },
  selectedStatus: {
    marginTop: 4,
    color: colors.textMuted,
    fontSize: 12,
  },
  formHeading: {
    marginBottom: spacing.md,
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  segmented: {
    marginBottom: spacing.xl,
    padding: 4,
    flexDirection: 'row',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  segment: {
    minHeight: 42,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentSelected: {
    backgroundColor: colors.surfaceRaised,
  },
  segmentText: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTextSelected: {
    color: colors.accent,
  },
  lookupCard: {
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundRaised,
  },
  lookupLoading: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  lookupLoadingText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  lookupRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  lookupLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  lookupValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  counterRow: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  counterCopy: {
    flex: 1,
  },
  fieldLabel: {
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  fieldHelp: {
    color: colors.textDim,
    fontSize: 10,
    lineHeight: 14,
  },
  ownershipField: {
    paddingVertical: spacing.md,
  },
  ownershipInput: {
    height: 46,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  counterControl: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  counterButton: {
    width: 40,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    width: 48,
    height: '100%',
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  formDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  correctionNote: {
    marginTop: spacing.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#122A23',
  },
  correctionText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  addButton: {
    minHeight: 50,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  addButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  textField: {
    height: 50,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 15,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
