import * as React from 'react';
import { useRef } from 'react';
import {
  StyleSheet,
  Dimensions,
  ImageStyle,
  ViewStyle,
} from 'react-native';
import {
  GestureHandlerRootView,
  PinchGestureHandler,
  PanGestureHandler,
  PinchGestureHandlerGestureEvent,
  PanGestureHandlerGestureEvent,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface ZoomableImageProps {
  source: { uri: string };
  style?: ImageStyle;
  containerStyle?: ViewStyle;
  maxZoom?: number;
  minZoom?: number;
  onZoomStart?: () => void;
  onZoomEnd?: () => void;
}

export default function ZoomableImage({
  source,
  style,
  containerStyle,
  maxZoom = 4,
  minZoom = 1,
  onZoomStart,
  onZoomEnd,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  
  const panRef = useRef<PanGestureHandler>(null);
  const pinchRef = useRef<PinchGestureHandler>(null);
  
  // Track if we're currently zoomed
  const isZoomed = useSharedValue(false);
  
  const pinchHandler = useAnimatedGestureHandler<PinchGestureHandlerGestureEvent>({
    onStart: () => {
      'worklet';
      if (onZoomStart) {
        runOnJS(onZoomStart)();
      }
      isZoomed.value = true;
    },
    onActive: (event) => {
      'worklet';
      // Apply scale with smooth constraints - allows fractional zoom levels
      // event.scale naturally provides continuous values (1.0, 1.1, 1.2, etc.)
      const newScale = Math.min(Math.max(event.scale, minZoom), maxZoom);
      scale.value = newScale;
      
      // Adjust focal point for pinch center to zoom towards finger position
      focalX.value = event.focalX - screenWidth / 2;
      focalY.value = event.focalY - 140; // Approximate image center height
    },
    onEnd: () => {
      'worklet';
      // Always snap back to 1x zoom when user releases pinch
      scale.value = withSpring(1, {
        damping: 12,
        stiffness: 150,
        mass: 0.8,
      });
      translateX.value = withSpring(0, {
        damping: 12,
        stiffness: 150,
        mass: 0.8,
      });
      translateY.value = withSpring(0, {
        damping: 12,
        stiffness: 150,
        mass: 0.8,
      });
      focalX.value = withSpring(0, {
        damping: 12,
        stiffness: 150,
        mass: 0.8,
      });
      focalY.value = withSpring(0, {
        damping: 12,
        stiffness: 150,
        mass: 0.8,
      });
      isZoomed.value = false;
      
      if (onZoomEnd) {
        runOnJS(onZoomEnd)();
      }
    },
  });
  
  const panHandler = useAnimatedGestureHandler<PanGestureHandlerGestureEvent>({
    onStart: () => {
      'worklet';
      // Only allow panning when zoomed
      if (scale.value <= 1) {
        return;
      }
    },
    onActive: (event) => {
      'worklet';
      // Only pan when zoomed in (allow very small zoom for smooth transition)
      if (scale.value > 1.05) {
        // Calculate bounds based on current zoom level to prevent panning too far
        const zoomFactor = scale.value - 1;
        const maxTranslateX = (screenWidth * zoomFactor) / 2;
        const maxTranslateY = (280 * zoomFactor) / 2; // Image container height
        
        // Apply bounds checking
        translateX.value = Math.min(
          Math.max(event.translationX, -maxTranslateX),
          maxTranslateX
        );
        translateY.value = Math.min(
          Math.max(event.translationY, -maxTranslateY),
          maxTranslateY
        );
      }
    },
    onEnd: () => {
      'worklet';
      // Snap back if panned too far
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    },
  });
  
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { translateX: focalX.value },
        { translateY: focalY.value },
        { scale: scale.value },
        { translateX: -focalX.value },
        { translateY: -focalY.value },
      ],
    } as any;
  });
  
  // Double-tap functionality removed - zoom always resets on release
  
  return (
    <GestureHandlerRootView style={[styles.container, containerStyle]}>
      <PanGestureHandler
        ref={panRef}
        simultaneousHandlers={pinchRef}
        shouldCancelWhenOutside={false}
        onGestureEvent={panHandler}
        minPointers={1}
        maxPointers={2}
      >
        <Animated.View style={styles.imageWrapper}>
          <PinchGestureHandler
            ref={pinchRef}
            simultaneousHandlers={panRef}
            onGestureEvent={pinchHandler}
            shouldCancelWhenOutside={false}
          >
            <Animated.View style={[styles.imageWrapper, animatedStyle]}>
              <Animated.Image
                source={source}
                style={[styles.image, style]}
                resizeMode="contain"
              />
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});