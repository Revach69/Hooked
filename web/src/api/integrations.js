import { uploadFile } from '../lib/firebaseApi';

// Core integrations using Firebase
export const Core = {
  // File upload using Firebase Storage
  UploadFile: uploadFile,
  
  // Placeholder for other integrations that might be needed
  InvokeLLM: null, // Not implemented in Firebase version
  SendEmail: null, // Not implemented in Firebase version
  GenerateImage: null, // Not implemented in Firebase version
  ExtractDataFromUploadedFile: null // Not implemented in Firebase version
};

// Direct exports for convenience
export const InvokeLLM = Core.InvokeLLM;
export const SendEmail = Core.SendEmail;
export const UploadFile = Core.UploadFile;
export const GenerateImage = Core.GenerateImage;
export const ExtractDataFromUploadedFile = Core.ExtractDataFromUploadedFile;






