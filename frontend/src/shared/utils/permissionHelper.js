import toast from 'react-hot-toast';

/**
 * Request camera permission explicitly using getUserMedia.
 * This is useful for triggering the browser/native permission prompt.
 */
export const requestCameraPermission = async () => {
    try {
        // Check if mediaDevices is supported
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.warn("Camera API not supported in this browser/environment");
            return false;
        }

        // Try to access camera (video only)
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: { ideal: "environment" } 
            } 
        });

        // If successful, stop the tracks immediately to release the camera
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (err) {
        console.error("Camera permission error:", err);
        
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            toast.error("Camera permission denied. Please allow camera access in your settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            toast.error("No camera found on this device.");
        } else {
            toast.error("Failed to access camera. Please check your permissions.");
        }
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
