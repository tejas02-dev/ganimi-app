import { Alert, NativeModules } from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { apiService } from './api';

const RAZORPAY_UNAVAILABLE_MSG =
  "Razorpay requires a development build. Run 'npx expo run:android' or 'npx expo run:ios' instead of Expo Go to test payments.";

export interface CategoryPaymentData {
  key: string;
  amount: number;
  orderId: string;
  categories?: string[] | string;
}

export interface PaymentOptions {
  successMessage?: string;
  onSuccess?: (data: any, response: any) => void;
  onError?: (error: any) => void;
}

/**
 * Verify payment with backend after Razorpay success.
 */
async function verifyPayment(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
): Promise<{ status: string; message?: string }> {
  const data = await apiService.post<{ status: string; message?: string }>('/payments/verify', {
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    razorpay_signature: razorpaySignature,
  });
  return data;
}

/**
 * Initiates Razorpay payment for category access (React Native).
 * Uses react-native-razorpay Checkout, then verifies with backend.
 */
export async function initiateCategoryPayment(
  paymentData: CategoryPaymentData,
  options: PaymentOptions = {}
): Promise<void> {
  const {
    successMessage = 'Subscribed to category successfully!',
    onSuccess,
    onError,
  } = options;

  try {
    if (!NativeModules.RNRazorpayCheckout) {
      Alert.alert('Payments Unavailable', RAZORPAY_UNAVAILABLE_MSG);
      if (onError) onError(new Error(RAZORPAY_UNAVAILABLE_MSG));
      return;
    }

    const categoryList = Array.isArray(paymentData.categories)
      ? paymentData.categories
      : paymentData.categories
        ? [paymentData.categories]
        : [];
    const description =
      categoryList.length === 1
        ? `Purchase access to ${categoryList[0]}`
        : categoryList.length > 1
          ? `Purchase access to ${categoryList.join(', ')}`
          : 'Category access';

    const razorpayOptions: Record<string, any> = {
      description,
      currency: 'INR',
      key: paymentData.key,
      amount: paymentData.amount,
      order_id: paymentData.orderId,
      name: 'Ganimi - Category Access',
      theme: { color: '#2563EB' },
      prefill: {
        email: '',
        contact: '',
      },
    };

    const data = await RazorpayCheckout.open(razorpayOptions);

    const razorpayOrderId = data.razorpay_order_id ?? data.razorpayOrderId;
    const razorpayPaymentId = data.razorpay_payment_id ?? data.razorpayPaymentId;
    const razorpaySignature = data.razorpay_signature ?? data.razorpaySignature;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new Error('Invalid payment response from Razorpay');
    }

    const verifyResult = await verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (verifyResult.status === 'ok') {
      Alert.alert('Success', successMessage);
      if (onSuccess) onSuccess(verifyResult, data);
    } else {
      const msg = verifyResult.message ?? 'Payment verification failed';
      Alert.alert('Error', msg);
      if (onError) onError(verifyResult);
    }
  } catch (error: any) {
    if (error?.code === 2) {
      // User cancelled
      return;
    }
    if (error?.message?.includes("'open' of null")) {
      Alert.alert('Payments Unavailable', RAZORPAY_UNAVAILABLE_MSG);
      if (onError) onError(error);
      return;
    }
    console.error('Razorpay payment error:', error);
    const msg = error?.message ?? 'Failed to initiate payment';
    Alert.alert('Error', msg);
    if (onError) onError(error);
  }
}

/**
 * Initiates Razorpay payment for service/batch (React Native).
 */
export async function initiateServicePayment(
  paymentData: { key: string; amount: number; orderId: string },
  serviceName: string,
  batchName: string | null,
  options: PaymentOptions = {}
): Promise<void> {
  const {
    successMessage = 'Payment successful',
    onSuccess,
    onError,
  } = options;

  try {
    if (!NativeModules.RNRazorpayCheckout) {
      Alert.alert('Payments Unavailable', RAZORPAY_UNAVAILABLE_MSG);
      if (onError) onError(new Error(RAZORPAY_UNAVAILABLE_MSG));
      return;
    }

    const description = batchName
      ? `Payment for ${serviceName} - ${batchName}`
      : `Payment for ${serviceName}`;

    const razorpayOptions: Record<string, any> = {
      description,
      currency: 'INR',
      key: paymentData.key,
      amount: paymentData.amount,
      order_id: paymentData.orderId,
      name: `Ganimi - ${serviceName}`,
      theme: { color: '#2563EB' },
      prefill: { email: '', contact: '' },
    };

    const data = await RazorpayCheckout.open(razorpayOptions);

    const razorpayOrderId = data.razorpay_order_id ?? data.razorpayOrderId;
    const razorpayPaymentId = data.razorpay_payment_id ?? data.razorpayPaymentId;
    const razorpaySignature = data.razorpay_signature ?? data.razorpaySignature;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new Error('Invalid payment response from Razorpay');
    }

    const verifyResult = await verifyPayment(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (verifyResult.status === 'ok') {
      Alert.alert('Success', successMessage);
      if (onSuccess) onSuccess(verifyResult, data);
    } else {
      Alert.alert('Error', verifyResult.message ?? 'Payment verification failed');
      if (onError) onError(verifyResult);
    }
  } catch (error: any) {
    if (error?.code === 2) return; // User cancelled
    if (error?.message?.includes("'open' of null")) {
      Alert.alert('Payments Unavailable', RAZORPAY_UNAVAILABLE_MSG);
      if (onError) onError(error);
      return;
    }
    console.error('Razorpay payment error:', error);
    Alert.alert('Error', error?.message ?? 'Failed to initiate payment');
    if (onError) onError(error);
  }
}
