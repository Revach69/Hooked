import Toast, { ToastShowParams } from 'react-native-toast-message';

export function useToast() {
  return {
    show: (options: ToastShowParams) => Toast.show(options),
    hide: () => Toast.hide(),
  };
}

export const toast = {
  show: (options: ToastShowParams) => Toast.show(options),
  hide: () => Toast.hide(),
};

