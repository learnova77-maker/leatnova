import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, StatusBar, StyleSheet, Text, View } from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming
} from 'react-native-reanimated';

export default function SplashScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const opacity = useSharedValue(0);
    const scale = useSharedValue(0.8);

    useEffect(() => {
        // Start animation
        opacity.value = withTiming(1, { duration: 1000 });
        scale.value = withTiming(1, {
            duration: 1000,
            easing: Easing.out(Easing.back(1.5))
        });

        // Navigate to login after 2.5 seconds
        const timeout = setTimeout(() => {
            router.replace('/login');
        }, 2500);

        return () => clearTimeout(timeout);
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ scale: scale.value }],
        };
    });

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <Animated.View style={[styles.logoContainer, animatedStyle]}>
                <Image
                    source={require('../assets/images/logo.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={[styles.appName, { color: colors.text }]}>Learnova</Text>
                <Text style={[styles.tagline, { color: colors.textSecondary }]}>Empowering Your Learning Journey</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.white,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoContainer: {
        alignItems: 'center',
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    appName: {
        fontSize: 42,
        fontWeight: 'bold',
        color: Colors.secondary,
        letterSpacing: 1,
    },
    tagline: {
        fontSize: 16,
        color: Colors.grey,
        marginTop: 10,
    },
});
