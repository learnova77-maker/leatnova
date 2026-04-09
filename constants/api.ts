import axios from 'axios';

// Use your computer's IP address instead of localhost for physical device testing
// Android emulator uses 10.0.2.2
const BASE_URL = 'https://learnova-server-k3jg.onrender.com/api';

const api = axios.create({
    baseURL: BASE_URL,
});

export const authApi = {
    signup: (data: any, headers?: any) => api.post('/auth/signup', data, { headers }),
    login: (data: any) => api.post('/auth/login', data),
};

export const courseApi = {
    getCourses: () => api.get('/courses'),
    createCourse: (data: any) => api.post('/courses/create', data),
    addModule: (data: any) => api.post('/courses/module/add', data),
    addLecture: (data: any) => api.post('/courses/lecture/add', data),
    getTeacherDashboard: (id: string) => api.get(`/courses/teacher/${id}`),
    getCourseDetails: (id: string) => api.post(`/courses/details`, { courseId: id }),
    getEnrolledCourses: (studentId: string) => api.get(`/courses/enrolled/${studentId}`),
    deleteCourse: (id: string) => api.delete(`/courses/${id}`),
    getTeacherStudents: (teacherId: string) => api.get(`/courses/teacher-students/${teacherId}`),
};

export const userApi = {
    getProfile: (uid: string) => api.get(`/users/profile/${uid}`),
    updateProfile: (uid: string, data: any) => api.put(`/users/update/${uid}`, data),
    deleteProfile: (uid: string) => api.delete(`/users/delete/${uid}`),
};

export const liveApi = {
    getToken: (data: { channelName: string; uid: number; role: 'publisher' | 'subscriber' }) => api.post('/live/token', data),
    startSession: (data: any) => api.post('/live/session/start', data),
    endSession: (sessionId: string) => api.post('/live/session/end', { sessionId }),
    getActiveSessions: () => api.get('/live/sessions/active'),
};

export const socialApi = {
    getPosts: () => api.get('/social/posts'),
    createPost: (data: { userId: string; userName: string; text: string; mediaUri?: string; mediaType?: string; fileName?: string }) => api.post('/social/post/create', data),
    likePost: (data: { postId: string; userId: string; userName?: string }) => api.post('/social/post/like', data),
    commentPost: (data: { postId: string; userId: string; userName: string; text: string }) => api.post('/social/post/comment', data),
    deletePost: (postId: string) => api.delete(`/social/post/delete/${postId}`),
    getNotifications: (userId: string) => api.get(`/social/notifications/${userId}`),
    markNotificationsRead: (userId: string) => api.post('/social/notifications/read-all', { userId }),
    deleteNotification: (userId: string, notifId: string) => api.delete(`/social/notifications/${userId}/${notifId}`),
    reportPost: (data: { postId: string; userId: string; userName: string; reportType: string; description: string }) => api.post('/social/post/report', data),
};

export const paymentApi = {
    // Student checkout
    createPaymentIntent: (data: { amount: string; courseId: string; studentId: string; studentName: string; courseTitle: string; teacherId?: string }) =>
        api.post('/payment/create-payment-intent', data),
    createCheckout: (data: { price: string; courseId: string; studentId: string; studentName: string; courseTitle: string; teacherId?: string; successUrl?: string; cancelUrl?: string }) =>
        api.post('/payment/create-checkout', data),
    confirmPayment: (paymentIntentId: string) => api.post('/payment/confirm-payment', { paymentIntentId }),
    verifyPayment: (sessionId: string) => api.post('/payment/verify-payment', { sessionId }),
    checkEnrollment: (data: { studentId: string; courseId: string }) => api.post('/payment/check-enrollment', data),
    getEnrollments: (studentId: string) => api.get(`/payment/enrollments/${studentId}`),

    // Teacher Stripe Connect
    onboardTeacher: (data: { teacherId: string; email: string; teacherName?: string }) =>
        api.post('/payment/onboard-teacher', data),
    getOnboardStatus: (teacherId: string) => api.get(`/payment/onboard-status/${teacherId}`),
    getTeacherEarnings: (teacherId: string) => api.get(`/payment/teacher-earnings/${teacherId}`),

    // Admin/Cron
    processPayouts: () => api.post('/payment/process-payouts'),
    getAdminRevenue: () => api.get('/payment/admin/revenue'),
};

export default api;
