import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle, StyleProp } from 'react-native';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Tooltip({ content, children, style }: TooltipProps) {
  const [visible, setVisible] = useState(false);

  return (
    <View style={style}>
      <TouchableOpacity
        onLongPress={() => setVisible(true)}
        onPressOut={() => setVisible(false)}
      >
        {children}
      </TouchableOpacity>
      {visible && (
        <View style={styles.bubble} pointerEvents="none">
          <Text style={styles.text}>{content}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: '100%',
    backgroundColor: '#111',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 4,
  },
  text: {
    color: '#fff',
    fontSize: 12,
  },
});

