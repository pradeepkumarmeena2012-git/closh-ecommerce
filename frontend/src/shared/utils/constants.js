// API Configuration
// Intelligent URL detection for Production vs Development
const getApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_BASE_URL;
    const hostname = window.location.hostname;
    
    // If we are on the production domain, force the production API
    if (hostname.includes('closh.in')) {
        return 'https://api.closh.in/api';
    }
    
    return envUrl || 'http://localhost:5000/api';
};

const getImageUrlBase = () => {
    const envUrl = import.meta.env.VITE_IMAGE_BASE_URL;
    const hostname = window.location.hostname;
    
    if (hostname.includes('closh.in')) {
        return 'https://api.closh.in';
    }
    
    return envUrl || 'http://localhost:5000';
};

export const API_BASE_URL = getApiBaseUrl();
export const IMAGE_BASE_URL = getImageUrlBase();

// App Constants
export const APP_NAME = 'Appzeto multi vendor E-commerce';
export const APP_DESCRIPTION = 'Multi Vendor E-commerce Platform';

// Animation Durations
export const ANIMATION_DURATION = {
  FAST: 0.3,
  NORMAL: 0.5,
  SLOW: 0.8,
};

// Breakpoints (matching Tailwind)
export const BREAKPOINTS = {
  xs: 375,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

