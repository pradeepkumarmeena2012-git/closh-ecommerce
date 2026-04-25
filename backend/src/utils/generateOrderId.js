/**
 * Generates a unique order ID: ORD-{timestamp}-{random4}
 */
export const generateOrderId = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${datePart}-${random}`;
};
