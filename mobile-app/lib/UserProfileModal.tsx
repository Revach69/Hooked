import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Dimensions,
  PanResponder,
  Animated,
  Image,
} from 'react-native';
import { X, MapPin, Heart, Instagram } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { ImageCacheService } from './services/ImageCacheService';
import { AsyncStorageUtils } from './asyncStorageUtils';

const { width, height } = Dimensions.get('window');

interface UserProfileModalProps {
  visible: boolean;
  profile: any;
  onClose: () => void;
  onLike?: (profile: any) => void;
  onSkip?: (profile: any) => void;
  isLiked?: boolean;
  isSkipped?: boolean;
}

export default function UserProfileModal({ visible, profile, onClose, onLike, onSkip, isLiked = false, isSkipped = false }: UserProfileModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Fix modal loading delays by preloading cached image
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  
  useEffect(() => {
    const loadCachedImage = async () => {
      if (profile?.profile_photo_url) {
        try {
          const eventId = await AsyncStorageUtils.getItem<string>('currentEventId');
          if (eventId) {
            // Get cached image URI for instant loading
            const cachedUri = await ImageCacheService.getCachedImageUri(
              profile.profile_photo_url,
              eventId,
              profile.session_id || 'modal'
            );
            setCachedImageUri(cachedUri);
          } else {
            setCachedImageUri(profile.profile_photo_url);
          }
        } catch (error) {
          console.warn('UserProfileModal: Failed to get cached image:', error);
          setCachedImageUri(profile.profile_photo_url);
        }
      } else {
        setCachedImageUri(null);
      }
    };
    
    if (visible && profile) {
      loadCachedImage();
    } else if (!visible) {
      // Clear cached URI when modal closes to prevent memory leaks
      setCachedImageUri(null);
    }
  }, [visible, profile?.profile_photo_url, profile?.session_id]);
  
  // Animation values for swipe gesture
  const translateY = useRef(new Animated.Value(0)).current;
  const scale = translateY.interpolate({
    inputRange: [-100, 0, 100],
    outputRange: [0.95, 1, 0.95],
    extrapolate: 'clamp',
  });
  const backgroundOpacity = translateY.interpolate({
    inputRange: [-100, -20, 0, 20, 100],
    outputRange: [0.4, 0.8, 0.8, 0.8, 0.4],
    extrapolate: 'clamp',
  });
  
  // PanResponder for swipe to dismiss (only active on image area)
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to clear vertical swipes with significant movement
        // This prevents conflicts with taps and accidental gestures
        const isVerticalSwipe = Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        const hasMovedEnough = Math.abs(gestureState.dy) > 15; // Increased threshold
        return isVerticalSwipe && hasMovedEnough;
      },
      onPanResponderMove: (_, gestureState) => {
        translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;
        const shouldDismiss = Math.abs(dy) > 80 || Math.abs(vy) > 0.8;
        
        if (shouldDismiss) {
          // Animate out before closing with velocity-based duration
          const dismissDirection = dy > 0 ? height : -height;
          const duration = Math.max(150, 300 - Math.abs(vy) * 100);
          
          Animated.timing(translateY, {
            toValue: dismissDirection,
            duration: duration,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0); // Reset for next time
            onClose();
          });
        } else {
          // Snap back to original position with smoother spring
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 150,
            friction: 8,
          }).start();
        }
      },
    })
  ).current;

  if (!profile) return null;

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    backgroundOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    touchableOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
    },
    modalContent: {
      backgroundColor: isDark ? '#1a1a1a' : 'white',
      borderRadius: 20,
      width: width * 0.9,
      overflow: 'hidden',
    },
    closeButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      zIndex: 10,
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    imageContainer: {
      width: '100%',
      height: 280,
      backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'contain',
    },
    fallbackAvatar: {
      width: width * 0.4,
      height: width * 0.4,
      borderRadius: (width * 0.4) / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: profile.profile_color || '#cccccc',
    },
    fallbackText: {
      fontSize: 48,
      fontWeight: 'bold',
      color: 'white',
    },
    basicInfoContainer: {
      padding: 20,
    },
    additionalInfoContainer: {
      maxHeight: 200,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    headerSection: {
      marginBottom: 20,
    },
    nameAgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    name: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginRight: 12,
    },
    age: {
      fontSize: 20,
      color: isDark ? '#9ca3af' : '#6b7280',
    },
    locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    locationText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      marginLeft: 6,
    },
    buttonsContainer: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 16,
      marginBottom: 8,
    },
    skipButton: {
      flex: 1,
      backgroundColor: '#6b7280',
      borderRadius: 25,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: (isSkipped || isLiked) ? 0.5 : 1, // Disable if skipped OR liked
    },
    likeButton: {
      flex: 1,
      backgroundColor: isLiked ? '#10b981' : '#8b5cf6',
      borderRadius: 25,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      opacity: (isLiked || isSkipped) ? 0.5 : 1, // Disable if liked OR skipped
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 12,
    },
    aboutMeText: {
      fontSize: 16,
      lineHeight: 24,
      color: isDark ? '#d1d5db' : '#374151',
    },
    interestsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    interestTag: {
      backgroundColor: isDark ? '#404040' : '#f3f4f6',
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    interestText: {
      fontSize: 14,
      color: isDark ? '#d1d5db' : '#374151',
      fontWeight: '500',
    },
    heightText: {
      fontSize: 16,
      color: isDark ? '#d1d5db' : '#374151',
    },
    emptyStateText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontStyle: 'italic',
    },
    instagramContainer: {
      alignItems: 'center',
      marginTop: 12,
      paddingVertical: 8,
    },
    instagramButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: 'rgba(228, 64, 95, 0.1)',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const handleLikePress = () => {
    if (onLike) {
      onLike(profile);
      // Auto close modal after like action
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const handleSkipPress = () => {
    if (onSkip) {
      onSkip(profile);
      // Auto close modal after skip action
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const handleInstagramPress = () => {
    if (profile.instagram_handle) {
      const instagramUrl = `instagram://user?username=${profile.instagram_handle}`;
      const webUrl = `https://instagram.com/${profile.instagram_handle}`;
      
      Linking.canOpenURL(instagramUrl)
        .then((supported) => {
          if (supported) {
            Linking.openURL(instagramUrl);
          } else {
            Linking.openURL(webUrl);
          }
        })
        .catch(() => {
          Linking.openURL(webUrl);
        });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <View style={styles.modalOverlay}>
        <Animated.View 
          style={[styles.backgroundOverlay, { opacity: backgroundOpacity }]}
        />
        <TouchableOpacity 
          style={styles.touchableOverlay}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View 
          style={[
            styles.modalContent,
            {
              transform: [{ translateY: translateY }, { scale: scale }],
            },
          ]}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close profile" accessibilityHint="Close the profile modal">
            <X size={24} color="white" />
          </TouchableOpacity>

          {/* Profile Image - Swipeable */}
          <View style={styles.imageContainer} {...panResponder.panHandlers}>
            {cachedImageUri ? (
              <Image
                source={{ uri: cachedImageUri }}
                onError={() => {
                  console.warn('UserProfileModal: Image failed to load, falling back to avatar');
                  setCachedImageUri(null);
                }}
                style={styles.profileImage}
                loadingIndicatorSource={require('../assets/Hooked Full Logo.png')}
              />
            ) : (
              <View style={styles.fallbackAvatar}>
                <Text style={styles.fallbackText}>{profile?.first_name?.[0] || '?'}</Text>
              </View>
            )}
          </View>

          {/* Basic Info - Always Visible */}
          <View style={styles.basicInfoContainer}>
            <View style={styles.headerSection}>
              <View style={styles.nameAgeRow}>
                <Text style={styles.name}>{profile.first_name}</Text>
                <Text style={styles.age}>{profile.age}</Text>
              </View>
              {/* Location - Optional */}
              {profile.location && (
                <View style={styles.locationRow}>
                  <MapPin size={16} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <Text style={styles.locationText}>{profile.location}</Text>
                </View>
              )}
              
              {/* Skip and Like Buttons */}
              {(onSkip || onLike) && (
                <View style={styles.buttonsContainer}>
                  {onSkip && (
                    <TouchableOpacity 
                      style={styles.skipButton} 
                      onPress={handleSkipPress}
                      disabled={isSkipped || isLiked}
                      accessibilityRole="button"
                      accessibilityLabel={isSkipped ? 'Already skipped' : isLiked ? 'Cannot skip liked profile' : `Skip ${profile.first_name}`}
                      accessibilityHint={isSkipped ? 'You have already skipped this person' : isLiked ? 'You cannot skip a profile you have liked' : 'Skip this profile'}
                      accessibilityState={{ disabled: isSkipped || isLiked }}
                    >
                      <X 
                        size={20} 
                        color="white" 
                      />
                      <Text style={styles.buttonText}>
                        {isSkipped ? 'Skipped' : 'Skip'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {onLike && (
                    <TouchableOpacity 
                      style={styles.likeButton} 
                      onPress={handleLikePress}
                      disabled={isLiked || isSkipped}
                      accessibilityRole="button"
                      accessibilityLabel={isLiked ? 'Already liked' : isSkipped ? 'Cannot like skipped profile' : `Like ${profile.first_name}`}
                      accessibilityHint={isLiked ? 'You have already liked this person' : isSkipped ? 'You cannot like a profile you have skipped' : 'Add like to this person'}
                      accessibilityState={{ disabled: isLiked || isSkipped }}
                    >
                      <Heart 
                        size={20} 
                        color="white" 
                        fill={isLiked ? "white" : "none"}
                      />
                      <Text style={styles.buttonText}>
                        {isLiked ? 'Liked!' : 'Like'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              {/* Instagram - Optional - Positioned after buttons */}
              {profile.instagram_handle && (
                <View style={styles.instagramContainer}>
                  <TouchableOpacity style={styles.instagramButton} onPress={handleInstagramPress}>
                    <Instagram size={32} color="#E4405F" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          {/* Additional Info - Scrollable if present */}
          {((profile.about_me && profile.about_me.trim().length > 0) || 
            (Array.isArray(profile.interests) && profile.interests.length > 0) || 
            profile.height_cm) && (
            <ScrollView 
              style={styles.additionalInfoContainer} 
              showsVerticalScrollIndicator={false}
            >
              {/* About Me Section - Only if present */}
              {profile.about_me && profile.about_me.trim().length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About Me</Text>
                  <Text style={styles.aboutMeText}>{profile.about_me}</Text>
                </View>
              )}

              {/* Interests Section - Only if present */}
              {Array.isArray(profile.interests) && profile.interests.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Interests</Text>
                  <View style={styles.interestsContainer}>
                    {profile.interests.map((interest: string, index: number) => (
                      <View key={index} style={styles.interestTag}>
                        <Text style={styles.interestText}>
                          {interest.charAt(0).toUpperCase() + interest.slice(1)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Height Section - Only if present */}
              {profile.height_cm && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Height</Text>
                  <Text style={styles.heightText}>{profile.height_cm} cm</Text>
                </View>
              )}
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
} 