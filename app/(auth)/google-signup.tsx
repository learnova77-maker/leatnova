import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { auth } from '@/lib/firebase';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignup() {
    const router = useRouter();
    const { role } = useLocalSearchParams();
    const { colors, isDark } = useTheme();
    const [isLoading, setIsLoading] = useState(false);

    // REPLACE THESE WITH YOUR ACTUAL GOOGLE CLOUD CLIENT IDs
    const WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';
    const ANDROID_CLIENT_ID = 'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';
    const IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';

    // Setup Google Auth Request
    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: WEB_CLIENT_ID,
        androidClientId: ANDROID_CLIENT_ID,
        iosClientId: IOS_CLIENT_ID,
    });

    useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            if (authentication?.idToken) {
                authenticateFirebase(authentication.idToken);
            } else {
                fetchUserInfo(authentication?.accessToken);
            }
        } else if (response?.type === 'error') {
            setIsLoading(false);
            Alert.alert("Authentication Failed", "Could not sign in with Google.");
        }
    }, [response]);

    const authenticateFirebase = async (idToken: string) => {
        try {
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            const user = userCredential.user;

            const googleData = {
                googleName: user.displayName || 'Google User',
                googleEmail: user.email,
                uid: user.uid,
                isGoogleAuth: 'true'
            };

            setIsLoading(false);

            if (role === 'student') {
                router.push({ pathname: '/student-signup', params: googleData });
            } else if (role === 'teacher') {
                router.push({ pathname: '/signup', params: googleData });
            } else if (role === 'school') {
                router.push({ pathname: '/school-signup', params: googleData });
            }
        } catch (error) {
            setIsLoading(false);
            Alert.alert("Firebase Error", "Could not sync Google account with Firebase.");
        }
    };

    const fetchUserInfo = async (token?: string) => {
        if (!token) return;
        try {
            const res = await fetch('https://www.googleapis.com/userinfo/v2/me', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const user = await res.json();

            const googleData = {
                googleName: user.name || 'Google User',
                googleEmail: user.email,
                isGoogleAuth: 'true'
            };

            setIsLoading(false);

            if (role === 'student') {
                router.push({ pathname: '/student-signup', params: googleData });
            } else if (role === 'teacher') {
                router.push({ pathname: '/signup', params: googleData });
            } else if (role === 'school') {
                router.push({ pathname: '/school-signup', params: googleData });
            }
        } catch (error) {
            setIsLoading(false);
            Alert.alert("Error", "Failed to get details from Google.");
        }
    };

    const handleGoogleAuth = () => {
        if (WEB_CLIENT_ID.includes('YOUR_WEB_CLIENT_ID')) {
            Alert.alert(
                "Configuration Required",
                "Real Google Auth requires an API Key. Once you add your Client IDs to the file, it will work. For now, testing generic mock Auth."
            );
            // Simulating for now because they don't have API keys integrated
            setIsLoading(true);
            setTimeout(() => {
                setIsLoading(false);
                const mockGoogleData = {
                    googleName: 'John Doe',
                    googleEmail: `johndoe.${Date.now()}@gmail.com`,
                    isGoogleAuth: 'true'
                };
                if (role === 'student') router.push({ pathname: '/student-signup', params: mockGoogleData });
                else if (role === 'school') router.push({ pathname: '/school-signup', params: mockGoogleData });
                else router.push({ pathname: '/signup', params: mockGoogleData });
            }, 1500);
            return;
        }

        setIsLoading(true);
        promptAsync();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : Colors.secondary} />
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.headerContainer}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="logo-google" size={40} color="#DB4437" />
                    </View>
                    <Text style={[styles.title, { color: colors.text }]}>Sign up with Google</Text>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        To continue as a {role === 'student' ? 'Student' : role === 'school' ? 'School / Institute' : 'Teacher'}, authenticate with your Google account first.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.googleButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={handleGoogleAuth}
                    disabled={isLoading || !request}
                >
                    {isLoading ? (
                        <ActivityIndicator color={Colors.primary} />
                    ) : (
                        <>
                            <Ionicons name="logo-google" size={24} color="#DB4437" style={styles.googleIcon} />
                            <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue with Google</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dividerText, { color: colors.textSecondary }]}>OR</Text>
                    <View style={[styles.divider, { backgroundColor: colors.border }]} />
                </View>

                <TouchableOpacity
                    style={[styles.manualButton, { borderColor: colors.border }]}
                    onPress={() => {
                        if (role === 'student') {
                            router.push('/student-signup');
                        } else if (role === 'school') {
                            router.push('/school-signup');
                        } else {
                            router.push('/signup');
                        }
                    }}
                >
                    <Text style={[styles.manualButtonText, { color: colors.textSecondary }]}>Sign up manually</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    backButton: { padding: 24 },
    content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center' },
    headerContainer: { alignItems: 'center', marginBottom: 40 },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FCE8E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    title: { fontSize: 28, fontWeight: 'bold', color: Colors.secondary, textAlign: 'center' },
    subtitle: { fontSize: 16, color: Colors.grey, marginTop: 10, textAlign: 'center' },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 60,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    googleIcon: { marginRight: 12 },
    googleButtonText: { fontSize: 18, fontWeight: 'bold' },
    dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
    divider: { flex: 1, height: 1 },
    dividerText: { paddingHorizontal: 15, fontSize: 14, fontWeight: '600' },
    manualButton: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 1,
    },
    manualButtonText: { fontSize: 16, fontWeight: '600' }
});
