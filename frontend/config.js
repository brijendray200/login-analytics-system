// Auto-detect API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://login-analytics-system.onrender.com/api';

window.API_URL = API_URL;
