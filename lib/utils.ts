import { clsx } from "clsx";

export function cn(...inputs: any[]) {
  return clsx(inputs);
}

// React Native specific utilities
export const formatDate = (date: Date): string => {
  return date.toLocaleDateString();
};

export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString();
};

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
}; 