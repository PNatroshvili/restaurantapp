import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../types';

export function useRequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (action: () => void) => {
    if (isAuthenticated) {
      action();
    } else {
      navigation.navigate('Login');
    }
  };
}
