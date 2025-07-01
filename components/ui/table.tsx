import React from 'react';
import { View, Text, ViewProps, TextProps, ViewStyle } from 'react-native';

export const Table = React.forwardRef<View, ViewProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={style as ViewStyle} {...props}>
    {children}
  </View>
));
Table.displayName = 'Table';

export const TableHeader = React.forwardRef<View, ViewProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={style as ViewStyle} {...props}>{children}</View>
));
TableHeader.displayName = 'TableHeader';

export const TableBody = React.forwardRef<View, ViewProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={style as ViewStyle} {...props}>{children}</View>
));
TableBody.displayName = 'TableBody';

export const TableFooter = React.forwardRef<View, ViewProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={style as ViewStyle} {...props}>{children}</View>
));
TableFooter.displayName = 'TableFooter';

export const TableRow = React.forwardRef<View, ViewProps>(({ style, children, ...props }, ref) => (
  <View ref={ref} style={style as ViewStyle} {...props}>{children}</View>
));
TableRow.displayName = 'TableRow';

export const TableHead = React.forwardRef<Text, TextProps>(({ style, children, ...props }, ref) => (
  <Text ref={ref} style={style} {...props}>{children}</Text>
));
TableHead.displayName = 'TableHead';

export const TableCell = React.forwardRef<Text, TextProps>(({ style, children, ...props }, ref) => (
  <Text ref={ref} style={style} {...props}>{children}</Text>
));
TableCell.displayName = 'TableCell';

export const TableCaption = React.forwardRef<Text, TextProps>(({ style, children, ...props }, ref) => (
  <Text ref={ref} style={style} {...props}>{children}</Text>
));
TableCaption.displayName = 'TableCaption';

export default Table;
