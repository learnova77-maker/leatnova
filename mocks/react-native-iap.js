export const initConnection = async () => false;
export const endConnection = async () => {};
export const fetchProducts = async () => [];
export const finishTransaction = async () => {};
export const purchaseErrorListener = () => ({ remove: () => {} });
export const purchaseUpdatedListener = () => ({ remove: () => {} });
export const requestPurchase = async () => {};
export const getProducts = async () => [];
export const flushFailedPurchasesCachedAsPendingAndroid = async () => {};
export const getAvailablePurchases = async () => [];

export default {
    initConnection,
    endConnection,
    fetchProducts,
    finishTransaction,
    purchaseErrorListener,
    purchaseUpdatedListener,
    requestPurchase,
    getProducts,
    flushFailedPurchasesCachedAsPendingAndroid,
    getAvailablePurchases
};
