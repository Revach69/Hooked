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
import Toast from 'react-native-toast-message';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

interface CustomMatchToastProps {
  text1: string;
  text2?: string;
  onPress?: () => void;
  onHide?: () => void;
}



const createStyles = (isDark: boolean, text2?: string) => {
  
  return StyleSheet.create({
    container: {
      flexDirection: 'row' as const,
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
      width: Dimensions.get('window').width - 32,
      minHeight: 80,
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
    },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginRight: 12,
  },
  appIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center' as const,
  },
  text1: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: isDark ? '#ffffff' : '#000000',
    marginBottom: text2 ? 4 : 0,
    lineHeight: 22,
    flexShrink: 1,
  },
  text2: {
    fontSize: 14,
    color: isDark ? '#e5e7eb' : '#374151',
    lineHeight: 20,
    flexShrink: 1,
  },
  });
};

export const CustomMatchToast: React.FC<CustomMatchToastProps> = ({
  text1,
  text2,
  onPress,
  onHide,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Debug logging
  console.log('CustomMatchToast props:', { text1, text2, isDark });
  
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  
  // Auto-dismiss after 3.5 seconds
  React.useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -200,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Toast.hide();
        onHide?.();
      });
    }, 3500);
    
    return () => clearTimeout(timer);
  }, [translateY, opacity, onHide]);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.translationY < -50) {
        // Swipe up detected - dismiss the toast
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -200,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          Toast.hide();
          onHide?.();
        });
      } else {
        // Return to original position
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const styles = createStyles(isDark, text2);

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY }], opacity },
        ]}
      >
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <View style={styles.iconContainer}>
            <Image
              source={require('../../assets/icon.png')}
              style={styles.appIcon}
              resizeMode="cover"
            />
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
      </Animated.View>
    </PanGestureHandler>
  );
};

export default CustomMatchToast;