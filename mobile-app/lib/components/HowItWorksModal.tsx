import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
  useColorScheme,
  Animated,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { X } from 'lucide-react-native';
import { HowItWorksUtils } from '../utils/howItWorksUtils';

interface Card {
  id: string;
  title: string;
  description: string;
  imageName: string;
}

interface HowItWorksModalProps {
  visible: boolean;
  onClose: () => void;
  eventId: string;
}

const cards: Card[] = [
  {
    id: 'discover',
    title: 'Discover',
    description: "See who's single at this event and send a like ❤️",
    imageName: 'Discover',
  },
  {
    id: 'matches',
    title: 'Matches',
    description: "If they like you back\nit's a match!",
    imageName: 'Match',
  },
  {
    id: 'chat',
    title: 'Chat',
    description: "Start a chat — or meet IRL\nNo pressure",
    imageName: 'Chat',
  },
  {
    id: 'disappears',
    title: 'Disappears After',
    description: "Everything vanishes after the event\nprofiles and chats are gone",
    imageName: 'Disappears After',
  },
];

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const cardWidth = screenWidth * 0.8;

export const HowItWorksModal: React.FC<HowItWorksModalProps> = ({
  visible,
  onClose,
  eventId,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ 
        index: nextIndex, 
        animated: true 
      });
    }
  };

  const handleClose = async () => {
    // Always mark this event as seen (so user won't see modal again for this event)
    await HowItWorksUtils.markHowItWorksModalSeen(eventId);
    
    // If "Don't show again" is checked, hide globally for all future events
    if (dontShowAgain) {
      await HowItWorksUtils.setHideHowItWorksModal();
    }
    
    // Reset state for next time
    setCurrentIndex(0);
    setDontShowAgain(false);
    onClose();
  };

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / cardWidth);
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < cards.length) {
      setCurrentIndex(newIndex);
    }
  };

  const translateY = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: true }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const translationY = event.nativeEvent.translationY;
      if (translationY < -50 || translationY > 50) {
        // Swipe up or down detected - dismiss the modal
        handleClose();
      } else {
        // Return to original position
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const renderCard = ({ item }: { item: Card }) => (
    <View style={[styles.card, { width: cardWidth }]}>
      <Image
        source={
          item.imageName === 'Discover' ? require('../../assets/Discover.png') :
          item.imageName === 'Match' ? require('../../assets/Match.png') :
          item.imageName === 'Chat' ? require('../../assets/Chat.png') :
          require('../../assets/Disappears After.png')
        }
        style={styles.cardImage}
        resizeMode="contain"
      />
      <Text style={[styles.cardTitle, { color: isDark ? '#ffffff' : '#1f2937' }]}>
        {item.title}
      </Text>
      <Text style={[styles.cardDescription, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
        {item.description}
      </Text>
    </View>
  );

  const renderDot = (index: number) => (
    <View
      key={index}
      style={[
        styles.dot,
        {
          backgroundColor: index === currentIndex ? '#8b5cf6' : (isDark ? '#404040' : '#d1d5db'),
        },
      ]}
    />
  );

  const isLastCard = currentIndex === cards.length - 1;

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      width: screenWidth * 0.9,
      maxHeight: screenHeight * 0.85,
      backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
      borderRadius: 20,
      paddingTop: 20,
      paddingBottom: 30,
      paddingHorizontal: 20,
      alignItems: 'center',
    },
    closeButton: {
      position: 'absolute',
      top: 20,
      right: 20,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    card: {
      alignItems: 'center',
      paddingHorizontal: 8, // Reduced from 20 to give more text width
      paddingTop: 30,
      paddingBottom: 0, // Remove bottom padding to control spacing precisely
    },
    cardImage: {
      width: cardWidth * 0.95, // Even larger - 95% of modal width
      height: cardWidth * 0.7, // Maintain aspect ratio
      marginBottom: 24,
    },
    cardTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    cardDescription: {
      fontSize: 18,
      textAlign: 'center',
      lineHeight: 26,
      paddingHorizontal: 8,
      maxWidth: cardWidth * 1.0, // Full card width to allow longer lines
    },
    dotsContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: 16, // Match the title-body spacing (16px)
      marginBottom: 30,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginHorizontal: 4,
    },
    footerContainer: {
      alignItems: 'center',
      width: '100%',
    },
    checkboxContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: isDark ? '#6b7280' : '#9ca3af',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    checkboxChecked: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    checkmark: {
      color: '#ffffff',
      fontSize: 12,
      fontWeight: 'bold',
    },
    checkboxLabel: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    nextButton: {
      backgroundColor: '#8b5cf6',
      paddingVertical: 16,
      paddingHorizontal: 32,
      borderRadius: 12,
      width: '100%',
      alignItems: 'center',
    },
    nextButtonText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '600',
    },
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      accessibilityViewIsModal={true}
    >
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
      >
        <Animated.View style={[styles.modalOverlay, { transform: [{ translateY }] }]}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={handleClose}
              accessibilityRole="button"
              accessibilityLabel="Close modal"
              accessibilityHint="Close the how it works modal"
            >
              <X size={18} color={isDark ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>

            <FlatList
              ref={flatListRef}
              data={cards}
              renderItem={renderCard}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={handleScroll}
              keyExtractor={(item) => item.id}
              getItemLayout={(_, index) => ({
                length: cardWidth,
                offset: cardWidth * index,
                index,
              })}
            />

            <View style={styles.dotsContainer}>
              {cards.map((_, index) => renderDot(index))}
            </View>

            <View style={styles.footerContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setDontShowAgain(!dontShowAgain)}
                accessibilityRole="checkbox"
                accessibilityLabel="Don't show this again"
                accessibilityState={{ checked: dontShowAgain }}
              >
                <View style={[styles.checkbox, dontShowAgain && styles.checkboxChecked]}>
                  {dontShowAgain && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Don't show this again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={isLastCard ? handleClose : handleNext}
                accessibilityRole="button"
                accessibilityLabel={isLastCard ? 'Close' : 'Next'}
                accessibilityHint={isLastCard ? 'Close the modal' : 'Go to the next card'}
              >
                <Text style={styles.nextButtonText}>
                  {isLastCard ? 'Close' : 'Next'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
};