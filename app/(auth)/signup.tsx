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
    View
} from 'react-native';

const SUBJECT_SUGGESTIONS = [
    'Web Development',
    'Mobile App Development',
    'React Native',
    'English (IELTS/TOEFL)',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Graphic Design',
    'Digital Marketing',
    'Chinese Language (HSK)',
    'Data Science',
    'UI/UX Design',
    'Business Management'
];

export default function SignUpScreen() {
    const { googleName, googleEmail, isGoogleAuth, uid } = useLocalSearchParams<{ googleName: string, googleEmail: string, isGoogleAuth: string, uid: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();

    // Form State
    const [fullName, setFullName] = useState(googleName || '');
    const [email, setEmail] = useState(googleEmail || '');
    const [password, setPassword] = useState(isGoogleAuth === 'true' ? 'google-auth-pass' : '');
    const [expertise, setExpertise] = useState('');
    const [bio, setBio] = useState('');
    const [experience, setExperience] = useState('');
    const [website, setWebsite] = useState('');
    const [qualification, setQualification] = useState('');

    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [idCardUri, setIdCardUri] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

    const handleImagePick = async (type: 'photo' | 'id') => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: type === 'photo' ? [1, 1] : [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            if (type === 'photo') setPhotoUri(result.assets[0].uri);
            else setIdCardUri(result.assets[0].uri);
        }
    };

    const handleExpertiseChange = (text: string) => {
        setExpertise(text);
        if (text.length > 0) {
            const filtered = SUBJECT_SUGGESTIONS.filter(item =>
                item.toLowerCase().includes(text.toLowerCase())
            );
            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const selectSuggestion = (suggestion: string) => {
        setExpertise(suggestion);
        setShowSuggestions(false);
    };

    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async () => {
        // Validation Logic
        if (!fullName || !email || !password || !expertise || !bio || !experience || !qualification) {
            Alert.alert('Missing Info', 'Please fill in all mandatory fields.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Short Password', 'Security requirement: Password must be at least 6 characters.');
            return;
        }

        const wordCount = bio.trim().split(/\s+/).filter(Boolean).length;
        if (wordCount < 50) {
            Alert.alert('Bio Required', 'Please provide a bio of at least 50 words.');
            return;
        }

        if (wordCount > 200) {
            Alert.alert('Bio Too Long', 'Bio exceeds the 200-word limit.');
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('role', 'teacher');
            formData.append('expertise', expertise);
            formData.append('bio', bio);
            formData.append('experience', experience);
            formData.append('website', website);
            formData.append('qualification', qualification);

            if (isGoogleAuth === 'true' && uid) {
                formData.append('uid', uid);
                formData.append('isGoogleAuth', 'true');
            }

            if (photoUri) {
                const uriParts = photoUri.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append('photo', {
                    uri: photoUri,
                    name: `photo.${fileType}`,
                    type: `image/${fileType}`,
                } as any);
            }

            if (idCardUri) {
                const uriParts = idCardUri.split('.');
                const fileType = uriParts[uriParts.length - 1];
                formData.append('idCard', {
                    uri: idCardUri,
                    name: `idcard.${fileType}`,
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
            console.error('Signup Error:', err);
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
                        <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
                        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Join Learnova and share your expertise!</Text>
                    </View>

                    {/* Profile Photo Placeholder */}
                    <View style={styles.photoSection}>
                        <TouchableOpacity
                            style={[styles.photoCircle, { backgroundColor: colors.inputBg, borderColor: colors.border }, photoUri && styles.uploadedCircle]}
                            onPress={() => handleImagePick('photo')}
                        >
                            <Ionicons
                                name={photoUri ? "checkmark-circle" : "camera"}
                                size={30}
                                color={photoUri ? "#27AE60" : Colors.grey}
                            />
                            <Text style={[styles.photoLabel, photoUri && { color: "#27AE60" }]}>
                                {photoUri ? 'Photo Added' : 'Add Photo'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.form}>
                        {isGoogleAuth === 'true' ? (
                            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                <Ionicons name="checkmark-circle" size={40} color="#27AE60" />
                                <Text style={[{ fontSize: 18, fontWeight: 'bold', color: colors.text, marginTop: 10 }]}>Authenticated via Google!</Text>
                                <Text style={[{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: 5 }]}>
                                    Signed in as {googleName} ({googleEmail}). Fill the rest of the details below.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Full Name */}
                                <View style={styles.inputContainer}>
                                    <Text style={[styles.label, { color: colors.text }]}>Full Name *</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                        placeholder="e.g. Ali Ahmed"
                                        placeholderTextColor="#999"
                                        value={fullName}
                                        onChangeText={setFullName}
                                    />
                                </View>

                                {/* Email */}
                                <View style={styles.inputContainer}>
                                    <Text style={[styles.label, { color: colors.text }]}>Email Address *</Text>
                                    <TextInput
                                        style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                        placeholder="example@email.com"
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

                        {/* Expertise / Subject with Suggestions */}
                        <View style={[styles.inputContainer, { zIndex: 1000 }]}>
                            <Text style={[styles.label, { color: colors.text }]}>Expertise / Subject Area *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Web Development"
                                placeholderTextColor="#999"
                                value={expertise}
                                onChangeText={handleExpertiseChange}
                                onFocus={() => expertise.length > 0 && setShowSuggestions(true)}
                            />
                            {showSuggestions && (
                                <View style={[styles.suggestionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                    {filteredSuggestions.map((item, index) => (
                                        <TouchableOpacity
                                            key={index}
                                            style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
                                            onPress={() => selectSuggestion(item)}
                                        >
                                            <Text style={[styles.suggestionText, { color: colors.text }]}>{item}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* Experience */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Experience (Years) *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. 5"
                                keyboardType="number-pad"
                                placeholderTextColor="#999"
                                value={experience}
                                onChangeText={setExperience}
                            />
                        </View>

                        {/* Qualification */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Qualification *</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="e.g. Masters in CS"
                                placeholderTextColor="#999"
                                value={qualification}
                                onChangeText={setQualification}
                            />
                        </View>

                        {/* Short Bio */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>Short Bio (50-200 words) *</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border },
                                    styles.textArea,
                                    (bio.trim().split(/\s+/).filter(Boolean).length > 200) && { borderColor: '#E74C3C' }
                                ]}
                                placeholder="Tell students about yourself..."
                                placeholderTextColor="#999"
                                multiline
                                numberOfLines={6}
                                value={bio}
                                onChangeText={setBio}
                                textAlignVertical="top"
                            />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                {bio.trim().split(/\s+/).filter(Boolean).length > 200 && (
                                    <Text style={{ fontSize: 12, color: '#E74C3C', marginLeft: 4 }}>Too long! Max 200 words.</Text>
                                )}
                                <Text style={[
                                    styles.wordCount,
                                    { flex: 1 },
                                    bio.trim().split(/\s+/).filter(Boolean).length > 200 && { color: '#E74C3C' }
                                ]}>
                                    {bio.trim().split(/\s+/).filter(Boolean).length} / 200 words
                                </Text>
                            </View>
                        </View>

                        {/* LinkedIn / Website */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>LinkedIn / Website (Optional)</Text>
                            <TextInput
                                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
                                placeholder="https://linkedin.com/in/yourprofile"
                                placeholderTextColor="#999"
                                autoCapitalize="none"
                                value={website}
                                onChangeText={setWebsite}
                            />
                        </View>

                        {/* ID Verification Placeholder */}
                        <View style={styles.inputContainer}>
                            <Text style={[styles.label, { color: colors.text }]}>ID Verification (Mandatory for Teachers) *</Text>
                            <TouchableOpacity
                                style={[styles.uploadBox, { backgroundColor: colors.inputBg, borderColor: colors.border }, idCardUri && styles.uploadedBox]}
                                onPress={() => handleImagePick('id')}
                            >
                                <Ionicons
                                    name={idCardUri ? "checkmark-circle" : "cloud-upload-outline"}
                                    size={24}
                                    color={idCardUri ? "#27AE60" : Colors.grey}
                                />
                                <Text style={[styles.uploadText, idCardUri && { color: "#27AE60" }]}>
                                    {idCardUri ? 'ID File Selected' : 'Upload ID Card / Passport'}
                                </Text>
                            </TouchableOpacity>
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
                                <Text style={styles.signUpButtonText}>Register as Instructor</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
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
    container: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 60,
    },
    backButton: {
        marginTop: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: Colors.lightGrey,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        marginTop: 30,
        marginBottom: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.grey,
        marginTop: 8,
    },
    photoSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
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
    uploadedCircle: {
        borderColor: '#27AE60',
        backgroundColor: '#F0FFF4',
        borderStyle: 'solid',
    },
    photoLabel: {
        fontSize: 12,
        color: Colors.grey,
        marginTop: 4,
    },
    form: {
        gap: 20,
    },
    inputContainer: {
        gap: 8,
        position: 'relative',
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.secondary,
        marginLeft: 4,
    },
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
    textArea: {
        height: 120,
        paddingTop: 15,
    },
    wordCount: {
        fontSize: 12,
        color: Colors.grey,
        textAlign: 'right',
        marginRight: 10,
    },
    suggestionsList: {
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
    suggestionItem: {
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F5F5',
    },
    suggestionText: {
        fontSize: 14,
        color: Colors.secondary,
    },
    uploadBox: {
        height: 56,
        backgroundColor: Colors.lightGrey,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#EEE',
        borderStyle: 'dashed',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    uploadedBox: {
        borderColor: '#27AE60',
        backgroundColor: '#F0FFF4',
        borderStyle: 'solid',
    },
    uploadText: {
        fontSize: 14,
        color: Colors.grey,
    },
    signUpButton: {
        width: '100%',
        height: 60,
        backgroundColor: Colors.primary,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    signUpButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: Colors.secondary,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    footerText: {
        fontSize: 16,
        color: Colors.grey,
    },
    loginText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: Colors.primary,
    },
});
