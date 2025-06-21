import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X, PartyPopper, ArrowRight } from 'lucide-react-native';

interface Props {
  matchName: string;
  onDismiss: () => void;
  onSeeMatches?: () => void;
}

export default function MatchNotificationToast({ matchName, onDismiss, onSeeMatches }: Props) {
  const translateY = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(close, 5000);
    return () => clearTimeout(timer);
  }, []);

  const close = () => {
    Animated.timing(translateY, {
      toValue: 80,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => finished && onDismiss());
  };

  const handleSeeMatches = () => {
    if (onSeeMatches) onSeeMatches();
    close();
  };

  return (
    <Animated.View style={[styles.toastWrapper, { transform: [{ translateY }] }] }>
      <View style={styles.toast}>
        <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Dismiss notification">
          <X size={16} color="#fff" />
        </TouchableOpacity>
        <View style={styles.row}>
          <PartyPopper size={28} color="#fde047" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>It's a Match!</Text>
            <Text style={styles.desc}>You and {matchName} liked each other.</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleSeeMatches}>
          <Text style={styles.buttonText}>See Matches</Text>
          <ArrowRight size={16} color="#fff" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
  },
  toast: {
    backgroundColor: '#7c3aed',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  desc: {
    color: '#f3f4f6',
    marginTop: 2,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
