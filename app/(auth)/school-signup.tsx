import { authApi } from '@/constants/api';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
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

    // Form State
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

        if (!result.canceled) {
            setLogoUri(result.assets[0].uri);
        }
    };

    const handleSignUp = async () => {
        if (!schoolName || !email || !password || !industryType || !orgUsername) {
            Alert.alert('Missing Info', 'Please fill in all mandatory fields.');
            return;
        }

        if (password.length < 6 && isGoogleAuth !== 'true') {
            Alert.alert('Short Password', 'Password must be at least 6 characters.');
            return;
        }

        // Validate org username (no spaces, lowercase)
        const usernameRegex = /^[a-z0-9_]+$/;
        if (!usernameRegex.test(orgUsername)) {
            Alert.alert('Invalid Username', 'Organization username must be lowercase, no spaces. Use letters, numbers, and underscores only.');
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
            formData.append('orgUsername', orgUsername);
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
                formData.append('photo', {
                    uri: logoUri,
                    name: `logo.${fileType}`,
                    type: `image/${fileType}`,
                } as any);
            }

            const response = await authApi.signup(formData, {
                'Content-Type': 'multipart/form-data',
            });

            if (response.data.success) {
                router.replace('/(auth)/approval');
            }
        } catch (err: any) {
            console.error('School Signup Error:', err);
            const errMsg = err.response?.data?.message || 'Connection lost. Please try again.';
            Alert.alert('Submission Failed', errMsg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.inputBg }]} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color={isDark ? colors.text : Colors.secondary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.text }]}>Register Organization</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Set up your school or institute on Learnova</Text>
                    </View>

                    {/* Logo Upload */}
                    <View style={styles.photoSection}>
                        <TouchableOpacity
                            style={[styles.photoCircle, { backgroundColor: colors.inputBg, borderColor: colors.border }, logoUri && styles.uploadedCircle]}
                            onPress={handleImagePick}
                        >
                            <Ionicons
                                name={logoUri ? 'checkmark-circle' : 'business'}
                                size={30}
                                color={logoUri ? '#27AE60' : Colors.grey}
                            />
                            <Text style={[styles.photoLabel, logoUri && { color: '#27AE60' }]}>
                                {logoUri ? 'Logo Added' : 'Add Logo'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        {isGoogleAuth === 'true' ? (
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <Ionicons name="checkmark-circle" size={40} color="#27AE60" />
                                <Text style={[{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 10 }]}>Authenticated via Google!</Text>
                                <Text style={[{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 5 }]}>
                                    Signed in as {googleName} ({googleEmail}). Fill the rest below.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Email */}
                                <View style={styles.inputContainer}>
                                    <Text style={[styles.label, { color: colors.text }]}>Email Address *</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                        placeholder="admin@school.com"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        placeholderTextColor="#999"
                                        value={email}
                                        onChangeText={setEmail}
                                    />
                                </View>

                                {/* Password */}
                                <View style={styles.inputContainer}>
                                    <Text style={[styles.label, { color: colors.text }]}>Password *</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                        placeholder="••••••••"
                                        secureTextEntry
                                        placeholderTextColor="#999"
                                        value={password}
                                        onChangeText={setPassword}
                                    />
                                </View>
                            </>
                        )}

                        {/* School Name */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>School / Institute Name *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Beacon Light Academy"
                                placeholderTextColor="#999"
                                value={schoolName}
                                onChangeText={setSchoolName}
                            />
                        </View>

                        {/* Type of Industry */}
                        <View style={[styles.inputContainer, { zIndex: 1000 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Type of Industry *</Text>
                            <TouchableOpacity
                                style={[styles.input, styles.pickerButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                                onPress={() => setShowIndustryPicker(!showIndustryPicker)}
                            >
                                <Text style={[styles.pickerText, { color: industryType ? colors.text : '#999' }]}>
                                    {industryType || 'Select industry type'}
                                </Text>
                                <Ionicons name={showIndustryPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                            {showIndustryPicker && (
                                <View style={[styles.dropdownList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    {INDUSTRY_OPTIONS.map((item) => (
                                        <TouchableOpacity
                                            key={item}
                                            style={[
                                                styles.dropdownItem,
                                                { borderBottomColor: colors.border },
                                                industryType === item && { backgroundColor: isDark ? '#1A2744' : '#E8F4FD' }
                                            ]}
                                            onPress={() => {
                                                setIndustryType(item);
                                                setShowIndustryPicker(false);
                                            }}
                                        >
                                            <Text style={[styles.dropdownText, { color: colors.text }, industryType === item && { color: Colors.primary, fontWeight: 'bold' }]}>
                                                {item}
                                            </Text>
                                            {industryType === item && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Organization Username */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Organization Username *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. beacon_light_academy"
                                placeholderTextColor="#999"
                                autoCapitalize="none"
                                value={orgUsername}
                                onChangeText={(text) => setOrgUsername(text.toLowerCase().replace(/\s/g, '_'))}
                            />
                            <Text style={[styles.hint, { color: colors.textSecondary }]}>
                                Lowercase, no spaces. This will be your unique org ID.
                            </Text>
                        </View>

                        {/* Address */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Address (Optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. 123 Main Street, Lahore"
                                placeholderTextColor="#999"
                                value={address}
                                onChangeText={setAddress}
                            />
                        </View>

                        {/* Phone */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Phone (Optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="+92 300 1234567"
                                keyboardType="phone-pad"
                                placeholderTextColor="#999"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>

                        {/* Website */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Website (Optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="https://www.school.edu"
                                autoCapitalize="none"
                                placeholderTextColor="#999"
                                value={website}
                                onChangeText={setWebsite}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.signUpButton, isLoading && { opacity: 0.7 }]}
                            activeOpacity={0.8}
                            onPress={handleSignUp}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color={Colors.secondary} />
                            ) : (
                                <Text style={styles.signUpButtonText}>Register Organization</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => router.replace('/login')}>
                            <Text style={styles.loginText}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.white },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 60 },
    backButton: {
        marginTop: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.lightGrey,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: { marginTop: 30, marginBottom: 20 },
    title: { fontSize: 30, fontWeight: 'bold', color: Colors.secondary },
    subtitle: { fontSize: 16, color: Colors.grey, marginTop: 8 },
    photoSection: { alignItems: 'center', marginBottom: 30 },
    photoCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.lightGrey,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#EEE',
        borderStyle: 'dashed',
    },
    uploadedCircle: { borderColor: '#27AE60', backgroundColor: '#F0FFF4', borderStyle: 'solid' },
    photoLabel: { fontSize: 12, color: Colors.grey, marginTop: 4 },
    form: { gap: 20 },
    inputContainer: { gap: 8, position: 'relative' },
    label: { fontSize: 14, fontWeight: '600', color: Colors.secondary, marginLeft: 4 },
    input: {
        width: '100%',
        height: 56,
        backgroundColor: Colors.lightGrey,
        borderRadius: 16,
        paddingHorizontal: 20,
        fontSize: 16,
        color: Colors.secondary,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    hint: { fontSize: 12, color: Colors.grey, marginLeft: 4, marginTop: -4 },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pickerText: { fontSize: 16 },
    dropdownList: {
        position: 'absolute',
        top: 85,
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 10000,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    dropdownText: { fontSize: 15, color: Colors.secondary },
    signUpButton: {
        width: '100%',
        height: 60,
        backgroundColor: '#27AE60',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: '#27AE60',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    signUpButtonText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    footerText: { fontSize: 16, color: Colors.grey },
    loginText: { fontSize: 16, fontWeight: 'bold', color: Colors.primary },
});
