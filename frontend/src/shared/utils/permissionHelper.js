import toast from 'react-hot-toast';

/**
 * Request camera permission explicitly using getUserMedia.
 * This is useful for triggering the browser/native permission prompt.
 */
export const requestCameraPermission = async () => {
    try {
        // Modern API
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: { ideal: "environment" } } 
            });
            stream.getTracks().forEach(track => track.stop());
            return true;
        }

        // Legacy API Fallback
        const legacyGetUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
        if (legacyGetUserMedia) {
            return new Promise((resolve) => {
                legacyGetUserMedia.call(navigator, { video: true }, (stream) => {
                    stream.getTracks().forEach(track => track.stop());
                    resolve(true);
                }, () => resolve(false));
            });
        }

        // Context Check (Security)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            toast.error("Camera access requires HTTPS. Please check your connection.");
        } else {
            console.warn("Camera API not supported in this environment");
        }
        
        return false;
    } catch (err) {
        console.error("Camera permission error:", err);
        
        const errorMsg = {
            'NotAllowedError': "Camera permission denied. Please allow access in settings.",
            'PermissionDeniedError': "Camera permission denied. Please allow access in settings.",
            'NotFoundError': "No camera found on this device.",
            'DevicesNotFoundError': "No camera found on this device.",
            'NotReadableError': "Camera is already in use by another app.",
            'SecurityError': "Camera access blocked due to security settings (use HTTPS)."
        }[err.name] || "Failed to access camera. Please check your permissions.";

        toast.error(errorMsg);
        return false;
    }
};

/**
 * Check if camera permission is already granted (if supported by browser)
 */
export const checkCameraPermissionStatus = async () => {
    try {
        if (navigator.permissions && navigator.permissions.query) {
            const status = await navigator.permissions.query({ name: 'camera' });
            return status.state; // 'granted', 'denied', 'prompt'
        }
    } catch (e) {
        console.warn("Permissions API not supported for camera");
    }
    return 'unknown';
};
