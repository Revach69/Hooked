import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Dimensions,
} from 'react-native';
import { X, MapPin, Heart } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface UserProfileModalProps {
  visible: boolean;
  profile: any;
  onClose: () => void;
  onLike?: (_profile: any) => void;
  onSkip?: (_profile: any) => void;
  isLiked?: boolean;
  isSkipped?: boolean;
}

export default function UserProfileModal({ visible, profile, onClose, onLike, onSkip, isLiked = false, isSkipped = false }: UserProfileModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  if (!profile) return null;

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    modalContent: {
      backgroundColor: isDark ? '#1a1a1a' : 'white',
      borderRadius: 20,
      width: width * 0.9,
      maxHeight: height * 0.85,
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
      height: width * 0.9,
      backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileImage: {
      width: '100%',
      height: '100%',
      resizeMode: 'cover',
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
    contentContainer: {
      padding: 20,
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
      opacity: isSkipped ? 0.5 : 1,
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
      opacity: isLiked ? 0.5 : 1,
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
  });

  const handleLikePress = () => {
    if (onLike) {
      onLike(profile);
    }
  };

  const handleSkipPress = () => {
    if (onSkip) {
      onSkip(profile);
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
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity 
          style={styles.modalContent}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close profile" accessibilityHint="Close the profile modal">
            <X size={24} color="white" />
          </TouchableOpacity>

          {/* Profile Image */}
          <View style={styles.imageContainer}>
            {profile.profile_photo_url ? (
              <Image
                source={{ uri: profile.profile_photo_url }}
        onError={() => {}}
                style={styles.profileImage}
              />
            ) : (
              <View style={styles.fallbackAvatar}>
                <Text style={styles.fallbackText}>{profile.first_name[0]}</Text>
              </View>
            )}
          </View>

          {/* Profile Content */}
          <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
            {/* Header Section */}
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
                      disabled={isSkipped}
                      accessibilityRole="button"
                      accessibilityLabel={isSkipped ? 'Already skipped' : `Skip ${profile.first_name}`}
                      accessibilityHint={isSkipped ? 'You have already skipped this person' : 'Skip this profile'}
                      accessibilityState={{ disabled: isSkipped }}
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
                      disabled={isLiked}
                      accessibilityRole="button"
                      accessibilityLabel={isLiked ? 'Already liked' : `Like ${profile.first_name}`}
                      accessibilityHint={isLiked ? 'You have already liked this person' : 'Add like to this person'}
                      accessibilityState={{ disabled: isLiked }}
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
            </View>

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
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
} 