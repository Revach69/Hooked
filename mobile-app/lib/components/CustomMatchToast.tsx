import React, { useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  useColorScheme,
  Dimensions,
  Animated,
} from 'react-native';
import { Heart } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

interface CustomMatchToastProps {
  text1: string;
  text2?: string;
  onPress?: () => void;
  onHide?: () => void;
}

export const CustomMatchToast: React.FC<CustomMatchToastProps> = ({
  text1,
  text2,
  onPress,
  onHide,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: isDark ? '#1f2937' : '#ffffff',
      borderRadius: 16,
      padding: 16,
      marginHorizontal: 16,
      marginTop: 60,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: isDark ? '#374151' : '#e5e7eb',
      maxWidth: Dimensions.get('window').width - 32,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: '#8b5cf6',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 12,
    },
    appIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    contentContainer: {
      flex: 1,
      justifyContent: 'center',
    },
    text1: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: text2 ? 4 : 0,
    },
    text2: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    heartIcon: {
      position: 'absolute',
      top: -2,
      right: -2,
      backgroundColor: '#ef4444',
      borderRadius: 8,
      padding: 2,
    },
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.iconContainer}>
        <Image
          source={require('../../assets/icon.png')}
          style={styles.appIcon}
          resizeMode="cover"
        />
        <View style={styles.heartIcon}>
          <Heart size={12} color="#ffffff" fill="#ffffff" />
        </View>
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.text1} numberOfLines={2}>
          {text1}
        </Text>
        {text2 && (
          <Text style={styles.text2} numberOfLines={1}>
            {text2}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default CustomMatchToast;