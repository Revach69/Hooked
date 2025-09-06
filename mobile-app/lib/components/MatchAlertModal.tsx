import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  Dimensions,
  PanResponder,
  Animated,
  ImageBackground,
} from 'react-native';
import { X, MessageCircle, Heart } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface MatchAlertModalProps {
  visible: boolean;
  partnerName: string;
  partnerImage?: string;
  onStartChatting: () => void;
  onClose: () => void;
}

export default function MatchAlertModal({ 
  visible, 
  partnerName, 
  partnerImage, 
  onStartChatting, 
  onClose 
}: MatchAlertModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Animation values for swipe gesture and entrance
  const translateY = useRef(new Animated.Value(height)).current;
  const scale = useRef(new Animated.Value(0.8)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  
  // Animate in when visible
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          damping: 20,
          stiffness: 150,
        }),
        Animated.timing(backgroundOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      // Reset values when closing
      translateY.setValue(height);
      scale.setValue(0.8);
      backgroundOpacity.setValue(0);
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: height,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150,
      }),
      Animated.spring(scale, {
        toValue: 0.8,
        useNativeDriver: true,
        damping: 20,
        stiffness: 150,
      }),
      Animated.timing(backgroundOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start(() => {
      onClose();
    });
  };

  const handleStartChatting = () => {
    handleClose();
    // Delay navigation slightly to allow modal to close
    setTimeout(() => {
      onStartChatting();
    }, 100);
  };

  // PanResponder for swipe to dismiss
  const panResponder = React.useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        // No-op
      },
      onPanResponderMove: (evt, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          // Dismiss if swiped down significantly
          handleClose();
        } else {
          // Spring back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 150,
          }).start();
        }
      },
    }),
    []
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View 
        style={[
          styles.backdrop,
          { opacity: backgroundOpacity }
        ]}
      >
        <TouchableOpacity 
          style={styles.backdropTouchable} 
          activeOpacity={1} 
          onPress={handleClose}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [
                  { translateY },
                  { scale }
                ]
              }
            ]}
            {...panResponder.panHandlers}
          >
            <TouchableOpacity 
              activeOpacity={1} 
              style={styles.modalContent}
              onPress={() => {}} // Prevent backdrop dismiss when touching modal content
            >
              {/* Close button */}
              <TouchableOpacity
                style={[styles.closeButton, isDark && styles.closeButtonDark]}
                onPress={handleClose}
                accessibilityRole="button"
                accessibilityLabel="Close match alert"
              >
                <X color={isDark ? '#ffffff' : '#000000'} size={24} />
              </TouchableOpacity>

              {/* Match celebration content */}
              <View style={styles.contentContainer}>
                {/* Hearts animation area */}
                <View style={styles.celebrationContainer}>
                  <Heart color="#FF6B6B" size={60} fill="#FF6B6B" />
                  <Text style={[styles.itsAMatchText, isDark && styles.itsAMatchTextDark]}>
                    It's a Match!
                  </Text>
                  <Text style={[styles.partnerNameText, isDark && styles.partnerNameTextDark]}>
                    {partnerName}
                  </Text>
                </View>

                {/* Partner image (if available) */}
                {partnerImage && (
                  <View style={styles.imageContainer}>
                    <ImageBackground
                      source={{ uri: partnerImage }}
                      style={styles.partnerImage}
                      imageStyle={styles.partnerImageStyle}
                    />
                  </View>
                )}

                {/* Action button */}
                <View style={styles.actionContainer}>
                  <TouchableOpacity
                    style={[styles.startChattingButton, isDark && styles.startChattingButtonDark]}
                    onPress={handleStartChatting}
                    accessibilityRole="button"
                    accessibilityLabel={`Start chatting with ${partnerName}`}
                  >
                    <MessageCircle 
                      color="#ffffff" 
                      size={24} 
                      style={styles.buttonIcon} 
                    />
                    <Text style={styles.startChattingText}>
                      Start Chatting
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdropTouchable: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
  },
  modalContent: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonDark: {
    backgroundColor: '#333333',
  },
  contentContainer: {
    padding: 32,
    paddingTop: 60, // Account for close button
    alignItems: 'center',
  },
  celebrationContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  itsAMatchText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B6B',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  itsAMatchTextDark: {
    color: '#FF6B6B', // Keep same color in dark mode for brand consistency
  },
  partnerNameText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    textAlign: 'center',
  },
  partnerNameTextDark: {
    color: '#ffffff',
  },
  imageContainer: {
    width: 120,
    height: 120,
    marginBottom: 32,
    borderRadius: 60,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  partnerImage: {
    width: '100%',
    height: '100%',
  },
  partnerImageStyle: {
    borderRadius: 60,
  },
  actionContainer: {
    width: '100%',
  },
  startChattingButton: {
    flexDirection: 'row',
    backgroundColor: '#FF6B6B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startChattingButtonDark: {
    backgroundColor: '#FF6B6B', // Keep brand color in dark mode
  },
  buttonIcon: {
    marginRight: 8,
  },
  startChattingText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});