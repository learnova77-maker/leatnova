import AppHeader from '@/components/sidebar/AppHeader';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function StudentCourseDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <AppHeader
                title="Course Details"
                showBack={true}
                onBackPress={() => router.back()}
                role="student"
            />

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.headerCard}>
                    <View style={styles.iconCircle}>
                        <Ionicons name="book-outline" size={40} color={Colors.primary} />
                    </View>
                    <Text style={styles.title}>Welcome to Course {id}</Text>
                    <Text style={styles.subtitle}>Start your learning journey today!</Text>
                </View>

                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>About this course</Text>
                    <Text style={styles.description}>
                        This course is designed to help you master the fundamentals and advance your skills.
                        Enroll now to get access to all modules and lectures.
                    </Text>
                </View>

                <TouchableOpacity style={styles.enrollBtn}>
                    <Text style={styles.enrollText}>Enroll Now</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FAFB' },
    content: { padding: 20 },
    headerCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 30, alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#F0F0F0' },
    iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#F0F9FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: Colors.secondary, textAlign: 'center' },
    subtitle: { fontSize: 14, color: Colors.grey, marginTop: 8, textAlign: 'center' },
    infoSection: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.secondary, marginBottom: 12 },
    description: { fontSize: 14, color: '#4B5563', lineHeight: 22 },
    enrollBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 16, alignItems: 'center' },
    enrollText: { fontSize: 18, fontWeight: 'bold', color: Colors.secondary }
});
