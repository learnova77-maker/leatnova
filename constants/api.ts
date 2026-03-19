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
};

export const userApi = {
    getProfile: (uid: string) => api.get(`/users/profile/${uid}`),
    updateProfile: (uid: string, data: any) => api.put(`/users/update/${uid}`, data),
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
    likePost: (data: { postId: string; userId: string }) => api.post('/social/post/like', data),
    commentPost: (data: { postId: string; userId: string; userName: string; text: string }) => api.post('/social/post/comment', data),
    deletePost: (postId: string) => api.delete(`/social/post/delete/${postId}`),
};

export const paymentApi = {
    createCheckout: (data: { courseId: string; courseTitle: string; price: string; studentId: string; studentName: string }) =>
        api.post('/payment/create-checkout', data),
    verifyPayment: (sessionId: string) => api.post('/payment/verify-payment', { sessionId }),
    checkEnrollment: (data: { studentId: string; courseId: string }) => api.post('/payment/check-enrollment', data),
    getEnrollments: (studentId: string) => api.get(`/payment/enrollments/${studentId}`),
};

export default api;
