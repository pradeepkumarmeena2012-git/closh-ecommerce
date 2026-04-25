/**
 * Generates a unique Return ID: RET-YYMMDD-RANDOM4
 */
export const generateReturnId = () => {
    const now = new Date();
    const datePart = now.toISOString().slice(2, 10).replace(/-/g, ''); // YYMMDD
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `RET-${datePart}-${random}`;
};
