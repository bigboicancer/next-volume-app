import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing } from '../theme';
import { Edition, LibraryTitle, ReadingStatus } from '../types';
import {
  clamp,
  formatVolumeSelection,
  ownedVolumeNumbersOf,
  parseVolumeSelection,
  rangeThrough,
  statusLabel,
} from '../utils';

interface EditTitleModalProps {
  visible: boolean;
  title?: LibraryTitle;
  onClose: () => void;
  onSave: (update: Partial<LibraryTitle>) => void;
  onDelete: () => void;
}

const statuses: ReadingStatus[] = ['reading', 'planned', 'paused', 'completed'];

export function EditTitleModal({
  visible,
  title,
  onClose,
  onSave,
  onDelete,
}: EditTitleModalProps) {
  const [name, setName] = useState('');
  const [total, setTotal] = useState(1);
  const [ownedInput, setOwnedInput] = useState('');
  const [edition, setEdition] = useState<Edition>('english');
  const [status, setStatus] = useState<ReadingStatus>('reading');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  useEffect(() => {
    if (!visible) {
      setDeleteConfirmVisible(false);
      return;
    }
    if (!title) return;
    setName(title.title);
    setTotal(title.totalVolumes);
    setOwnedInput(formatVolumeSelection(ownedVolumeNumbersOf(title)));
    setEdition(title.edition);
    setStatus(title.status);
    setDeleteConfirmVisible(false);
  }, [title, visible]);

  if (!title) return null;

  function save() {
    const cleanName = name.trim();
    if (!cleanName) {
      Alert.alert('Title required', 'The series needs a name.');
      return;
    }
    const readVolumes =
      status === 'completed'
        ? rangeThrough(total)
        : title!.readVolumes.filter((volume) => volume <= total);
    const ownedVolumeNumbers = parseVolumeSelection(ownedInput, total);
    onSave({
      title: cleanName,
      totalVolumes: total,
      ownedVolumes: ownedVolumeNumbers.length,
      ownedVolumeNumbers,
      edition,
      status,
      readVolumes,
    });
    onClose();
  }

  function confirmDelete() {
    setDeleteConfirmVisible(true);
  }

  function removeTitle() {
    onDelete();
    setDeleteConfirmVisible(false);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>SERIES SETTINGS</Text>
              <Text style={styles.heading}>Edit tracking</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Title</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              selectionColor={colors.accent}
              style={styles.input}
            />

            <Text style={styles.label}>Edition</Text>
            <View style={styles.segmented}>
              {(['english', 'original'] as Edition[]).map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setEdition(item)}
                  style={[styles.segment, edition === item && styles.segmentSelected]}
                >
                  <Text style={[styles.segmentText, edition === item && styles.segmentTextSelected]}>
                    {item === 'english' ? 'English' : 'Original / JP'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Tracking status</Text>
            <View style={styles.statusGrid}>
              {statuses.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setStatus(item)}
                  style={[styles.statusChip, status === item && styles.statusChipSelected]}
                >
                  <Text
                    style={[styles.statusChipText, status === item && styles.statusChipTextSelected]}
                  >
                    {statusLabel(item)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.totalRow}>
              <View style={styles.totalCopy}>
                <Text style={styles.label}>Total volumes to read</Text>
                <Text style={styles.help}>The full count. Completion is based on this number.</Text>
              </View>
              <View style={styles.counter}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Decrease total volumes to read"
                  onPress={() =>
                    setTotal((current) => clamp(current - 1, 1, 300))
                  }
                  style={styles.counterButton}
                >
                  <Ionicons name="remove" size={18} color={colors.text} />
                </Pressable>
                <TextInput
                  value={String(total)}
                  accessibilityLabel="Total volumes to read"
                  onChangeText={(text) => {
                    const parsed = Number(text.replace(/[^0-9]/g, ''));
                    if (Number.isFinite(parsed)) {
                      const next = clamp(parsed, 1, 300);
                      setTotal(next);
                    }
                  }}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  style={styles.counterValue}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Increase total volumes to read"
                  onPress={() => setTotal((current) => clamp(current + 1, 1, 300))}
                  style={styles.counterButton}
                >
                  <Ionicons name="add" size={18} color={colors.text} />
                </Pressable>
              </View>
            </View>

            <View style={styles.ownershipBlock}>
              <Text style={styles.label}>Volumes you own</Text>
              <Text style={styles.help}>
                Enter numbers or ranges. Gaps are allowed, e.g. 1-3, 7, 12-14.
              </Text>
              <TextInput
                value={ownedInput}
                accessibilityLabel="Volumes you own"
                onChangeText={setOwnedInput}
                placeholder="1-3, 7, 12-14"
                placeholderTextColor={colors.textDim}
                selectionColor={colors.accent}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.ownershipInput}
              />
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={save}
              style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
            >
              <Text style={styles.saveText}>Save changes</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDelete}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={18} color={colors.danger} />
              <Text style={styles.deleteText}>Remove from shelf</Text>
            </Pressable>
          </ScrollView>
        </View>

        {deleteConfirmVisible ? (
          <View style={styles.confirmLayer} accessibilityViewIsModal>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel removal"
              style={StyleSheet.absoluteFill}
              onPress={() => setDeleteConfirmVisible(false)}
            />
            <View style={styles.confirmCard}>
              <View style={styles.confirmIcon}>
                <Ionicons name="trash-outline" size={22} color={colors.danger} />
              </View>
              <Text style={styles.confirmTitle}>Remove {title.title}?</Text>
              <Text style={styles.confirmText}>
                This removes the series and all its reading progress from this device.
              </Text>
              <View style={styles.confirmActions}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setDeleteConfirmVisible(false)}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${title.title} from shelf`}
                  onPress={removeTitle}
                  style={({ pressed }) => [styles.confirmDeleteButton, pressed && styles.pressed]}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.text} />
                  <Text style={styles.confirmDeleteText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.64)',
  },
  sheet: {
    maxHeight: '88%',
    paddingHorizontal: spacing.xl,
    paddingBottom: 34,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.backgroundRaised,
  },
  handle: {
    width: 42,
    height: 5,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
    alignSelf: 'center',
    borderRadius: radii.round,
    backgroundColor: colors.border,
  },
  header: {
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  heading: {
    marginTop: 3,
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  scroll: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    height: 48,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
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
  statusGrid: {
    marginBottom: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statusChip: {
    minHeight: 40,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  statusChipSelected: {
    borderColor: colors.accent,
    backgroundColor: '#312A22',
  },
  statusChipText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  statusChipTextSelected: {
    color: colors.accent,
  },
  totalRow: {
    minHeight: 76,
    marginBottom: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  totalCopy: {
    flex: 1,
  },
  help: {
    color: colors.textDim,
    fontSize: 10,
    lineHeight: 14,
  },
  ownershipBlock: {
    marginBottom: spacing.xl,
  },
  ownershipInput: {
    height: 48,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    color: colors.text,
    fontSize: 14,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  counter: {
    height: 42,
    flexDirection: 'row',
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  counterButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    width: 48,
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
  },
  saveButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  saveText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  deleteButton: {
    minHeight: 48,
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '800',
  },
  confirmLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.76)',
  },
  confirmCard: {
    width: '100%',
    maxWidth: 420,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.dangerSoft,
    backgroundColor: colors.surface,
  },
  confirmIcon: {
    width: 44,
    height: 44,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
  },
  confirmTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  confirmText: {
    marginTop: spacing.sm,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  confirmActions: {
    marginTop: spacing.xl,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  cancelButton: {
    minHeight: 46,
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
  confirmDeleteButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.danger,
  },
  confirmDeleteText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
});
