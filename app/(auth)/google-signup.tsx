import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

GoogleSignin.configure({
    webClientId: '239945810669-b0inemo2igerag5f6rsr16vu1n6230hh.apps.googleusercontent.com',
    offlineAccess: true,
});

export default function GoogleSignup() {
    const router = useRouter();
    const { role } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(false);

    const navigateToSignup = (data: { googleName: string, googleEmail: string, uid?: string, googlePhoto?: string }) => {
        setIsLoading(false);
        const params = {
            ...data,
            isGoogleAuth: 'true'
        };

        if (role === 'student') {
            router.push({ pathname: '/student-signup', params });
        } else if (role === 'teacher') {
            router.push({ pathname: '/signup', params });
        } else if (role === 'school') {
            router.push({ pathname: '/school-signup', params });
        }
    };

    const handleGoogleAuth = async () => {
        setIsLoading(true);
        try {
            await GoogleSignin.hasPlayServices();
            if (GoogleSignin.hasPreviousSignIn()) {
                await GoogleSignin.signOut();
            }
            const userInfo = await GoogleSignin.signIn();
            const user = userInfo.data?.user || (userInfo as any).user;
            if (user) {
                navigateToSignup({
                    googleName: user.name || '',
                    googleEmail: user.email || '',
                    uid: user.id || '',
                    googlePhoto: user.photo || ''
                });
            } else {
                throw new Error('No User Info received from Google');
            }
        } catch (error: any) {
            setIsLoading(false);
            if (error.code !== statusCodes.SIGN_IN_CANCELLED) {
                Alert.alert("Authentication Failed", "Unable to establish connection with Google.");
            }
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.navHeader}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <Ionicons name="arrow-back-outline" size={28} color="#00AEEF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    <View style={styles.headerContainer}>
                        <Text style={styles.welcomeSubSmall}>• GOOGLE SIGNUP</Text>
                        <Text style={[styles.title, { color: '#1A1A1A' }]}>
                            Verify <Text style={{ color: '#00AEEF' }}>Identity</Text>
                        </Text>
                        <Text style={[styles.subtitle, { color: '#666' }]}>
                            Continue to create your {role?.toString().toUpperCase()} account.
                        </Text>
                    </View>

                    <View style={[styles.actionCard, { backgroundColor: '#FFFFFF', borderColor: 'rgba(0,174,239,0.1)' }]}>
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={handleGoogleAuth}
                            disabled={isLoading}
                            activeOpacity={0.8}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#FFF" />
                            ) : (
                                <View style={styles.btnContent}>
                                    <Ionicons name="logo-google" size={20} color="#FFF" style={styles.googleIcon} />
                                    <Text style={styles.googleButtonText}>SIGNUP WITH GOOGLE</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoRow}>
                        <Ionicons name="shield-checkmark-outline" size={14} color="#00AEEF" />
                        <Text style={styles.infoText}>SECURE SIGN IN</Text>
                    </View>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    navHeader: { paddingTop: Platform.OS === 'android' ? 20 : 0, paddingHorizontal: 16 },
    backButton: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center', borderRadius: 25, backgroundColor: 'rgba(0,174,239,0.05)' },
    content: { flex: 1, paddingHorizontal: 32, justifyContent: 'center' },
    headerContainer: { marginBottom: 60 },
    welcomeSubSmall: {
        fontSize: 10,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 2,
        marginBottom: 12,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 15,
        lineHeight: 20,
        fontWeight: '600',
        letterSpacing: 0.3
    },
    actionCard: {
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
    },
    googleButton: {
        backgroundColor: '#00AEEF',
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#00AEEF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3, shadowRadius: 10,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    googleIcon: { marginRight: 12 },
    googleButtonText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 1.5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 30,
        opacity: 0.8,
    },
    infoText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 1,
    },
});
