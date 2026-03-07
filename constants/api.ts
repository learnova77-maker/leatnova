import axios from 'axios';

// Use your computer's IP address instead of localhost for physical device testing
// Android emulator uses 10.0.2.2
const BASE_URL = 'http://192.168.0.100:5000/api';

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

export default api;
