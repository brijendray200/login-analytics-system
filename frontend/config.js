// Auto-detect API URL based on environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : 'https://backend-sandy-iota-63.vercel.app/api';

window.API_URL = API_URL;
console.log('API URL:', API_URL);
