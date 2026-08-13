import type { ReactNode } from 'react';
import {
  ImageBackground,
  StyleSheet,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

type AppBackgroundProps = ViewProps & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function AppBackground({ children, style, ...props }: AppBackgroundProps) {
  return (
    <ImageBackground
      {...props}
      source={require('../../assets/image.png')}
      resizeMode="cover"
      style={[styles.root, style]}
    >
      {children}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#07101F' },
});
