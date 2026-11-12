declare module 'react-native-razorpay' {
  const RazorpayCheckout: {
    open(options: Record<string, unknown>): Promise<Record<string, unknown>>;
    onExternalWalletSelection(callback: (data: Record<string, unknown>) => void): void;
  };
  export default RazorpayCheckout;
}
