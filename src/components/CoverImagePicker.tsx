import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { chooseCoverImage } from '../imageUpload';
import { colors, radii, spacing } from '../theme';

interface CoverImagePickerProps {
  value?: string;
  onChange: (value?: string) => void;
}

export function CoverImagePicker({ value, onChange }: CoverImagePickerProps) {
  const [choosing, setChoosing] = useState(false);

  async function chooseImage() {
    setChoosing(true);
    try {
      const image = await chooseCoverImage();
      if (image) onChange(image);
    } catch (error) {
      Alert.alert('Could not use image', (error as Error).message || 'Choose another image and try again.');
    } finally {
      setChoosing(false);
    }
  }

  return (
    <View style={styles.card}>
      {value ? (
        <Image source={{ uri: value }} style={styles.preview} resizeMode="cover" />
      ) : (
        <View style={[styles.preview, styles.fallback]}>
          <Ionicons name="image-outline" size={30} color={colors.textDim} />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={styles.title}>Cover image</Text>
        <Text style={styles.help}>Choose a cover from this device. It is saved with your backup.</Text>
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={choosing}
            onPress={chooseImage}
            style={({ pressed }) => [styles.chooseButton, pressed && styles.pressed]}
          >
            {choosing ? (
              <ActivityIndicator size="small" color={colors.background} />
            ) : (
              <Ionicons name="images-outline" size={17} color={colors.background} />
            )}
            <Text style={styles.chooseText}>{value ? 'Change' : 'Upload'}</Text>
          </Pressable>
          {value ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove cover image"
              disabled={choosing}
              onPress={() => onChange(undefined)}
              style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
            >
              <Text style={styles.removeText}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  preview: {
    width: 72,
    height: 102,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceRaised,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  help: {
    marginTop: 3,
    color: colors.textDim,
    fontSize: 10,
    lineHeight: 14,
  },
  actions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chooseButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.accent,
  },
  chooseText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '900',
  },
  removeButton: {
    minHeight: 36,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  removeText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
});
