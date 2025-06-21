import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X, MessageCircle, ArrowRight } from 'lucide-react-native';

interface Props {
  senderName: string;
  onDismiss: () => void;
  onView?: () => void;
}

export default function MessageNotificationToast({ senderName, onDismiss, onView }: Props) {
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

  const handleView = () => {
    if (onView) onView();
    close();
  };

  return (
    <Animated.View style={[styles.toastWrapper, { transform: [{ translateY }] }] }>
      <View style={styles.toast}>
        <TouchableOpacity onPress={close} style={styles.closeBtn} accessibilityLabel="Dismiss notification">
          <X size={16} color="#fff" />
        </TouchableOpacity>
        <View style={styles.row}>
          <MessageCircle size={28} color="#fff" style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>New Message</Text>
            <Text style={styles.desc}>You have a new message from {senderName}.</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.button} onPress={handleView}>
          <Text style={styles.buttonText}>View Message</Text>
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
    backgroundColor: '#0ea5e9',
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
