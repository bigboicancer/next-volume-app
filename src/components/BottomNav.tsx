import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, shadows, spacing } from '../theme';

export type MainTab = 'shelf' | 'stats';

interface BottomNavProps {
  active: MainTab;
  onChange: (tab: MainTab) => void;
  onAdd: () => void;
}

function NavItem({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon: 'library-outline' | 'stats-chart-outline';
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.navItem, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={22} color={selected ? colors.accent : colors.textDim} />
      <Text style={[styles.navLabel, selected && styles.navLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

export function BottomNav({ active, onChange, onAdd }: BottomNavProps) {
  return (
    <View style={styles.shell}>
      <NavItem
        label="Shelf"
        icon="library-outline"
        selected={active === 'shelf'}
        onPress={() => onChange('shelf')}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a title"
        onPress={onAdd}
        style={({ pressed }) => [styles.addButton, pressed && styles.addPressed]}
      >
        <Ionicons name="add" size={30} color={colors.background} />
      </Pressable>
      <NavItem
        label="Stats"
        icon="stats-chart-outline"
        selected={active === 'stats'}
        onPress={() => onChange('stats')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    height: 70,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(23,29,40,0.98)',
    ...shadows.card,
  },
  navItem: {
    width: 72,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  navLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
  },
  navLabelSelected: {
    color: colors.accent,
  },
  pressed: {
    opacity: 0.65,
  },
  addButton: {
    width: 56,
    height: 56,
    marginTop: -32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.round,
    borderWidth: 5,
    borderColor: colors.background,
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  addPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
});
