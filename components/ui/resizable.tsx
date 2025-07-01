import React from 'react';
import { View, ViewProps, ViewStyle, StyleSheet } from 'react-native';

interface PanelProps extends ViewProps {
  children?: React.ReactNode;
}

export function ResizablePanelGroup({ style, children, ...props }: PanelProps) {
  return (
    <View style={[styles.group, style as ViewStyle]} {...props}>
      {children}
    </View>
  );
}

export function ResizablePanel({ style, children, ...props }: PanelProps) {
  return (
    <View style={[styles.panel, style as ViewStyle]} {...props}>
      {children}
    </View>
  );
}

interface HandleProps extends ViewProps {
  withHandle?: boolean;
}

export function ResizableHandle({ withHandle, style, ...props }: HandleProps) {
  return (
    <View style={[styles.handle, style as ViewStyle]} {...props}>
      {withHandle ? <View style={styles.handleBar} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flex: 1, flexDirection: 'row' },
  panel: { flex: 1 },
  handle: {
    width: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleBar: {
    width: 2,
    height: 20,
    backgroundColor: '#ccc',
  },
});
