import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL 
    ? `${process.env.REACT_APP_API_URL}/api`
    : 'http://localhost:5000/api',   // fallback only for local dev
});

// Rest of your interceptors stay exactly the same...
// (request interceptor, response interceptor, etc.)

API.interceptors.request.use((req) => {
  const patientToken = localStorage.getItem('token');
  const doctorToken = localStorage.getItem('doctor_token');
  
  console.log('Request URL:', req.url);
  console.log('Request headers:', req.headers);
  
  if (req.url.includes('/doctor/') && doctorToken) {
    req.headers.Authorization = `Bearer ${doctorToken}`;
    console.log('Doctor token added to request:', doctorToken);
  } else if (patientToken && !req.url.includes('/doctor/')) {
    req.headers.Authorization = `Bearer ${patientToken}`;
    console.log('Patient token added to request:', patientToken);
  } else {
    console.log('No appropriate token found in localStorage');
  }
  
  return req;
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

API.interceptors.response.use((response) => {
  console.log('Response received:', response.data);
  return response;
}, (error) => {
  console.error('Response error:', error.response || error);
  
  if (error.response?.status === 401 || error.response?.status === 422) {
    const isDoctorEndpoint = error.config?.url?.includes('/doctor/');
    
    if (isDoctorEndpoint) {
      localStorage.removeItem('doctor_token');
      localStorage.removeItem('doctor_id');
      localStorage.removeItem('doctor_role');
      localStorage.removeItem('doctor_info');
      console.log('Doctor authentication cleared due to 401/422 error');
      window.location.href = '/doctor/login';
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('user_id');
      console.log('Patient authentication cleared due to 401/422 error');
      window.location.href = '/login';
    }
  }
  
  return Promise.reject(error);
});

export default API;