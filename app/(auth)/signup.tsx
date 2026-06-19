import { authApi } from '@/constants/api';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
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

const SUBJECT_SUGGESTIONS = [
    'Web Development', 'Mobile App Development', 'React Native', 'English (IELTS/TOEFL)',
    'Mathematics', 'Physics', 'Chemistry', 'Graphic Design', 'Digital Marketing',
    'Chinese Language (HSK)', 'Data Science', 'UI/UX Design', 'Business Management'
];

export default function SignUpScreen() {
    const { googleName, googleEmail, isGoogleAuth, uid, googlePhoto } = useLocalSearchParams<{ googleName: string, googleEmail: string, isGoogleAuth: string, uid: string, googlePhoto: string }>();
    const router = useRouter();
    const { colors, isDark } = useTheme();

    const [fullName, setFullName] = useState(googleName || '');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(googleEmail || '');
    const [expertise, setExpertise] = useState('');
    const [bio, setBio] = useState('');
    const [experience, setExperience] = useState('');
    const [website, setWebsite] = useState('');
    const [qualification, setQualification] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(googlePhoto || null);
    const [idCardUri, setIdCardUri] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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
        if (text && text.length > 0) {
            const filtered = SUBJECT_SUGGESTIONS.filter(item => item.toLowerCase().includes(text.toLowerCase()));
            setFilteredSuggestions(filtered);
            setShowSuggestions(filtered.length > 0);
        } else {
            setShowSuggestions(false);
        }
    };

    const handleSignUp = async () => {
        if (!fullName || !email || !username || !expertise || !experience || !qualification) {
            Alert.alert('Incomplete Form', 'Please fill in all required fields.');
            return;
        }

        const bioTrimmed = (bio || '').trim();
        const wordCount = bioTrimmed ? bioTrimmed.split(/\s+/).filter(Boolean).length : 0;
        if (bioTrimmed && (wordCount < 50 || wordCount > 200)) {
            Alert.alert('Bio Length Error', 'Bio must be between 50 and 200 words.');
            return;
        }

        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('fullName', fullName);
            formData.append('username', username.toLowerCase());
            formData.append('email', email);
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

            if (photoUri && typeof photoUri === 'string' && !photoUri.startsWith('http')) {
                const uriParts = photoUri.split('.');
                const fileType = uriParts[uriParts.length - 1] || 'jpg';
                formData.append('photo', { uri: photoUri, name: `photo.${fileType}`, type: `image/${fileType}` } as any);
            } else if (photoUri && typeof photoUri === 'string' && photoUri.startsWith('http')) {
                formData.append('photoUrl', photoUri);
            }

            if (idCardUri && typeof idCardUri === 'string') {
                const uriParts = idCardUri.split('.');
                const fileType = uriParts[uriParts.length - 1] || 'jpg';
                formData.append('idCard', { uri: idCardUri, name: `idcard.${fileType}`, type: `image/${fileType}` } as any);
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
                            <Text style={styles.welcomeSubSmall}>• TEACHER REGISTRATION</Text>
                            <Text style={[styles.title, { color: '#1A1A1A' }]}>Join as <Text style={{ color: '#00AEEF' }}>Teacher</Text></Text>
                            <Text style={[styles.subtitle, { color: '#666' }]}>Complete your profile to share your knowledge.</Text>
                        </View>

                        <View style={styles.photoSection}>
                            <TouchableOpacity
                                style={[styles.photoCircle, { backgroundColor: '#F8F9FA', borderColor: '#00AEEF' }]}
                                onPress={() => handleImagePick('photo')}
                            >
                                {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoImage} /> : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Ionicons name="camera-outline" size={32} color="#00AEEF" />
                                        <Text style={styles.photoPlaceholderText}>ADD PHOTO</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        <View style={styles.form}>
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
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={[styles.inputContainer, { zIndex: 1000 }]}>
                                <Text style={styles.label}>SUBJECT EXPERTISE</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="e.g. MATHEMATICS"
                                    placeholderTextColor="#AAA"
                                    value={expertise}
                                    onChangeText={handleExpertiseChange}
                                    onFocus={() => expertise.length > 0 && setShowSuggestions(true)}
                                />
                                {showSuggestions && (
                                    <View style={[styles.suggestionsList, { backgroundColor: '#FFFFFF', borderColor: '#00AEEF', borderWidth: 1 }]}>
                                        {filteredSuggestions.map((item, index) => (
                                            <TouchableOpacity key={index} style={styles.suggestionItem} onPress={() => { setExpertise(item); setShowSuggestions(false); }}>
                                                <Text style={{ color: '#1A1A1A', fontSize: 13, fontWeight: '700' }}>{item.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>YEARS OF EXPERIENCE</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="e.g. 10"
                                    placeholderTextColor="#AAA"
                                    keyboardType="number-pad"
                                    value={experience}
                                    onChangeText={setExperience}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>QUALIFICATIONS</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="e.g. Masters in Math"
                                    placeholderTextColor="#AAA"
                                    value={qualification}
                                    onChangeText={setQualification}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>ABOUT YOU (BIO - OPTIONAL)</Text>
                                <TextInput
                                    style={[styles.input, styles.textArea, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="Write a brief bio about yourself..."
                                    placeholderTextColor="#AAA"
                                    multiline
                                    numberOfLines={6}
                                    value={bio}
                                    onChangeText={setBio}
                                    textAlignVertical="top"
                                />
                                <Text style={[styles.wordCount, { color: bio.trim().split(/\s+/).filter(Boolean).length > 200 ? '#FF0000' : '#00AEEF' }]}>
                                    {bio.trim().split(/\s+/).filter(Boolean).length} / 200 WORDS
                                </Text>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>WEBSITE / LINKEDIN</Text>
                                <TextInput
                                    style={[styles.input, { backgroundColor: '#F8F9FA', color: '#1A1A1A', borderColor: 'rgba(0,174,239,0.1)' }]}
                                    placeholder="https://"
                                    placeholderTextColor="#AAA"
                                    autoCapitalize="none"
                                    value={website}
                                    onChangeText={setWebsite}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.label}>ID CARD / PASSPORT *</Text>
                                <TouchableOpacity
                                    style={[styles.uploadBox, { backgroundColor: '#F8F9FA', borderColor: idCardUri ? '#00AEEF' : 'rgba(0,174,239,0.1)' }]}
                                    onPress={() => handleImagePick('id')}
                                >
                                    <Ionicons name={idCardUri ? "shield-checkmark" : "cloud-upload-outline"} size={20} color="#00AEEF" />
                                    <Text style={[styles.uploadText, { color: idCardUri ? '#00AEEF' : '#666' }]}>
                                        {idCardUri ? 'DOCUMENT ATTACHED' : 'UPLOAD ID CARD'}
                                    </Text>
                                </TouchableOpacity>
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
    navHeader: { paddingTop: Platform.OS === 'android' ? 20 : 0, marginBottom: 20 },
    scrollContent: { paddingHorizontal: 32, paddingBottom: 60, flexGrow: 1 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'flex-start' },
    header: { marginBottom: 30 },
    welcomeSubSmall: { fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 2, marginBottom: 12 },
    title: { fontSize: 32, fontWeight: '900', letterSpacing: -1, fontFamily: Platform.OS === 'ios' ? 'Space Grotesk' : 'SpaceGrotesk-Bold' },
    subtitle: { fontSize: 13, marginTop: 12, fontWeight: '600', letterSpacing: 0.3 },
    photoSection: { alignItems: 'center', marginBottom: 40 },
    photoCircle: { width: 110, height: 110, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    photoImage: { width: '100%', height: '100%' },
    photoPlaceholderText: { fontSize: 8, fontWeight: '900', color: '#00AEEF', marginTop: 8, letterSpacing: 1 },
    form: { gap: 24 },
    inputContainer: { gap: 12, position: 'relative' },
    label: { fontSize: 10, fontWeight: '900', color: '#00AEEF', letterSpacing: 2 },
    input: { height: 60, borderRadius: 12, paddingHorizontal: 20, fontSize: 14, borderWidth: 1, fontWeight: '700' },
    textArea: { height: 130, paddingTop: 16 },
    wordCount: { fontSize: 9, fontWeight: '900', textAlign: 'right', marginTop: 4, letterSpacing: 1 },
    suggestionsList: { position: 'absolute', top: 90, left: 0, right: 0, borderRadius: 12, elevation: 15, zIndex: 10000, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20 },
    suggestionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(0,174,239,0.1)' },
    uploadBox: { height: 60, borderRadius: 12, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    uploadText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    signUpButton: { height: 60, backgroundColor: '#00AEEF', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 20, elevation: 8, shadowColor: '#00AEEF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
    signUpButtonText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 50, gap: 8, paddingBottom: 60 },
    footerText: { fontSize: 10, fontWeight: '900', color: '#666', letterSpacing: 1 },
    loginText: { color: '#00AEEF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
