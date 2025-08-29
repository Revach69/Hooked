import React, { useState, useEffect } from 'react';
import { Text, TextStyle } from 'react-native';

interface CountdownTimerProps {
  expiresAt: string | Date | { toDate?: () => Date; seconds?: number };
  prefix?: string;
  style?: TextStyle;
  onExpired?: () => void;
  format?: 'full' | 'time-only';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  expiresAt,
  prefix = '',
  style,
  onExpired,
  format = 'full'
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  const calculateTimeLeft = (): string => {
    const now = new Date().getTime();
    
    let expiry: number;
    
    if (typeof expiresAt === 'string') {
      expiry = new Date(expiresAt).getTime();
    } else if (expiresAt instanceof Date) {
      expiry = expiresAt.getTime();
    } else if (expiresAt && typeof expiresAt === 'object') {
      // Handle Firestore Timestamp objects
      if (expiresAt.toDate && typeof expiresAt.toDate === 'function') {
        expiry = expiresAt.toDate().getTime();
      } else if (expiresAt.seconds && typeof expiresAt.seconds === 'number') {
        expiry = expiresAt.seconds * 1000;
      } else {
        console.warn('CountdownTimer: Invalid expiresAt format:', expiresAt);
        return '00h:00m:00s';
      }
    } else {
      console.warn('CountdownTimer: expiresAt is undefined or null:', expiresAt);
      return '00h:00m:00s';
    }
    
    const difference = expiry - now;

    if (difference <= 0) {
      if (onExpired) {
        onExpired();
      }
      return '00h:00m:00s';
    }

    const hours = Math.floor(difference / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`;
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    // Set initial value immediately
    setTimeLeft(calculateTimeLeft());

    return () => clearInterval(timer);
  }, [expiresAt, calculateTimeLeft]);

  const displayText = format === 'time-only' ? timeLeft : `${prefix}${timeLeft}`;

  return (
    <Text style={style}>
      {displayText}
    </Text>
  );
};

export default CountdownTimer;