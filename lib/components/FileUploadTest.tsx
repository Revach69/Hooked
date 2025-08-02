import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StorageAPI } from '../firebaseApi';

export default function FileUploadTest() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');

  const testFileUpload = async () => {
    try {
      setUploadStatus('Requesting permissions...');
      
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert("Permission Required", "Permission to access camera roll is required!");
        return;
      }

      setUploadStatus('Opening image picker...');
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
      });

      if (result.canceled || !result.assets[0]) {
        setUploadStatus('No image selected');
        return;
      }

      const asset = result.assets[0];
      setUploadStatus(`Selected image: ${asset.fileName || 'Unknown'}, Size: ${asset.fileSize || 'Unknown'}`);
      
      if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
        Alert.alert("File Too Large", "Image must be smaller than 10MB.");
        setUploadStatus('File too large');
        return;
      }

      setIsUploading(true);
      setUploadStatus('Uploading file...');

      const fileObject = {
        uri: asset.uri,
        name: asset.fileName || `test-upload-${Date.now()}.jpg`,
        type: asset.type || 'image/jpeg',
        fileSize: asset.fileSize
      };

      console.log('Test upload - File object:', fileObject);
      
      const { file_url } = await StorageAPI.uploadFile(fileObject);
      
      setUploadStatus(`Upload successful! URL: ${file_url}`);
      Alert.alert("Success", `File uploaded successfully!\nURL: ${file_url}`);
      
    } catch (error) {
      console.error('Test upload error:', error);
      setUploadStatus(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Alert.alert("Upload Failed", `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>File Upload Test</Text>
      
      <TouchableOpacity 
        style={[styles.button, isUploading && styles.buttonDisabled]} 
        onPress={testFileUpload}
        disabled={isUploading}
      >
        {isUploading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Test File Upload</Text>
        )}
      </TouchableOpacity>
      
      <Text style={styles.status}>{uploadStatus}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
  },
}); 