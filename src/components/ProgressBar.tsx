import { StyleSheet, View } from 'react-native';

import { colors, radii } from '../theme';
import { clamp } from '../utils';

interface ProgressBarProps {
  progress: number;
  color?: string;
  height?: number;
}

export function ProgressBar({
  progress,
  color = colors.green,
  height = 7,
}: ProgressBarProps) {
  return (
    <View style={[styles.track, { height }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamp(progress, 0, 1) * 100}%`,
            backgroundColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radii.round,
    backgroundColor: colors.surfaceSoft,
  },
  fill: {
    height: '100%',
    borderRadius: radii.round,
  },
});
