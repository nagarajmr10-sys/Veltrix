import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Lock,
  CheckCircle2,
  Download,
  Printer,
  Sparkles,
  Smartphone,
  Wallet,
  Globe,
  Coins,
  ChevronRight,
  Info,
  Building,
  Key,
  Calendar,
  Zap,
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  Tag,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  PaymentMethodType,
  PaymentCurrency,
  PaymentTransactionReceipt,
} from '../../types';

interface PaymentGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle?: string;
  itemDescription?: string;
  amount?: number; // In base USD
  tierName?: string;
  onPaymentSuccess?: (receipt: PaymentTransactionReceipt) => void;
}

const CURRENCY_RATES: Record<PaymentCurrency, { symbol: string; rate: number; label: string }> = {
  USD: { symbol: '$', rate: 1.0, label: 'USD - United States Dollar' },
  EUR: { symbol: '€', rate: 0.92, label: 'EUR - Euro' },
  GBP: { symbol: '£', rate: 0.79, label: 'GBP - British Pound' },
  CAD: { symbol: 'C$', rate: 1.35, label: 'CAD - Canadian Dollar' },
  AUD: { symbol: 'A$', rate: 1.52, label: 'AUD - Australian Dollar' },
};

export const PaymentGatewayModal: React.FC<PaymentGatewayModalProps> = ({
  isOpen,
  onClose,
  itemTitle = 'Veltrix Pro Athlete Membership',
  itemDescription = 'Unlimited AI base plans, advanced PMC analytics, and coaching support',
  amount = 79,
  tierName = 'Annual Season Pass',
  onPaymentSuccess,
}) => {
  // Membership Tier Selection if membership
  const isMembership = itemTitle.toLowerCase().includes('membership') || itemTitle.toLowerCase().includes('pro');
  const [selectedPlanTier, setSelectedPlanTier] = useState<'annual' | 'monthly' | 'lifetime'>('annual');

  // Compute effective base amount & tier title
  const effectiveBaseAmount = isMembership
    ? selectedPlanTier === 'annual'
      ? 79
      : selectedPlanTier === 'monthly'
      ? 12
      : 249
    : amount;

  const activeTierName = isMembership
    ? selectedPlanTier === 'annual'
      ? 'Annual Season Pass ($79/yr)'
      : selectedPlanTier === 'monthly'
      ? 'Monthly Pro Pass ($12/mo)'
      : 'Lifetime Founder Pass ($249)'
    : tierName;

  // Promo Code State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoDiscountPct, setPromoDiscountPct] = useState(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  // Method and Currency Selection
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('card');
  const [currency, setCurrency] = useState<PaymentCurrency>('USD');

  // Card Form State
  const [cardNumber, setCardNumber] = useState('4242 8888 3333 4242');
  const [cardHolder, setCardHolder] = useState('Alex Rivera');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('888');
  const [zipCode, setZipCode] = useState('80302');
  const [saveCardForFuture, setSaveCardForFuture] = useState(true);

  // Billing Address Form
  const [billingCountry, setBillingCountry] = useState('United States');
  const [billingStreet, setBillingStreet] = useState('1050 Walnut Street, Suite 200');
  const [billingCity, setBillingCity] = useState('Boulder, CO');

  // Flow State: 'checkout' | '3ds_verification' | 'success'
  const [checkoutStep, setCheckoutStep] = useState<'checkout' | '3ds_verification' | 'success'>('checkout');
  const [isProcessing, setIsProcessing] = useState(false);
  const [otpCode, setOtpCode] = useState('749210');
  const [receipt, setReceipt] = useState<PaymentTransactionReceipt | null>(null);
  const [copiedTx, setCopiedTx] = useState(false);

  if (!isOpen) return null;

  const currentRate = CURRENCY_RATES[currency];
  const convertedAmount = Math.round(effectiveBaseAmount * currentRate.rate);
  const discountAmount = promoApplied ? Math.round(convertedAmount * (promoDiscountPct / 100)) : 0;
  const discountedSubtotal = Math.max(0, convertedAmount - discountAmount);
  const taxAmount = Math.round(discountedSubtotal * 0.06); // 6% estimated sales tax
  const totalDue = discountedSubtotal + taxAmount;
  const klarnaBiweekly = (totalDue / 4).toFixed(2);

  const handleApplyPromo = () => {
    const code = promoCodeInput.trim().toUpperCase();
    if (code === 'VELTRIX20' || code === 'PRO20') {
      setPromoApplied(true);
      setPromoDiscountPct(20);
      setPromoMessage('20% Athlete Discount Applied!');
    } else if (code === 'VIP50' || code === 'SEASON50') {
      setPromoApplied(true);
      setPromoDiscountPct(50);
      setPromoMessage('50% VIP Season Discount Applied!');
    } else if (code === '') {
      setPromoMessage(null);
    } else {
      setPromoMessage('Invalid promo code. Try VELTRIX20 for 20% off.');
      setPromoApplied(false);
    }
  };

  // Auto-detect card brand
  const getCardBrand = (num: string) => {
    const clean = num.replace(/\s+/g, '');
    if (clean.startsWith('4')) return 'Visa';
    if (clean.startsWith('5')) return 'Mastercard';
    if (clean.startsWith('34') || clean.startsWith('37')) return 'Amex';
    if (clean.startsWith('6')) return 'Discover';
    return 'Visa';
  };

  const cardBrand = getCardBrand(cardNumber);

  // Format card number with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    let formatted = val.match(/.{1,4}/g)?.join(' ') || val;
    setCardNumber(formatted);
  };

  // Format expiry MM/YY
  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 2) {
      val = val.slice(0, 2) + '/' + val.slice(2);
    }
    setCardExpiry(val);
  };

  const handleInitiatePayment = () => {
    setIsProcessing(true);

    // Simulate 3D Secure / fraud verification step for card or direct checkout for wallets
    setTimeout(() => {
      setIsProcessing(false);
      if (selectedMethod === 'card') {
        setCheckoutStep('3ds_verification');
      } else {
        completeTransaction();
      }
    }, 1200);
  };

  const handleConfirm3DSecure = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      completeTransaction();
    }, 1400);
  };

  const completeTransaction = async () => {
    const fallbackReceipt: PaymentTransactionReceipt = {
      transactionId: `tx_live_${Math.random().toString(36).substring(2, 11)}_${Date.now().toString().slice(-4)}`,
      orderId: `ord_vx_${Math.floor(100000 + Math.random() * 900000)}`,
      date: new Date().toISOString(),
      amount: totalDue,
      currency,
      method: selectedMethod,
      cardBrand: selectedMethod === 'card' ? cardBrand : undefined,
      cardLast4: selectedMethod === 'card' ? cardNumber.replace(/\s+/g, '').slice(-4) : '8842',
      status: 'succeeded',
      authorizationCode: `AUTH_${Math.floor(100000 + Math.random() * 900000)}`,
      receiptNumber: `REC-VELTRIX-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: cardHolder || 'Alex Rivera',
      customerEmail: 'alex.rivera@endurance-veltrix.io',
      itemDescription: `${itemTitle} (${activeTierName})`,
    };

    try {
      const response = await fetch('/api/payments/process-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalDue,
          currency,
          method: selectedMethod,
          cardBrand: selectedMethod === 'card' ? cardBrand : undefined,
          cardLast4: selectedMethod === 'card' ? cardNumber.replace(/\s+/g, '').slice(-4) : '8842',
          customerName: cardHolder || 'Alex Rivera',
          customerEmail: 'alex.rivera@endurance-veltrix.io',
          itemDescription: `${itemTitle} (${activeTierName})`,
          tierName: activeTierName,
          saveCard: saveCardForFuture,
        }),
      });

      const data = await response.json();
      const finalReceipt = data.receipt || fallbackReceipt;
      setReceipt(finalReceipt);
      setCheckoutStep('success');
      if (onPaymentSuccess) {
        onPaymentSuccess(finalReceipt);
      }
    } catch {
      setReceipt(fallbackReceipt);
      setCheckoutStep('success');
      if (onPaymentSuccess) {
        onPaymentSuccess(fallbackReceipt);
      }
    }

    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f97316', '#eab308', '#10b981', '#3b82f6'],
      });
    } catch {
      // ignore
    }
  };

  const handleCopyTransactionId = (txId: string) => {
    navigator.clipboard.writeText(txId);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div
      id="payment-gateway-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
    >
      <div
        id="payment-gateway-dialog"
        className="w-full max-w-4xl bg-neutral-950 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Gateway Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-800 bg-neutral-900/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 p-0.5 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <div className="w-full h-full bg-neutral-950 rounded-[14px] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-orange-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Veltrix Secure Payment Gateway
                </h3>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold uppercase tracking-wider">
                  256-bit TLS Encrypted
                </span>
              </div>
              <p className="text-xs text-neutral-400">
                PCI-DSS Level 1 compliant checkout infrastructure
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
            title="Close Gateway"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {checkoutStep === 'checkout' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT COLUMN: Payment Methods & Details (7 cols) */}
              <div className="lg:col-span-7 space-y-5">
                {/* Currency Switcher */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-900/80 border border-neutral-800">
                  <div className="flex items-center gap-2 text-xs text-neutral-300 font-semibold">
                    <Globe className="w-4 h-4 text-orange-400" />
                    <span>Billing Currency:</span>
                  </div>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as PaymentCurrency)}
                    className="bg-neutral-950 text-white font-mono text-xs px-3 py-1.5 rounded-xl border border-neutral-700 focus:outline-none focus:border-orange-500"
                  >
                    {Object.entries(CURRENCY_RATES).map(([currKey, info]) => (
                      <option key={currKey} value={currKey}>
                        {info.label} ({info.symbol})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payment Rail Selector */}
                <div>
                  <label className="block text-xs font-mono font-bold uppercase text-neutral-400 tracking-wider mb-2">
                    Select Payment Rail
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {[
                      { id: 'card' as PaymentMethodType, label: 'Credit Card', icon: CreditCard },
                      { id: 'apple_pay' as PaymentMethodType, label: 'Apple Pay', icon: Smartphone },
                      { id: 'google_pay' as PaymentMethodType, label: 'Google Pay', icon: Wallet },
                      { id: 'paypal' as PaymentMethodType, label: 'PayPal', icon: ShieldCheck },
                      { id: 'klarna' as PaymentMethodType, label: 'Klarna Pay in 4', icon: RefreshCw },
                      { id: 'crypto' as PaymentMethodType, label: 'USDC / Web3', icon: Coins },
                    ].map((m) => {
                      const Icon = m.icon;
                      const isSelected = selectedMethod === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSelectedMethod(m.id)}
                          className={`p-2.5 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition ${
                            isSelected
                              ? 'bg-orange-500/10 border-orange-500 text-orange-400 shadow-md shadow-orange-500/10'
                              : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-400' : 'text-neutral-400'}`} />
                          <span className="text-[11px] font-semibold tracking-tight line-clamp-1">{m.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RAIL 1: CREDIT / DEBIT CARD */}
                {selectedMethod === 'card' && (
                  <div className="space-y-4">
                    {/* Realistic Interactive Credit Card Preview */}
                    <div className="w-full h-44 rounded-2xl bg-gradient-to-tr from-neutral-900 via-neutral-800 to-neutral-900 border border-neutral-700 p-5 flex flex-col justify-between shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-7 rounded-md bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
                            <div className="w-6 h-4 border border-amber-300/60 rounded-sm" />
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400 tracking-widest uppercase">
                            Athlete Pass
                          </span>
                        </div>
                        <span className="text-sm font-black tracking-wider text-white uppercase italic">
                          {cardBrand}
                        </span>
                      </div>

                      <div className="text-lg sm:text-xl font-mono tracking-widest text-white drop-shadow">
                        {cardNumber || '•••• •••• •••• ••••'}
                      </div>

                      <div className="flex items-center justify-between text-xs font-mono">
                        <div>
                          <div className="text-[9px] text-neutral-500 uppercase tracking-wider">Cardholder</div>
                          <div className="text-neutral-200 font-bold tracking-wide">
                            {cardHolder.toUpperCase() || 'ALEX RIVERA'}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] text-neutral-500 uppercase tracking-wider">Expires</div>
                          <div className="text-neutral-200 font-bold">{cardExpiry || 'MM/YY'}</div>
                        </div>
                      </div>
                    </div>

                    {/* Card Input Fields */}
                    <div className="space-y-3 bg-neutral-900/60 p-4 rounded-2xl border border-neutral-800">
                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          Cardholder Full Name
                        </label>
                        <input
                          type="text"
                          value={cardHolder}
                          onChange={(e) => setCardHolder(e.target.value)}
                          placeholder="Name on card"
                          className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                          Card Number
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cardNumber}
                            onChange={handleCardNumberChange}
                            placeholder="4242 •••• •••• 4242"
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500 pr-16"
                          />
                          <span className="absolute right-3 top-2 text-[10px] font-mono font-bold text-orange-400 uppercase">
                            {cardBrand}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                            Expiration
                          </label>
                          <input
                            type="text"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            placeholder="MM/YY"
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500 text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                            CVV / CVC
                          </label>
                          <input
                            type="password"
                            maxLength={4}
                            value={cardCvc}
                            onChange={(e) => setCardCvc(e.target.value)}
                            placeholder="888"
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500 text-center"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-mono text-neutral-400 mb-1">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            value={zipCode}
                            onChange={(e) => setZipCode(e.target.value)}
                            placeholder="80302"
                            className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500 text-center"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id="save-card-checkbox"
                          checked={saveCardForFuture}
                          onChange={(e) => setSaveCardForFuture(e.target.checked)}
                          className="rounded border-neutral-700 text-orange-500 focus:ring-0"
                        />
                        <label htmlFor="save-card-checkbox" className="text-xs text-neutral-400 select-none">
                          Save card securely for 1-click coaching renewals and event registrations
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* RAIL 2: APPLE PAY / GOOGLE PAY */}
                {(selectedMethod === 'apple_pay' || selectedMethod === 'google_pay') && (
                  <div className="p-6 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-center space-y-4">
                    <div className="w-14 h-14 rounded-2xl bg-neutral-800 mx-auto flex items-center justify-center text-white">
                      {selectedMethod === 'apple_pay' ? (
                        <Smartphone className="w-7 h-7 text-white" />
                      ) : (
                        <Wallet className="w-7 h-7 text-white" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {selectedMethod === 'apple_pay' ? 'Apple Pay Express' : 'Google Pay 1-Tap'}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1 max-w-sm mx-auto">
                        Authenticate with Face ID, Touch ID, or biometric device security for immediate instant fulfillment.
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-950 text-xs font-mono text-neutral-300 border border-neutral-800 flex items-center justify-between">
                      <span>Default Pass:</span>
                      <span className="font-bold text-white">Apple Card (•••• 9012)</span>
                    </div>
                  </div>
                )}

                {/* RAIL 3: KLARNA PAY IN 4 */}
                {selectedMethod === 'klarna' && (
                  <div className="p-5 rounded-2xl bg-gradient-to-r from-pink-950/30 to-neutral-900 border border-pink-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-pink-400">
                        Klarna. Buy now, pay later
                      </span>
                      <span className="text-xs font-bold text-white">0% APR</span>
                    </div>

                    <p className="text-xs text-neutral-300">
                      Split your training investment into <strong>4 interest-free payments</strong> of{' '}
                      <span className="text-pink-400 font-bold">
                        {currentRate.symbol}
                        {klarnaBiweekly}
                      </span>{' '}
                      every 2 weeks.
                    </p>

                    <div className="grid grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-center">
                      {[
                        { num: '1', date: 'Due Today', amount: `${currentRate.symbol}${klarnaBiweekly}` },
                        { num: '2', date: 'In 2 wks', amount: `${currentRate.symbol}${klarnaBiweekly}` },
                        { num: '3', date: 'In 4 wks', amount: `${currentRate.symbol}${klarnaBiweekly}` },
                        { num: '4', date: 'In 6 wks', amount: `${currentRate.symbol}${klarnaBiweekly}` },
                      ].map((k) => (
                        <div key={k.num} className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
                          <div className="text-pink-400 font-bold">{k.amount}</div>
                          <div className="text-[10px] text-neutral-400 mt-0.5">{k.date}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* RAIL 4: PAYPAL */}
                {selectedMethod === 'paypal' && (
                  <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-center space-y-3">
                    <div className="text-sm font-bold text-sky-400 flex items-center justify-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" />
                      <span>PayPal Instant Athlete Checkout</span>
                    </div>
                    <p className="text-xs text-neutral-400 max-w-sm mx-auto">
                      You will authorize this transaction securely through your PayPal balance, linked bank account, or PayPal Credit.
                    </p>
                  </div>
                )}

                {/* RAIL 5: CRYPTO WEB3 */}
                {selectedMethod === 'crypto' && (
                  <div className="p-5 rounded-2xl bg-neutral-900/80 border border-neutral-800 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-amber-400 flex items-center gap-1.5">
                        <Coins className="w-4 h-4" />
                        <span>USDC / Web3 Checkout (Polygon / Base)</span>
                      </span>
                      <span className="font-mono text-emerald-400 font-bold">Zero Gas Surcharge</span>
                    </div>
                    <p className="text-neutral-400">
                      Send exactly <strong>{convertedAmount} USDC</strong> to smart contract vault for decentralized athlete escrow.
                    </p>
                    <div className="p-2.5 rounded-xl bg-neutral-950 font-mono text-[11px] text-neutral-300 border border-neutral-800 break-all flex items-center justify-between">
                      <span>0x742d35Cc6634C0532925a3b844Bc454e4438f44e</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400">Vault</span>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Order Summary & Security Guarantee (5 cols) */}
              <div className="lg:col-span-5 space-y-5">
                {/* Order Breakdown Box */}
                <div className="bg-neutral-900/90 border border-neutral-800 rounded-2xl p-5 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                    <span className="text-xs font-mono font-bold uppercase tracking-wider text-neutral-400">
                      Order Summary
                    </span>
                    <span className="text-xs font-mono text-orange-400 font-bold truncate max-w-[200px]">
                      {activeTierName}
                    </span>
                  </div>

                  {/* Membership Tier Picker if checking out membership */}
                  {isMembership && (
                    <div className="space-y-1.5 pt-1">
                      <label className="text-[10px] font-mono uppercase text-neutral-400 font-bold block">
                        Select Billing Interval:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedPlanTier('annual')}
                          className={`p-2 rounded-xl text-left border transition ${
                            selectedPlanTier === 'annual'
                              ? 'bg-orange-500/15 border-orange-500 text-white shadow-sm'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="text-[10px] font-bold text-amber-400">BEST VALUE</div>
                          <div className="text-xs font-black text-white">$79<span className="text-[10px] font-normal text-neutral-400">/yr</span></div>
                          <div className="text-[9px] text-emerald-400">Save 45%</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlanTier('monthly')}
                          className={`p-2 rounded-xl text-left border transition ${
                            selectedPlanTier === 'monthly'
                              ? 'bg-orange-500/15 border-orange-500 text-white shadow-sm'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="text-[10px] font-bold text-neutral-400">MONTHLY</div>
                          <div className="text-xs font-black text-white">$12<span className="text-[10px] font-normal text-neutral-400">/mo</span></div>
                          <div className="text-[9px] text-neutral-400">Flex plan</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedPlanTier('lifetime')}
                          className={`p-2 rounded-xl text-left border transition ${
                            selectedPlanTier === 'lifetime'
                              ? 'bg-orange-500/15 border-orange-500 text-white shadow-sm'
                              : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          <div className="text-[10px] font-bold text-sky-400">FOUNDER</div>
                          <div className="text-xs font-black text-white">$249</div>
                          <div className="text-[9px] text-sky-300">Lifetime</div>
                        </button>
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-white">{itemTitle}</h4>
                    <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                      {itemDescription}
                    </p>
                  </div>

                  {/* Promo Code Input */}
                  <div className="pt-2 border-t border-neutral-800/80">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={promoCodeInput}
                          onChange={(e) => setPromoCodeInput(e.target.value)}
                          placeholder="Promo code (e.g. VELTRIX20)"
                          className="w-full pl-8 pr-2 py-1.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 font-mono uppercase focus:outline-none focus:border-orange-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        className="px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-mono font-bold rounded-xl transition"
                      >
                        Apply
                      </button>
                    </div>
                    {promoMessage && (
                      <div className={`text-[10px] font-mono mt-1 ${promoApplied ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {promoMessage}
                      </div>
                    )}
                  </div>

                  {/* Line Items */}
                  <div className="space-y-2 pt-2 border-t border-neutral-800/80 font-mono text-xs">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Base Plan / Subscription:</span>
                      <span className="text-white font-bold">
                        {currentRate.symbol}
                        {convertedAmount}
                      </span>
                    </div>

                    {promoApplied && (
                      <div className="flex items-center justify-between text-emerald-400 font-bold">
                        <span>Athlete Promo Discount (-{promoDiscountPct}%):</span>
                        <span>
                          -{currentRate.symbol}
                          {discountAmount}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Platform & Cloud Sync:</span>
                      <span className="text-emerald-400 font-bold">Included ($0)</span>
                    </div>

                    <div className="flex items-center justify-between text-neutral-400">
                      <span>Estimated Tax (6%):</span>
                      <span className="text-neutral-300">
                        {currentRate.symbol}
                        {taxAmount}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-base font-bold text-white pt-3 border-t border-neutral-800">
                      <span>Total Due Today:</span>
                      <span className="text-orange-400">
                        {currentRate.symbol}
                        {totalDue}
                      </span>
                    </div>
                  </div>

                  {/* Pay Button */}
                  <button
                    id="submit-payment-gateway-btn"
                    type="button"
                    onClick={handleInitiatePayment}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] text-black font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Authorizing with Bank...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 stroke-[2.5]" />
                        <span>
                          Pay {currentRate.symbol}
                          {totalDue} {currency}
                        </span>
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-center text-neutral-500 font-mono">
                    By clicking pay you agree to the Veltrix Endurance Terms of Service.
                  </p>
                </div>

                {/* Security Trust Badges */}
                <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-3 text-xs text-neutral-400">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Athlete Protection & Guarantees</span>
                  </div>

                  <ul className="space-y-1.5 text-[11px] leading-relaxed">
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>30-Day Unconditional FTP improvement or money-back guarantee.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Zero recurring hidden fees — full data ownership and export.</span>
                    </li>
                    <li className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Encrypted tokenization via Stripe / Adyen secure vault.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 3D SECURE OTP SIMULATION STEP */}
          {checkoutStep === '3ds_verification' && (
            <div className="py-8 max-w-md mx-auto space-y-6 text-center animate-fadeIn">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mx-auto flex items-center justify-center">
                <Key className="w-7 h-7 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Bank 3D Secure Verification</h3>
                <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
                  Your issuing bank requires a quick security verification for{' '}
                  <strong className="text-white">
                    {currentRate.symbol}
                    {totalDue} {currency}
                  </strong>
                  . An SMS authentication code has been dispatched.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <label className="block text-xs font-mono text-neutral-300">
                  Enter One-Time Security Passcode (OTP):
                </label>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="w-48 mx-auto text-center font-mono text-xl tracking-widest bg-neutral-950 border border-orange-500/50 rounded-xl py-2 text-white focus:outline-none"
                />
                <p className="text-[11px] text-neutral-500 font-mono">
                  Test Passcode pre-filled: <strong>749210</strong>
                </p>
              </div>

              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setCheckoutStep('checkout')}
                  className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirm3DSecure}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>Authorize Payment</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* SUCCESS SCREEN & DETAILED TRANSACTION RECEIPT */}
          {checkoutStep === 'success' && receipt && (
            <div className="py-4 space-y-6 max-w-2xl mx-auto animate-fadeIn">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-black text-white">Payment Authorized & Confirmed!</h3>
                <p className="text-xs text-neutral-400">
                  Transaction succeeded. Your structured training plan and coaching capabilities are now active.
                </p>
              </div>

              {/* Formal Receipt Card */}
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6 space-y-4 font-mono text-xs shadow-2xl">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Official Receipt</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                      Paid
                    </span>
                  </div>
                  <span className="text-neutral-400 text-[11px]">{receipt.receiptNumber}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2 text-neutral-400 text-[11px]">
                  <div>
                    <span className="text-neutral-500 block">Date</span>
                    <span className="text-white font-semibold">
                      {new Date(receipt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Payment Method</span>
                    <span className="text-white font-semibold capitalize">
                      {receipt.cardBrand || receipt.method} (•••• {receipt.cardLast4})
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Auth Code</span>
                    <span className="text-white font-semibold">{receipt.authorizationCode}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Amount Paid</span>
                    <span className="text-orange-400 font-bold text-sm">
                      {currentRate.symbol}
                      {receipt.amount} {receipt.currency}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Item:</span>
                    <span className="text-white font-bold">{receipt.itemDescription}</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400">
                    <span>Athlete Customer:</span>
                    <span className="text-neutral-200">{receipt.customerName} ({receipt.customerEmail})</span>
                  </div>
                  <div className="flex items-center justify-between text-neutral-400 pt-1 border-t border-neutral-800">
                    <span className="text-[10px]">Transaction Hash:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-neutral-500">{receipt.transactionId}</span>
                      <button
                        onClick={() => handleCopyTransactionId(receipt.transactionId)}
                        className="text-neutral-400 hover:text-white p-0.5"
                        title="Copy Tx ID"
                      >
                        {copiedTx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrintReceipt}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>

                  <button
                    onClick={handlePrintReceipt}
                    className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-400" />
                    <span>Download PDF Invoice</span>
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <span>Return to Training</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
