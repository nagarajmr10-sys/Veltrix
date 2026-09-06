import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Lock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  Zap,
  Tag,
  Gift,
  Award,
  Smartphone,
  Layers,
  ChevronRight,
  RefreshCw,
  Printer,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { PurchasablePlan, PurchasedPlanOrder, StructuredWorkout, PaymentMethodType, PaymentCurrency } from '../../types';
import { generateWorkoutsFromPlan } from '../../data/plansData';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  // If plan is provided, we checkout the plan; if null, it functions as standalone Billing / Gateway manager
  plan?: PurchasablePlan | null;
  onSuccess?: (newOrder: PurchasedPlanOrder, scheduledWorkouts: StructuredWorkout[]) => void;
  onNavigateToCalendar?: () => void;
}

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  plan,
  onSuccess,
  onNavigateToCalendar,
}) => {
  // Method selection
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
  const [currency, setCurrency] = useState<PaymentCurrency>('USD');

  // Plan tier selection (if plan provided)
  const [selectedTier, setSelectedTier] = useState<'digital' | 'consultation' | 'vip'>('digital');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    return d.toISOString().split('T')[0];
  });

  // Promo code
  const [promoCode, setPromoCode] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  // Card fields
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState('Alex Rivera');
  const [billingCountry, setBillingCountry] = useState('United States');
  const [billingZip, setBillingZip] = useState('80302');
  const [saveCardForFuture, setSaveCardForFuture] = useState(true);

  // Gateway Simulation States
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [is3DSecureRequired, setIs3DSecureRequired] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Completed State
  const [isCompleted, setIsCompleted] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    transactionId: string;
    authCode: string;
    date: string;
    amount: number;
    receiptNumber: string;
    planTitle: string;
  } | null>(null);

  const [copiedTxn, setCopiedTxn] = useState(false);

  if (!isOpen) return null;

  // Pricing calculations
  const baseItemPrice = plan ? (selectedTier === 'consultation' ? plan.price + 49 : selectedTier === 'vip' ? 149 : plan.price) : 49;
  const discountAmount = Math.round(baseItemPrice * (discountPct / 100));
  const subtotal = Math.max(0, baseItemPrice - discountAmount);
  const taxAmount = Number((subtotal * 0.08).toFixed(2));
  const finalTotal = Number((subtotal + taxAmount).toFixed(2));
  const klarnaInstallment = (finalTotal / 4).toFixed(2);

  // Detect card brand
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\s+/g, '');
    if (clean.startsWith('4')) return { name: 'Visa', color: 'text-sky-400', badge: 'bg-sky-500/20' };
    if (clean.startsWith('5')) return { name: 'Mastercard', color: 'text-orange-400', badge: 'bg-orange-500/20' };
    if (clean.startsWith('3')) return { name: 'Amex', color: 'text-emerald-400', badge: 'bg-emerald-500/20' };
    return { name: 'Card', color: 'text-neutral-400', badge: 'bg-neutral-800' };
  };

  const cardBrand = getCardBrand(cardNumber);

  // Format Card Number (adds spaces)
  const handleCardNumberChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 16);
    const spaced = clean.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(spaced);
  };

  // Format Expiry
  const handleExpiryChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 2) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setCardExpiry(clean);
    }
  };

  // Promo code
  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (code === 'VELTRIX20' || code === 'VELTRIX') {
      setDiscountPct(20);
      setPromoMessage('20% Endurance Athlete Discount Applied!');
    } else if (code === 'PROPEAK10') {
      setDiscountPct(15);
      setPromoMessage('15% Season Opener Discount Applied!');
    } else {
      setPromoMessage('Invalid promo code. Try "VELTRIX20"');
    }
  };

  // Test Card Presets
  const applyTestCard = (preset: 'success' | 'decline' | '3ds') => {
    if (preset === 'success') {
      setCardNumber('4242 4242 4242 4242');
      setCardExpiry('12/28');
      setCardCvc('888');
      setErrorMessage(null);
    } else if (preset === 'decline') {
      setCardNumber('4000 0000 0000 0002');
      setCardExpiry('06/27');
      setCardCvc('999');
      setErrorMessage(null);
    } else if (preset === '3ds') {
      setCardNumber('3000 0000 0000 3333');
      setCardExpiry('10/29');
      setCardCvc('333');
      setErrorMessage(null);
    }
  };

  // Process Checkout
  const handleStartPayment = () => {
    setErrorMessage(null);
    setIsProcessing(true);
    setProcessingProgress(15);
    setProcessingStage('Encrypting payload with TLS 1.3 & AES-256...');

    // Test card check: Declined
    if (cardNumber.replace(/\s+/g, '') === '4000000000000002') {
      setTimeout(() => {
        setIsProcessing(false);
        setErrorMessage('Transaction Declined: Insufficient funds on card or bank authorization failure (Error Code: ERR_DECLINED_051).');
      }, 1500);
      return;
    }

    // Test card check: 3D Secure
    if (cardNumber.replace(/\s+/g, '') === '3000000000003333') {
      setTimeout(() => {
        setIsProcessing(false);
        setIs3DSecureRequired(true);
      }, 1200);
      return;
    }

    // Normal successful pipeline
    executeSuccessfulPayment();
  };

  const executeSuccessfulPayment = () => {
    setProcessingProgress(45);
    setProcessingStage('Routing token to Global Card Interchange Network...');

    setTimeout(() => {
      setProcessingProgress(75);
      setProcessingStage('Screening anti-fraud and token authorization...');

      setTimeout(() => {
        setProcessingProgress(100);
        setProcessingStage('Settling funds and provisioning digital athlete license...');

        setTimeout(() => {
          completeOrder();
        }, 600);
      }, 700);
    }, 800);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.trim() === '742918' || otpCode.trim().length === 6) {
      setIs3DSecureRequired(false);
      setIsProcessing(true);
      executeSuccessfulPayment();
    } else {
      setOtpError('Invalid OTP code. For test verification enter: 742918');
    }
  };

  const completeOrder = () => {
    const txnId = `txn_${Math.random().toString(36).substring(2, 11)}_vltx`;
    const auth = `AUTH-${Math.floor(100000 + Math.random() * 900000)}`;
    const receiptNum = `RCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const title = plan ? plan.title : 'Veltrix Pro Athlete Membership (Annual)';

    const receipt = {
      transactionId: txnId,
      authCode: auth,
      date: new Date().toISOString(),
      amount: finalTotal,
      receiptNumber: receiptNum,
      planTitle: title,
    };

    setReceiptData(receipt);
    setIsProcessing(false);
    setIsCompleted(true);

    if (plan && onSuccess) {
      const scheduledWorkouts = generateWorkoutsFromPlan(plan, startDate);
      const newOrder: PurchasedPlanOrder = {
        id: `order-${Date.now()}`,
        planId: plan.id,
        planTitle: plan.title,
        sport: plan.sport,
        pricePaid: finalTotal,
        tier: selectedTier,
        purchaseDate: new Date().toISOString().split('T')[0],
        startDate: startDate,
        status: 'active',
        currentWeek: 1,
        durationWeeks: plan.durationWeeks,
        coachName: plan.coach.name,
        avgWeeklyTSS: plan.avgWeeklyTSS,
      };
      onSuccess(newOrder, scheduledWorkouts);
    }
  };

  const copyTransactionId = () => {
    if (receiptData) {
      navigator.clipboard.writeText(receiptData.transactionId);
      setCopiedTxn(true);
      setTimeout(() => setCopiedTxn(false), 2000);
    }
  };

  const downloadReceipt = () => {
    if (!receiptData) return;
    const text = `=====================================================
VELTRIX ENDURANCE ANALYTICS - PAYMENT RECEIPT
=====================================================
Receipt Number:   ${receiptData.receiptNumber}
Transaction ID:   ${receiptData.transactionId}
Authorization:    ${receiptData.authCode}
Date & Time:      ${new Date(receiptData.date).toLocaleString()}
Customer Name:    ${cardName}
Customer Country: ${billingCountry} (ZIP: ${billingZip})
Payment Method:   ${selectedMethod.toUpperCase()} (${cardBrand.name} ending in ${cardNumber.slice(-4)})
-----------------------------------------------------
Item:             ${receiptData.planTitle}
Subtotal:         $${subtotal.toFixed(2)} USD
Tax (8%):         $${taxAmount.toFixed(2)} USD
-----------------------------------------------------
TOTAL CHARGED:    $${receiptData.amount.toFixed(2)} USD
Status:           PAID & VERIFIED (3DS AES-256)
=====================================================
Thank you for training with Veltrix Pro!`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Veltrix_Receipt_${receiptData.receiptNumber}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-5 sm:p-7 space-y-6 shadow-2xl relative my-auto animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 3D SECURE OTP MODAL OVERLAY */}
        {is3DSecureRequired && (
          <div className="absolute inset-0 z-20 bg-neutral-950/95 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-5 animate-fadeIn">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="text-center space-y-1 max-w-sm">
              <div className="text-xs font-mono uppercase tracking-widest text-sky-400 font-bold">
                Bank 3D Secure 2.0 Verification
              </div>
              <h3 className="text-xl font-black text-white font-mono">
                AUTHENTICATE TRANSACTION
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Your bank requires two-factor authentication for this transaction of{' '}
                <strong className="text-white">${finalTotal}</strong>. A one-time verification SMS has been sent.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="w-full max-w-xs space-y-4">
              <div>
                <label className="block text-[11px] font-mono text-neutral-300 text-center mb-1.5">
                  Enter 6-Digit SMS Passcode (Test code: <strong>742918</strong>)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="742918"
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value);
                    setOtpError(null);
                  }}
                  className="w-full text-center tracking-[0.5em] font-mono text-xl bg-neutral-900 border border-sky-500/50 rounded-xl py-2.5 text-white focus:outline-none focus:border-sky-400"
                />
                {otpError && (
                  <p className="text-xs text-rose-400 font-mono mt-1 text-center">{otpError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIs3DSecureRequired(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-mono font-bold hover:bg-neutral-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black text-xs font-mono font-bold shadow-md shadow-sky-500/30"
                >
                  Confirm & Pay
                </button>
              </div>
            </form>
          </div>
        )}

        {/* PROCESSING OVERLAY */}
        {isProcessing && (
          <div className="absolute inset-0 z-20 bg-neutral-950/95 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center space-y-5 animate-fadeIn">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 animate-spin" />
            </div>

            <div className="text-center space-y-1 max-w-sm">
              <h3 className="text-lg font-black text-white font-mono">
                AUTHORIZING PAYMENT...
              </h3>
              <p className="text-xs text-neutral-400 font-mono">{processingStage}</p>
            </div>

            {/* Progress Bar */}
            <div className="w-64 h-2 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300 rounded-full"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
            <span className="text-[10px] font-mono text-neutral-500">
              End-to-End Encrypted via PCI-DSS Level 1 Gateway
            </span>
          </div>
        )}

        {/* SCREEN 1: CHECKOUT & PAYMENT FORM */}
        {!isCompleted ? (
          <div className="space-y-6">
            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
                  <CreditCard className="w-4 h-4" />
                </span>
                <span className="text-xs font-mono text-orange-400 uppercase tracking-widest font-bold">
                  VELTRIX SECURE PAYMENT GATEWAY
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-mono mt-1">
                {plan ? plan.title : 'Veltrix Athlete Payment Gateway'}
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                Instant digital provisioning, 256-bit SSL encryption & direct sync to Training Calendar
              </p>
            </div>

            {/* Error Message if Declined */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Payment Error:</span> {errorMessage}
                </div>
              </div>
            )}

            {/* Test Card Sandbox Selector */}
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  SANDBOX TEST CARDS (1-CLICK FILL):
                </span>
                <span className="text-[10px] text-neutral-500">Live Gateway Simulation</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyTestCard('success')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-mono hover:bg-emerald-500/25 transition"
                >
                  ✓ Success (4242)
                </button>
                <button
                  type="button"
                  onClick={() => applyTestCard('decline')}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono hover:bg-rose-500/25 transition"
                >
                  ✕ Decline (4000)
                </button>
                <button
                  type="button"
                  onClick={() => applyTestCard('3ds')}
                  className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px] font-mono hover:bg-sky-500/25 transition"
                >
                  🛡️ 3D Secure (3000)
                </button>
              </div>
            </div>

            {/* Payment Method Selector Tabs */}
            <div className="space-y-2">
              <label className="block text-[11px] font-mono text-neutral-400 uppercase tracking-wider">
                Select Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('card')}
                  className={`p-3 rounded-xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition ${
                    selectedMethod === 'card'
                      ? 'bg-neutral-800 border-orange-500 text-white shadow-sm'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-orange-400" />
                  <span>Credit Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('apple_pay')}
                  className={`p-3 rounded-xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition ${
                    selectedMethod === 'apple_pay'
                      ? 'bg-neutral-800 border-neutral-300 text-white shadow-sm'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-white" />
                  <span>Apple Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('google_pay')}
                  className={`p-3 rounded-xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition ${
                    selectedMethod === 'google_pay'
                      ? 'bg-neutral-800 border-sky-400 text-white shadow-sm'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-sky-400" />
                  <span>Google Pay</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('klarna')}
                  className={`p-3 rounded-xl border text-xs font-mono font-bold flex flex-col items-center gap-1.5 transition ${
                    selectedMethod === 'klarna'
                      ? 'bg-neutral-800 border-pink-500 text-white shadow-sm'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                  }`}
                >
                  <Zap className="w-4 h-4 text-pink-400" />
                  <span>Klarna (Pay in 4)</span>
                </button>
              </div>
            </div>

            {/* CARD DETAILS FORM */}
            {selectedMethod === 'card' && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    CARD INFORMATION
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${cardBrand.badge} ${cardBrand.color}`}
                  >
                    {cardBrand.name}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      Cardholder Full Name
                    </label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      Card Number (16 Digits)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={19}
                        value={cardNumber}
                        onChange={(e) => handleCardNumberChange(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-700 rounded-xl pl-3 pr-10 py-2 text-xs text-white font-mono tracking-wider focus:outline-none focus:border-orange-500"
                      />
                      <CreditCard className="w-4 h-4 text-neutral-500 absolute right-3 top-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      Expiration (MM/YY)
                    </label>
                    <input
                      type="text"
                      maxLength={5}
                      value={cardExpiry}
                      onChange={(e) => handleExpiryChange(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      Security Code (CVC)
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, ''))}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      Country
                    </label>
                    <select
                      value={billingCountry}
                      onChange={(e) => setBillingCountry(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    >
                      <option value="United States">United States</option>
                      <option value="Canada">Canada</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Germany">Germany</option>
                      <option value="Spain">Spain</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">
                      Postal / ZIP Code
                    </label>
                    <input
                      type="text"
                      value={billingZip}
                      onChange={(e) => setBillingZip(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save-card-toggle"
                    checked={saveCardForFuture}
                    onChange={(e) => setSaveCardForFuture(e.target.checked)}
                    className="rounded border-neutral-700 text-orange-500 focus:ring-0 bg-neutral-900"
                  />
                  <label htmlFor="save-card-toggle" className="text-[11px] text-neutral-400 font-mono">
                    Save this card securely in my athlete wallet for future subscriptions
                  </label>
                </div>
              </div>
            )}

            {/* WALLET 1-TAP (APPLE PAY / GOOGLE PAY) */}
            {(selectedMethod === 'apple_pay' || selectedMethod === 'google_pay') && (
              <div className="p-6 rounded-2xl bg-neutral-950 border border-neutral-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 mx-auto flex items-center justify-center text-white">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="text-sm font-black text-white font-mono">
                  {selectedMethod === 'apple_pay' ? 'Apple Pay Express Checkout' : 'Google Pay Instant Authorization'}
                </div>
                <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                  Click below to authorize <strong>${finalTotal}</strong> securely using your device biometrics (TouchID / FaceID / Fingerprint).
                </p>
              </div>
            )}

            {/* KLARNA PAY IN 4 */}
            {selectedMethod === 'klarna' && (
              <div className="p-4 rounded-2xl bg-neutral-950 border border-pink-500/30 text-xs font-mono space-y-3">
                <div className="flex items-center justify-between text-pink-400 font-bold">
                  <span>Klarna 4 Interest-Free Installments</span>
                  <span>0% APR</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500">Today</div>
                    <div className="font-bold text-white">${klarnaInstallment}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500">2 Weeks</div>
                    <div className="font-bold text-white">${klarnaInstallment}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500">4 Weeks</div>
                    <div className="font-bold text-white">${klarnaInstallment}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                    <div className="text-[10px] text-neutral-500">6 Weeks</div>
                    <div className="font-bold text-white">${klarnaInstallment}</div>
                  </div>
                </div>
              </div>
            )}

            {/* PROMO CODE */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Promo Code (e.g. VELTRIX20)"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-3 py-2 text-xs font-mono text-white uppercase focus:outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleApplyPromo}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white font-mono transition"
              >
                Apply
              </button>
            </div>
            {promoMessage && (
              <div
                className={`text-xs font-mono ${
                  discountPct > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {promoMessage}
              </div>
            )}

            {/* ORDER TOTAL BREAKDOWN */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 font-mono text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Base Item Subtotal:</span>
                <span className="text-white">${baseItemPrice.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-400">
                  <span>Athlete Promo ({discountPct}%):</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-neutral-400">
                <span>Estimated Sales Tax (8%):</span>
                <span className="text-white">${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800">
                <span>Total Due Now:</span>
                <span className="text-orange-400">${finalTotal.toFixed(2)} USD</span>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button
              id="gateway-confirm-payment-btn"
              type="button"
              onClick={handleStartPayment}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-mono font-black text-sm tracking-wide shadow-lg shadow-orange-500/20 hover:opacity-95 transition flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Authorize & Pay ${finalTotal} USD</span>
            </button>
          </div>
        ) : (
          /* SCREEN 2: SUCCESS RECEIPT & INVOICE */
          <div className="space-y-6 animate-fadeIn text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
                PAYMENT SETTLED & VERIFIED
              </span>
              <h3 className="text-2xl font-black text-white font-mono">
                TRANSACTION CONFIRMED!
              </h3>
              <p className="text-xs text-neutral-400 max-w-md mx-auto">
                Thank you! Your payment has been authorized and digital workouts have been scheduled into your Training Calendar.
              </p>
            </div>

            {/* Digital Receipt Card */}
            {receiptData && (
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left font-mono text-xs space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <span className="text-neutral-400">Receipt No:</span>
                  <span className="text-white font-bold">{receiptData.receiptNumber}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Transaction Ref:</span>
                  <div className="flex items-center gap-1.5 text-orange-400 font-mono">
                    <span>{receiptData.transactionId}</span>
                    <button
                      onClick={copyTransactionId}
                      className="p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white"
                      title="Copy Transaction ID"
                    >
                      {copiedTxn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Bank Auth Code:</span>
                  <span className="text-emerald-400">{receiptData.authCode}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-neutral-400">Plan / Item:</span>
                  <span className="text-white font-bold truncate max-w-xs">{receiptData.planTitle}</span>
                </div>

                <div className="flex items-center justify-between border-t border-neutral-800 pt-3">
                  <span className="text-neutral-300 font-bold">Total Amount Paid:</span>
                  <span className="text-lg font-black text-emerald-400">${receiptData.amount.toFixed(2)} USD</span>
                </div>
              </div>
            )}

            {/* Receipt Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={downloadReceipt}
                className="flex-1 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-mono font-bold text-white border border-neutral-700 flex items-center justify-center gap-2 transition"
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>Download PDF Receipt</span>
              </button>

              {onNavigateToCalendar && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToCalendar();
                  }}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-black text-xs font-mono font-bold shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Open in Training Calendar</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
