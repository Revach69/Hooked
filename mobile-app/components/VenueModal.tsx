import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Linking,
  Dimensions,
  PanResponder,
  Animated,
} from 'react-native';
import type { ScrollView as ScrollViewType } from 'react-native';
import {
  X,
  MapPin,
  Phone,
  Instagram,
  Facebook,
  Globe,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Custom WhatsApp icon component
const WhatsAppIcon = ({ size = 24, color }: { size?: number; color: string }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.465 3.085"
      fill={color}
    />
  </Svg>
);

interface VenueModalProps {
  visible: boolean;
  venue: any;
  userLocation?: { latitude: number; longitude: number } | null;
  onClose: () => void;
}

export default function VenueModal({ visible, venue, userLocation, onClose }: VenueModalProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  // Animation and gesture states
  const [modalHeight, setModalHeight] = useState<'half' | 'full'>('half');
  const translateY = useRef(new Animated.Value(screenHeight * 0.5)).current;
  const lastGestureDy = useRef(0);
  const scrollViewRef = useRef<ScrollViewType>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  
  // Reset modal to half screen when opened
  useEffect(() => {
    if (visible) {
      setModalHeight('half');
      setScrollOffset(0); // Reset scroll position when modal opens
      Animated.spring(translateY, {
        toValue: screenHeight * 0.5,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    }
  }, [visible]);
  
  // Restore scroll position when modal height changes
  useEffect(() => {
    if (visible && scrollViewRef.current && scrollOffset > 0) {
      const timer = setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: false });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [modalHeight, visible]);
  
  // Reset scroll when venue changes
  useEffect(() => {
    if (venue && visible) {
      setScrollOffset(0);
      if (scrollViewRef.current) {
        scrollViewRef.current.scrollTo({ y: 0, animated: false });
      }
    }
  }, [venue?.id, visible]);
  
  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        // Only respond to touches on the header area (drag handle and header)
        return evt.nativeEvent.pageY < screenHeight * 0.5 + 100; // Approximate header height
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        lastGestureDy.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        lastGestureDy.current = gestureState.dy;
        
        // Calculate new position based on current modal height
        let newTranslateY;
        if (modalHeight === 'half') {
          newTranslateY = screenHeight * 0.5 + gestureState.dy;
        } else {
          newTranslateY = screenHeight * 0.1 + gestureState.dy;
        }
        
        // Clamp the values to prevent over-scrolling
        if (newTranslateY < screenHeight * 0.1) {
          newTranslateY = screenHeight * 0.1;
        } else if (newTranslateY > screenHeight) {
          newTranslateY = screenHeight;
        }
        
        translateY.setValue(newTranslateY);
      },
      onPanResponderRelease: () => {
        const currentY = translateY._value;
        const velocity = lastGestureDy.current;
        
        // Determine target position based on current position and velocity
        let targetY;
        let newHeight: 'half' | 'full' | 'dismissed' = 'half';
        
        if (velocity < -50) {
          // Fast swipe up - go to full screen
          targetY = screenHeight * 0.1;
          newHeight = 'full';
        } else if (velocity > 50) {
          // Fast swipe down
          if (modalHeight === 'full') {
            // From full to half
            targetY = screenHeight * 0.5;
            newHeight = 'half';
          } else {
            // From half to dismissed
            targetY = screenHeight;
            newHeight = 'dismissed';
          }
        } else {
          // Slow drag - snap to nearest position
          if (currentY < screenHeight * 0.3) {
            // Snap to full
            targetY = screenHeight * 0.1;
            newHeight = 'full';
          } else if (currentY < screenHeight * 0.75) {
            // Snap to half
            targetY = screenHeight * 0.5;
            newHeight = 'half';
          } else {
            // Dismiss
            targetY = screenHeight;
            newHeight = 'dismissed';
          }
        }
        
        // Animate to target position
        Animated.spring(translateY, {
          toValue: targetY,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }).start(() => {
          if (newHeight === 'dismissed') {
            onClose();
          } else {
            setModalHeight(newHeight as 'half' | 'full');
          }
        });
      },
    })
  ).current;

  if (!venue) return null;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): string => {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c;
    return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
  };

  const getDistance = (): string => {
    if (!userLocation || !venue.coordinates) return '';
    const [venueLon, venueLat] = venue.coordinates;
    return calculateDistance(userLocation.latitude, userLocation.longitude, venueLat, venueLon);
  };

  const handlePhonePress = () => {
    if (venue.phone) {
      Linking.openURL(`tel:${venue.phone}`);
    }
  };

  const handleInstagramPress = () => {
    if (venue.socialMedia?.instagram) {
      const username = venue.socialMedia.instagram.replace('@', '');
      Linking.openURL(`https://instagram.com/${username}`);
    }
  };

  const handleFacebookPress = () => {
    if (venue.socialMedia?.facebook) {
      Linking.openURL(venue.socialMedia.facebook);
    }
  };

  const handleWhatsAppPress = () => {
    if (venue.phone) {
      const phoneNumber = venue.phone.replace(/[^\d+]/g, '');
      Linking.openURL(`whatsapp://send?phone=${phoneNumber}`);
    }
  };

  const handleWebsitePress = () => {
    if (venue.website) {
      Linking.openURL(venue.website);
    }
  };

  // Mock opening hours - in real implementation, these would come from venue data
  const openingHours = venue.openingHours || {
    monday: { open: '09:00', close: '22:00', closed: false },
    tuesday: { open: '09:00', close: '22:00', closed: false },
    wednesday: { open: '09:00', close: '22:00', closed: false },
    thursday: { open: '09:00', close: '22:00', closed: false },
    friday: { open: '09:00', close: '23:00', closed: false },
    saturday: { open: '10:00', close: '23:00', closed: false },
    sunday: { open: '10:00', close: '21:00', closed: false },
  };

  const hookedHours = venue.hookedHours || {
    monday: { open: '19:00', close: '22:00', closed: false },
    tuesday: { open: '19:00', close: '22:00', closed: false },
    wednesday: { open: '19:00', close: '22:00', closed: false },
    thursday: { open: '19:00', close: '23:00', closed: false },
    friday: { open: '19:00', close: '24:00', closed: false },
    saturday: { open: '18:00', close: '24:00', closed: false },
    sunday: { open: '18:00', close: '21:00', closed: false },
  };

  const formatDayName = (day: string, short: boolean = false) => {
    const days = {
      monday: short ? 'Mon' : 'Monday',
      tuesday: short ? 'Tue' : 'Tuesday',
      wednesday: short ? 'Wed' : 'Wednesday',
      thursday: short ? 'Thu' : 'Thursday',
      friday: short ? 'Fri' : 'Friday',
      saturday: short ? 'Sat' : 'Saturday',
      sunday: short ? 'Sun' : 'Sunday',
    };
    return days[day as keyof typeof days];
  };

  const formatTime = (time: string) => {
    if (time === '24:00') return '00:00';
    return time;
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'transparent',
      justifyContent: 'flex-end',
    },
    overlayTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: screenHeight * 0.5,
      backgroundColor: modalHeight === 'full' ? 'rgba(0, 0, 0, 0.3)' : 'transparent',
      pointerEvents: modalHeight === 'full' ? 'auto' : 'none',
    },
    modalContainer: {
      backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      height: screenHeight,
      paddingTop: 10,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: -3,
      },
      shadowOpacity: 0.25,
      shadowRadius: 10,
      elevation: 10,
    },
    headerArea: {
      // Area for pan gestures - includes drag handle and header
    },
    dragHandle: {
      width: 40,
      height: 4,
      backgroundColor: isDark ? '#666' : '#ccc',
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#eee',
    },
    venueName: {
      fontSize: 20,
      fontWeight: 'bold',
      color: isDark ? '#fff' : '#1f2937',
      flex: 1,
      marginRight: 16,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: isDark ? '#333' : '#f3f4f6',
      justifyContent: 'center',
      alignItems: 'center',
    },
    content: {
      flex: 1,
      marginBottom: 40,
    },
    scrollContent: {
      flex: 1,
    },
    scrollContentContainer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 100,
      flexGrow: 1,
    },
    section: {
      marginBottom: 24,
    },
    sectionTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: isDark ? '#fff' : '#1f2937',
    },
    sectionIcon: {
      marginRight: 8,
    },
    hoursContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    hoursColumn: {
      flex: 1,
      marginRight: 16,
    },
    hoursTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#e5e7eb' : '#374151',
      marginBottom: 8,
    },
    hoursRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    dayName: {
      fontSize: 14,
      color: isDark ? '#9ca3af' : '#6b7280',
      minWidth: 80,
    },
    hours: {
      fontSize: 14,
      color: isDark ? '#d1d5db' : '#374151',
    },
    closedText: {
      fontSize: 14,
      color: isDark ? '#ef4444' : '#dc2626',
      fontStyle: 'italic',
    },
    addressContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    address: {
      fontSize: 16,
      color: isDark ? '#d1d5db' : '#374151',
      flex: 1,
      marginRight: 16,
      lineHeight: 22,
    },
    distance: {
      fontSize: 14,
      color: '#8b5cf6',
      fontWeight: '600',
    },
    phoneNumber: {
      fontSize: 16,
      color: '#8b5cf6',
      textDecorationLine: 'underline',
    },
    socialIconsContainer: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      paddingTop: 8,
      gap: 16,
      flexWrap: 'wrap',
    },
    socialIcon: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
      borderWidth: 2,
      borderColor: isDark ? '#333' : '#e5e7eb',
      justifyContent: 'center',
      alignItems: 'center',
    },
    socialIconActive: {
      backgroundColor: isDark ? '#1f1f1f' : '#ffffff',
      borderColor: '#8b5cf6',
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Top overlay - blocks interaction when modal is full screen */}
        <View style={styles.overlayTop} />
        
        <Animated.View 
          style={[
            styles.modalContainer,
            {
              transform: [{ translateY }],
            },
          ]}
        >
          <View {...panResponder.panHandlers} style={styles.headerArea}>
            <View style={styles.dragHandle} />
          
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.venueName}>{venue.name}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color={isDark ? '#fff' : '#374151'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <View style={styles.content}>
            <ScrollView 
              ref={scrollViewRef}
              style={styles.scrollContent} 
              showsVerticalScrollIndicator={false}
              scrollEventThrottle={16}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              contentContainerStyle={styles.scrollContentContainer}
              onScroll={(event) => {
                const currentOffset = event.nativeEvent.contentOffset.y;
                setScrollOffset(currentOffset);
              }}
              onContentSizeChange={(contentWidth, contentHeight) => {
                // Restore scroll position after content size changes
                if (visible && scrollViewRef.current && scrollOffset > 0 && contentHeight > 0) {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: scrollOffset, animated: false });
                  }, 50);
                }
              }}
            >
              {/* Hours Section */}
              <View style={styles.section}>
                <View style={styles.hoursContainer}>
                  {/* Opening Hours */}
                  <View style={styles.hoursColumn}>
                    <Text style={styles.hoursTitle}>Opening Hours</Text>
                    {Object.entries(openingHours).map(([day, hours]) => (
                      <View key={day} style={styles.hoursRow}>
                        <Text style={styles.dayName}>{formatDayName(day, true)}</Text>
                        {hours.closed ? (
                          <Text style={styles.closedText}>Closed</Text>
                        ) : (
                          <Text style={styles.hours}>
                            {formatTime(hours.open)} - {formatTime(hours.close)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Hooked Hours */}
                  <View style={styles.hoursColumn}>
                    <Text style={styles.hoursTitle}>Hooked Hours</Text>
                    {Object.entries(hookedHours).map(([day, hours]) => (
                      <View key={day} style={styles.hoursRow}>
                        <Text style={styles.dayName}>{formatDayName(day, true)}</Text>
                        {hours.closed ? (
                          <Text style={styles.closedText}>Closed</Text>
                        ) : (
                          <Text style={styles.hours}>
                            {formatTime(hours.open)} - {formatTime(hours.close)}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              </View>

              {/* Address Section */}
              <View style={styles.section}>
                <View style={styles.sectionTitleContainer}>
                  <MapPin size={20} color={isDark ? '#8b5cf6' : '#8b5cf6'} style={styles.sectionIcon} />
                  <Text style={styles.sectionTitle}>Address</Text>
                </View>
                <View style={styles.addressContainer}>
                  <Text style={styles.address}>{venue.address}</Text>
                  {getDistance() && (
                    <Text style={styles.distance}>{getDistance()}</Text>
                  )}
                </View>
              </View>

              {/* Phone Section */}
              {venue.phone && (
                <View style={styles.section}>
                  <View style={styles.sectionTitleContainer}>
                    <Phone size={20} color={isDark ? '#8b5cf6' : '#8b5cf6'} style={styles.sectionIcon} />
                    <Text style={styles.sectionTitle}>Phone</Text>
                  </View>
                  <TouchableOpacity onPress={handlePhonePress}>
                    <Text style={styles.phoneNumber}>{venue.phone}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Social Media Icons - Only show if links are provided */}
              {(venue.socialMedia?.instagram || venue.socialMedia?.facebook || venue.phone || venue.website) && (
                <View style={styles.section}>
                  <View style={styles.socialIconsContainer}>
                    {venue.socialMedia?.instagram && (
                      <TouchableOpacity
                        style={[styles.socialIcon, styles.socialIconActive]}
                        onPress={handleInstagramPress}
                      >
                        <Instagram 
                          size={24} 
                          color={isDark ? '#ffffff' : '#000000'} 
                        />
                      </TouchableOpacity>
                    )}

                    {venue.socialMedia?.facebook && (
                      <TouchableOpacity
                        style={[styles.socialIcon, styles.socialIconActive]}
                        onPress={handleFacebookPress}
                      >
                        <Facebook 
                          size={24} 
                          color={isDark ? '#ffffff' : '#000000'} 
                        />
                      </TouchableOpacity>
                    )}

                    {venue.phone && (
                      <TouchableOpacity
                        style={[styles.socialIcon, styles.socialIconActive]}
                        onPress={handleWhatsAppPress}
                      >
                        <WhatsAppIcon 
                          size={24} 
                          color={isDark ? '#ffffff' : '#000000'}
                        />
                      </TouchableOpacity>
                    )}

                    {venue.website && (
                      <TouchableOpacity
                        style={[styles.socialIcon, styles.socialIconActive]}
                        onPress={handleWebsitePress}
                      >
                        <Globe 
                          size={24} 
                          color={isDark ? '#ffffff' : '#000000'} 
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}