import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');
const STAR_COUNT = 200;

const generateStars = () => {
    const stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radiusFn = Math.random();
        const maxDistance = Math.max(width, height) * 0.9;

        stars.push({
            id: i,
            angle,
            radiusFn,
            maxDistance,
            size: Math.random() * 4 + 2,
            delay: Math.random() * 5000,
            duration: Math.random() * 4000 + 6000,
        });
    }
    return stars;
};

export default function Starfield() {
    const starsData = useRef(generateStars()).current;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {starsData.map((star) => (
                <Star key={star.id} star={star} />
            ))}
        </View>
    );
}

const Star = ({ star }: { star: any }) => {
    // Initialized at random value so screen is full from the start
    const progress = useRef(new Animated.Value(Math.random())).current;

    useEffect(() => {
        const runAnimation = () => {
            // First run from random start to end
            Animated.timing(progress, {
                toValue: 1,
                duration: star.duration * (1 - (progress as any)._value),
                easing: Easing.linear,
                useNativeDriver: true,
            }).start(({ finished }) => {
                if (finished) {
                    // Then loop normally from 0 to 1
                    progress.setValue(0);
                    Animated.loop(
                        Animated.timing(progress, {
                            toValue: 1,
                            duration: star.duration,
                            easing: Easing.linear,
                            useNativeDriver: true,
                        })
                    ).start();
                }
            });
        };

        runAnimation();
        return () => progress.stopAnimation();
    }, [progress, star]);

    const translateX = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.cos(star.angle) * star.maxDistance],
    });

    const translateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, Math.sin(star.angle) * star.maxDistance],
    });

    const scale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 2],
    });

    const opacity = progress.interpolate({
        inputRange: [0, 0.2, 0.8, 1],
        outputRange: [0, 1, 1, 0],
    });

    return (
        <Animated.View
            style={[
                styles.star,
                {
                    width: star.size,
                    height: star.size,
                    borderRadius: star.size / 2,
                    backgroundColor: '#FFF',
                    shadowColor: '#4CC9F0', // Slight cyan glow for stars
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 5,
                    left: width / 2,
                    top: height / 2,
                    transform: [
                        { translateX },
                        { translateY },
                        { scale }
                    ],
                    opacity
                }
            ]}
        />
    );
};

const styles = StyleSheet.create({
    star: {
        position: 'absolute',
    }
});
