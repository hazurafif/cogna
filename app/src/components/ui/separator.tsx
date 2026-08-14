import { View } from '@/components/ui/view';
import { useColor } from '@/hooks/useColor';
import React from 'react';
import { ViewStyle } from 'react-native';

interface SeparatorProps {
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle;
  /** Extra props (e.g. testID) forwarded to the underlying View. */
  [key: string]: any;
}

export function Separator({
  orientation = 'horizontal',
  style,
  ...props
}: SeparatorProps) {
  const borderColor = useColor('border');

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility='no-hide-descendants'
      style={[
        {
          backgroundColor: borderColor,
          ...(orientation === 'horizontal'
            ? { height: 1, width: '100%' }
            : { width: 1, height: '100%' }),
        },
        style,
      ]}
      {...props}
    />
  );
}
