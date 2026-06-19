import { authApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function StudentSignUp() {
    const { googleName, googleEmail, isGoogleAuth, uid, googlePhoto } = useLocalSearchParams<{ googleName: string, googleEmail: string, isGoogleAuth: string, uid: string, googlePhoto: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [fullName, setFullName] = useState(googleName || '');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(googleEmail || '');
    const [profileImage, setProfileImage] = useState<string | null>(googlePhoto || null);
    const [isLoading, setIsLoading] = useState(false);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Please grant access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setProfileImage(result.assets[0].uri);
        }
    };

    const handleSignUp = async () => {
        if (!fullName || !email || !username) {
            Alert.alert('Missing Information', 'Please fill in all required fields.');
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('username', username.toLowerCase());
            formData.append('email', email);
            formData.append('role', 'student');

            if (isGoogleAuth === 'true' && uid) {
                formData.append('uid', uid);
                formData.append('isGoogleAuth', 'true');
            }

            if (profileImage && typeof profileImage === 'string' && !profileImage.startsWith('http')) {
                const uriParts = profileImage.split('.');
                const fileType = uriParts.length > 0 ? uriParts[uriParts.length - 1] : 'jpg';
                const fileName = `profile_${Date.now()}.${fileType}`;

                formData.append('profileImage', {
                    uri: profileImage,
                    name: fileName,
                    type: `image/${fileType}`,
                } as any);
            } else if (profileImage && typeof profileImage === 'string' && profileImage.startsWith('http')) {
                formData.append('photoUrl', profileImage);
            }

            const response = await authApi.signup(formData, {
                'Content-Type': 'multipart/form-data',
            });

            if (response.data.success) {
                const userData = response.data.user;
                await AsyncStorage.setItem('user', JSON.stringify(userData));
                router.replace('/student');
            }
        } catch (err: any) {
            Alert.alert('Registration Failed', err.response?.data?.message || 'Could not create your account.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <LinearGradient
                colors={['#FFFFFF', '#F0F9FF', '#FFFFFF']}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.navHeader}>
                            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                                <Ionicons name="arrow-back-outline" size={28} color="#00AEEF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.header}>
                            <Text style={styles.welcomeSubSmall}>• STUDENT REGISTRATION</Text>
                            <Text style={[styles.title, { color: '#1A1A1A' }]}>
                                Join <Text style={{ color: '#00AEEF' }}>MALTOVERSE</Text>
                            </Text>
                            <Text style={[styles.subtitle, { color: '#666' }]}>Complete your profile to start learning.</Text>
                        </View>

                        <View style={styles.form}>
                            <View style={styles.imagePickerContainer}>
                                <TouchableOpacity
                                    style={[styles.imagePicker, { backgroundColor: '#F8F9FA', borderColor: '#00AEEF' }]}
                                    onPress={pickImage}
                                >
                                    {profileImage ? (
                                        <Image source={{ uri: profileImage }} style={styles.profileImage} />
                                    ) : (
                                        <View style={styles.imagePlaceholder}>
                                            <Ionicons name="camera-outline" size={32} color="#00AEEF" />
                                            <Text style={styles.imagePlaceholderText}>ADD PHOTO</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                                <Text style={styles.imageLabel}>
                                    {profileImage ? 'PHOTO ADDED' : 'PROFILE PICTURE (OPTIONAL)'}
                                </Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>FULL NAME</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="Enter your name"
                                    placeholderTextColor="#AAA"
                                    value={fullName}
                                    onChangeText={setFullName}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>USERNAME</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="Enter a unique username"
                                    placeholderTextColor="#AAA"
                                    autoCapitalize="none"
                                    value={username}
                                    onChangeText={setUsername}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>EMAIL ADDRESS</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="your@email.com"
                                    placeholderTextColor="#AAA"
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    value={email}
                                    onChangeText={setEmail}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.signUpButton, isLoading && { opacity: 0.7 }]}
                                onPress={handleSignUp}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color="#FFF" />
                                ) : (
                                    <Text style={styles.signUpButtonText}>REGISTER NOW</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.footer}>
                            <Text style={styles.footerText}>ALREADY HAVE AN ACCOUNT? </Text>
                            <TouchableOpacity onPress={() => router.replace('/login')}>
                                <Text style={styles.loginText}>LOGIN</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    navHeader: { paddingTop: Platform.OS === 'android' ? 20 : 0, marginBottom: 20 },
    scrollContent: { paddingHorizontal: 32, paddingBottom: 60, flexGrow: 1 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    header: { marginBottom: 30 },
    welcomeSubSmall: {
        fontSize: 10,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 2,
        marginBottom: 10,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1,
        fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold',
    },
    subtitle: {
        fontSize: 13,
        marginTop: 10,
        fontWeight: '600',
        letterSpacing: 0.3
    },
    form: { gap: 24 },
    imagePickerContainer: {
        alignItems: 'center',
        marginBottom: 10,
    },
    imagePicker: {
        width: 110,
        height: 110,
        borderRadius: 24,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        fontSize: 8,
        fontWeight: '900',
        marginTop: 8,
        color: '#00AEEF',
        letterSpacing: 1,
    },
    imageLabel: {
        fontSize: 10,
        marginTop: 15,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 1,
    },
    inputContainer: { gap: 12 },
    label: {
        fontSize: 10,
        fontWeight: '900',
        color: '#00AEEF',
        letterSpacing: 2,
    },
    input: {
        height: 60,
        borderRadius: 12,
        paddingHorizontal: 20,
        fontSize: 14,
        borderWidth: 1,
        fontWeight: '700',
    },
    signUpButton: {
        height: 60,
        backgroundColor: '#00AEEF',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        elevation: 8,
        shadowColor: '#00AEEF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    signUpButtonText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, gap: 8, paddingBottom: 60 },
    footerText: { fontSize: 10, fontWeight: '900', color: '#666', letterSpacing: 1 },
    loginText: { color: '#00AEEF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
