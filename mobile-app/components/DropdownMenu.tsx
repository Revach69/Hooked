import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { MoreVertical } from 'lucide-react-native';

interface DropdownMenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ size: number; color: string }>;
  onPress: () => void;
  destructive?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  triggerStyle?: object;
}

export default function DropdownMenu({ items, triggerStyle }: DropdownMenuProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<any>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const openDropdown = () => {
    triggerRef.current?.measure((fx: number, fy: number, width: number, height: number, px: number, py: number) => {
      const screenHeight = Dimensions.get('window').height;
      const dropdownHeight = items.length * 48 + 16; // Approximate dropdown height
      
      // Calculate position
      let top = py + height + 4;
      let right = Dimensions.get('window').width - (px + width);
      
      // Adjust if dropdown would go off screen
      if (top + dropdownHeight > screenHeight - 50) {
        top = py - dropdownHeight - 4;
      }
      
      setDropdownPosition({ top, right });
      setIsVisible(true);
    });
  };

  const closeDropdown = () => {
    setIsVisible(false);
  };

  const handleItemPress = (item: DropdownMenuItem) => {
    closeDropdown();
    item.onPress();
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={[styles.trigger, triggerStyle]}
        onPress={openDropdown}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MoreVertical size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={closeDropdown}
        >
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: isDark ? '#374151' : '#ffffff',
                borderColor: isDark ? '#4b5563' : '#e5e7eb',
                top: dropdownPosition.top,
                right: dropdownPosition.right,
              },
            ]}
          >
            {items.map((item, index) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.dropdownItem,
                  index !== items.length - 1 && styles.dropdownItemBorder,
                  { borderColor: isDark ? '#4b5563' : '#f3f4f6' },
                ]}
                onPress={() => handleItemPress(item)}
              >
                <item.icon 
                  size={18} 
                  color={item.destructive ? '#dc2626' : (isDark ? '#d1d5db' : '#374151')} 
                />
                <Text
                  style={[
                    styles.dropdownItemText,
                    {
                      color: item.destructive ? '#dc2626' : (isDark ? '#d1d5db' : '#374151'),
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    minWidth: 160,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
});