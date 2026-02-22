import { Redirect } from 'expo-router';
import { View, Image, StyleSheet } from 'react-native';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme } from '../src/contexts/ThemeContext';

export default function Index() {
  const { user, loading } = useAuth();
  const { colors } = useTheme();

  if (loading) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('../assets/download.png')}
          style={styles.splashLogo}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/signin" />;
  }

  return <Redirect href="/(tabs)/wellness" />;
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  splashLogo: {
    width: 200,
    height: 200,
  },
});
