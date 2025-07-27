import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Eye, EyeOff, Lock, Mail, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User } from '../lib/firebaseApi';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [isCheckingSavedCredentials, setIsCheckingSavedCredentials] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Check for saved credentials on component mount
  useEffect(() => {
    checkSavedCredentials();
  }, []);

  const checkSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('adminSavedEmail');
      const savedPassword = await AsyncStorage.getItem('adminSavedPassword');
      const rememberMeEnabled = await AsyncStorage.getItem('adminRememberMe');
      
      if (savedEmail && savedPassword && rememberMeEnabled === 'true') {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
        
        // Auto-login with saved credentials
        await handleAutoLogin(savedEmail, savedPassword);
      }
    } catch (error) {
      console.error('Error checking saved credentials:', error);
    } finally {
      setIsCheckingSavedCredentials(false);
    }
  };

  const handleAutoLogin = async (savedEmail: string, savedPassword: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const user = await User.signIn(savedEmail, savedPassword);
      
      if (user) {
        // Store admin session with Firebase auth
        await AsyncStorage.setItem('isAdmin', 'true');
        await AsyncStorage.setItem('adminAccessTime', new Date().toISOString());
        await AsyncStorage.setItem('adminEmail', user.email || '');
        await AsyncStorage.setItem('adminUid', user.uid);
        
        // Navigate to admin dashboard
        router.replace('/admin');
      }
    } catch (error: any) {
      console.error('Auto-login error:', error);
      // Clear saved credentials if auto-login fails
      await AsyncStorage.multiRemove(['adminSavedEmail', 'adminSavedPassword', 'adminRememberMe']);
      setRememberMe(false);
      setPassword('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const user = await User.signIn(email.trim(), password);
      
      if (user) {
        // Store admin session with Firebase auth
        await AsyncStorage.setItem('isAdmin', 'true');
        await AsyncStorage.setItem('adminAccessTime', new Date().toISOString());
        await AsyncStorage.setItem('adminEmail', user.email || '');
        await AsyncStorage.setItem('adminUid', user.uid);
        
        // Save credentials if "Remember Me" is checked
        if (rememberMe) {
          await AsyncStorage.setItem('adminSavedEmail', email.trim());
          await AsyncStorage.setItem('adminSavedPassword', password);
          await AsyncStorage.setItem('adminRememberMe', 'true');
        } else {
          // Clear saved credentials if "Remember Me" is unchecked
          await AsyncStorage.multiRemove(['adminSavedEmail', 'adminSavedPassword', 'adminRememberMe']);
        }
        
        // Navigate to admin dashboard
        router.replace('/admin');
      }
    } catch (error: any) {
      console.error('Admin login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.replace('/home');
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#1a1a1a' : '#f8fafc',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
    },
    header: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logo: {
      width: 80,
      height: 80,
      marginBottom: 16,
      borderRadius: 40,
      backgroundColor: isDark ? '#2d2d2d' : '#f3f4f6',
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: isDark ? '#ffffff' : '#1f2937',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      textAlign: 'center',
      lineHeight: 24,
    },
    form: {
      marginBottom: 32,
    },
    inputGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: isDark ? '#ffffff' : '#374151',
      marginBottom: 8,
    },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#2d2d2d' : 'white',
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
      paddingHorizontal: 16,
      paddingVertical: 4,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: isDark ? '#ffffff' : '#1f2937',
      paddingVertical: 16,
      paddingHorizontal: 12,
    },
    icon: {
      marginRight: 12,
    },
    passwordToggle: {
      padding: 8,
    },
    errorText: {
      color: '#dc2626',
      fontSize: 14,
      marginTop: 8,
      textAlign: 'center',
    },
    loginButton: {
      backgroundColor: '#8b5cf6',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      marginBottom: 16,
    },
    loginButtonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    backButton: {
      backgroundColor: 'transparent',
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: isDark ? '#404040' : '#d1d5db',
    },
    backButtonText: {
      color: isDark ? '#9ca3af' : '#6b7280',
      fontSize: 16,
      fontWeight: '500',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    rememberMeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
      paddingVertical: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 2,
      borderColor: isDark ? '#6b7280' : '#9ca3af',
      marginRight: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxChecked: {
      backgroundColor: '#8b5cf6',
      borderColor: '#8b5cf6',
    },
    rememberMeText: {
      fontSize: 16,
      color: isDark ? '#9ca3af' : '#6b7280',
      fontWeight: '500',
    },
  });

  // Show loading screen while checking saved credentials
  if (isCheckingSavedCredentials) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Lock size={32} color="#8b5cf6" />
            </View>
            <Text style={styles.title}>Admin Access</Text>
            <Text style={styles.subtitle}>
              Checking saved credentials...
            </Text>
          </View>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Lock size={32} color="#8b5cf6" />
            </View>
            <Text style={styles.title}>Admin Access</Text>
            <Text style={styles.subtitle}>
              Enter your credentials to access the admin dashboard
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.form}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email Address</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color="#6b7280" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color="#6b7280" style={styles.icon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={isDark ? '#6b7280' : '#9ca3af'}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.passwordToggle}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff size={20} color="#6b7280" />
                  ) : (
                    <Eye size={20} color="#6b7280" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Error Message */}
            {error && <Text style={styles.errorText}>{error}</Text>}

            {/* Remember Me Checkbox */}
            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              disabled={isLoading}
            >
              <View style={[
                styles.checkbox,
                rememberMe && styles.checkboxChecked
              ]}>
                {rememberMe && <Check size={16} color="white" />}
              </View>
              <Text style={styles.rememberMeText}>Remember Me</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.loadingText}>Signing In...</Text>
                </View>
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Back Button */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleGoBack}
              disabled={isLoading}
            >
              <Text style={styles.backButtonText}>Back to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
} 