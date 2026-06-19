import { authApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
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
    View,
} from 'react-native';

const INDUSTRY_OPTIONS = ['School', 'University', 'Institute'];

export default function SchoolSignUp() {
    const { googleName, googleEmail, isGoogleAuth, uid } = useLocalSearchParams<{
        googleName: string;
        googleEmail: string;
        isGoogleAuth: string;
        uid: string;
    }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const [schoolName, setSchoolName] = useState('');
    const [email, setEmail] = useState(googleEmail || '');
    const [password, setPassword] = useState(isGoogleAuth === 'true' ? 'google-auth-pass' : '');
    const [industryType, setIndustryType] = useState('');
    const [showIndustryPicker, setShowIndustryPicker] = useState(false);
    const [orgUsername, setOrgUsername] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [logoUri, setLogoUri] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleImagePick = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });
        if (!result.canceled) setLogoUri(result.assets[0].uri);
    };

    const handleSignUp = async () => {
        if (!schoolName || !email || !password || !industryType || !orgUsername) {
            Alert.alert('Incomplete Form', 'Please fill in all required fields.');
            return;
        }

        const usernameRegex = /^[a-z0-9_]+$/;
        if (!usernameRegex.test(orgUsername)) {
            Alert.alert('Invalid ID', 'Organization ID must be lowercase alphanumeric with underscores.');
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', schoolName);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('role', 'school');
            formData.append('industryType', industryType);
            formData.append('username', orgUsername.toLowerCase());
            formData.append('address', address);
            formData.append('phone', phone);
            formData.append('website', website);

            if (isGoogleAuth === 'true' && uid) {
                formData.append('uid', uid);
                formData.append('isGoogleAuth', 'true');
            }

            if (logoUri) {
                const uriParts = logoUri.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append('photo', { uri: logoUri, name: `logo.${fileType}`, type: `image/${fileType}` } as any);
            }

            const response = await authApi.signup(formData, { 'Content-Type': 'multipart/form-data' });
            if (response.data.success) router.replace('/(auth)/approval');
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
                            <Text style={styles.welcomeSubSmall}>• INSTITUTION REGISTRATION</Text>
                            <Text style={[styles.title, { color: '#1A1A1A' }]}>Register <Text style={{ color: '#00AEEF' }}>Institution</Text></Text>
                            <Text style={[styles.subtitle, { color: '#666' }]}>Setup your institution profile to manage your campus.</Text>
                        </View>

                        <View style={styles.photoSection}>
                            <TouchableOpacity
                                style={[styles.photoCircle, { backgroundColor: '#F8F9FA', borderColor: '#00AEEF' }]}
                                onPress={handleImagePick}
                            >
                                <Ionicons name={logoUri ? 'shield-checkmark' : 'business-outline'} size={32} color="#00AEEF" />
                                <Text style={styles.photoLabel}>{logoUri ? 'LOGO ADDED' : 'ADD LOGO'}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
                            {isGoogleAuth === 'true' && (
                                <View style={styles.authVerified}>
                                    <Ionicons name="shield-checkmark" size={20} color="#00AEEF" />
                                    <Text style={styles.authText}>GOOGLE ACCOUNT VERIFIED: {googleEmail}</Text>
                                </View>
                            )}

                            {!isGoogleAuth && (
                                <>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>ADMIN EMAIL</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                            placeholder="admin@institution.com"
                                            placeholderTextColor="#AAA"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={email}
                                            onChangeText={setEmail}
                                        />
                                    </View>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.label}>PASSWORD</Text>
                                        <TextInput
                                            style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                            placeholder="••••••••"
                                            secureTextEntry
                                            placeholderTextColor="#AAA"
                                            value={password}
                                            onChangeText={setPassword}
                                        />
                                    </View>
                                </>
                            )}

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>INSTITUTION NAME</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="Enter institution name"
                                    placeholderTextColor="#AAA"
                                    value={schoolName}
                                    onChangeText={setSchoolName}
                                />
                            </View>

                            <View style={[styles.inputContainer, { zIndex: 1000 }]}>
                                <Text style={styles.label}>INSTITUTION TYPE</Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.pickerButton, { backgroundColor: '#F8F9FA', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    onPress={() => setShowIndustryPicker(!showIndustryPicker)}
                                >
                                    <Text style={[styles.pickerText, { color: industryType ? '#1A1A1A' : '#AAA' }]}>
                                        {industryType.toUpperCase() || 'SELECT TYPE'}
                                    </Text>
                                    <Ionicons name={showIndustryPicker ? 'chevron-up' : 'chevron-down'} size={18} color="#00AEEF" />
                                </TouchableOpacity>
                                {showIndustryPicker && (
                                    <View style={styles.dropdownList}>
                                        {INDUSTRY_OPTIONS.map((item) => (
                                            <TouchableOpacity key={item} style={styles.dropdownItem} onPress={() => { setIndustryType(item); setShowIndustryPicker(false); }}>
                                                <Text style={[styles.dropdownText, industryType === item && { color: '#00AEEF' }]}>{item.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>ORGANIZATION ID (USERNAME)</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="e.g. cyber_academy"
                                    placeholderTextColor="#AAA"
                                    autoCapitalize="none"
                                    value={orgUsername}
                                    onChangeText={(text) => setOrgUsername(text.toLowerCase().replace(/\s/g, '_'))}
                                />
                                <Text style={styles.hint}>LOWERCASE ALPHANUMERIC ONLY. THIS IS YOUR UNIQUE ORGANIZATION ID.</Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>LOCATION ADDRESS</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="Enter physical address"
                                    placeholderTextColor="#AAA"
                                    value={address}
                                    onChangeText={setAddress}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>PHONE NUMBER</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="+92 XXX XXXXXXX"
                                    keyboardType="phone-pad"
                                    placeholderTextColor="#AAA"
                                    value={phone}
                                    onChangeText={setPhone}
                                />
                            </View>

                            <TouchableOpacity
                                style={[styles.signUpButton, isLoading && { opacity: 0.7 }]}
                                onPress={handleSignUp}
                                disabled={isLoading}
                            >
                                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.signUpButtonText}>REGISTER NOW</Text>}
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
    navHeader: { paddingTop: Platform.OS === 'android' ? 20 : 0, paddingHorizontal: 32, marginBottom: 10 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    scrollContent: { paddingBottom: 60, flexGrow: 1 },
    header: { marginBottom: 30, paddingHorizontal: 32 },
    welcomeSubSmall: { fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 2, marginBottom: 12 },
    title: { fontSize: 32, fontWeight: '900', letterSpacing: -1, fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold' },
    subtitle: { fontSize: 13, marginTop: 12, fontWeight: '600', letterSpacing: 0.3 },
    photoSection: { alignItems: 'center', marginBottom: 40 },
    photoCircle: { width: 110, height: 110, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    photoLabel: { fontSize: 8, fontWeight: '900', color: '#00AEEF', marginTop: 8, letterSpacing: 1 },
    form: { gap: 24, paddingHorizontal: 32 },
    authVerified: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,174,239,0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,174,239,0.2)', marginBottom: 10 },
    authText: { fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 0.5 },
    inputContainer: { gap: 12, position: 'relative' },
    label: { fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 2 },
    input: { height: 60, borderRadius: 12, paddingHorizontal: 20, fontSize: 14, borderWidth: 1, fontWeight: '700' },
    hint: { fontSize: 8, fontWeight: '900', color: '#999', marginTop: 4, letterSpacing: 1 },
    pickerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    pickerText: { fontSize: 13, fontWeight: '700' },
    dropdownList: { position: 'absolute', top: 90, left: 0, right: 0, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#00AEEF', zIndex: 10000, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    dropdownItem: { padding: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(0,174,239,0.1)' },
    dropdownText: { fontSize: 12, fontWeight: '900', color: '#666', letterSpacing: 1 },
    signUpButton: { height: 60, backgroundColor: '#00AEEF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 8, shadowColor: '#00AEEF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    signUpButtonText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 50, gap: 8, paddingBottom: 60 },
    footerText: { fontSize: 10, fontWeight: '900', color: '#666', letterSpacing: 1 },
    loginText: { color: '#00AEEF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
