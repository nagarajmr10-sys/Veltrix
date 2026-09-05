import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  Calendar as CalIcon,
  ShieldCheck,
  CreditCard,
  Lock,
  Sparkles,
  ArrowRight,
  Download,
  Calendar,
  Zap,
  Tag,
  Gift,
  Award,
  Video,
} from 'lucide-react';
import { PurchasablePlan, PurchasedPlanOrder, StructuredWorkout } from '../../types';
import { generateWorkoutsFromPlan } from '../../data/plansData';
import { generateCalendarICS, downloadICSFile } from '../../services/aiTrainingService';

interface PlanCheckoutModalProps {
  plan: PurchasablePlan | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    newOrder: PurchasedPlanOrder,
    scheduledWorkouts: StructuredWorkout[]
  ) => void;
  onNavigateToCalendar: () => void;
}

export const PlanCheckoutModal: React.FC<PlanCheckoutModalProps> = ({
  plan,
  isOpen,
  onClose,
  onSuccess,
  onNavigateToCalendar,
}) => {
  // Tier selection
  const [selectedTier, setSelectedTier] = useState<'digital' | 'consultation' | 'vip'>('digital');

  // Start Date
  const getNextMonday = () => {
    const d = new Date();
    d.setDate(d.getDate() + ((1 + 7 - d.getDay()) % 7 || 7));
    return d.toISOString().split('T')[0];
  };
  const [startDate, setStartDate] = useState<string>(getNextMonday());

  // Promo Code
  const [promoCode, setPromoCode] = useState('');
  const [discountPct, setDiscountPct] = useState(0);
  const [promoMessage, setPromoMessage] = useState<string | null>(null);

  // Payment fields
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExpiry, setCardExpiry] = useState('08/29');
  const [cardCvc, setCardCvc] = useState('888');
  const [cardName, setCardName] = useState('Alex Rivers');

  // Checkout State
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [generatedWorkouts, setGeneratedWorkouts] = useState<StructuredWorkout[]>([]);
  const [createdOrder, setCreatedOrder] = useState<PurchasedPlanOrder | null>(null);

  if (!isOpen || !plan) return null;

  // Price calculations
  let basePrice = plan.price;
  if (selectedTier === 'consultation') {
    basePrice = plan.price + 49;
  } else if (selectedTier === 'vip') {
    basePrice = 149;
  }

  const discountAmount = Math.round(basePrice * (discountPct / 100));
  const finalPrice = Math.max(0, basePrice - discountAmount);

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

  const handleProcessCheckout = () => {
    setIsProcessing(true);

    setTimeout(() => {
      // Generate the calendar workouts
      const scheduled = generateWorkoutsFromPlan(plan, startDate);
      setGeneratedWorkouts(scheduled);

      const order: PurchasedPlanOrder = {
        id: `order-${Date.now()}`,
        planId: plan.id,
        planTitle: plan.title,
        sport: plan.sport,
        pricePaid: finalPrice,
        tier: selectedTier,
        purchaseDate: new Date().toISOString().split('T')[0],
        startDate: startDate,
        status: 'active',
        currentWeek: 1,
        durationWeeks: plan.durationWeeks,
        coachName: plan.coach.name,
        avgWeeklyTSS: plan.avgWeeklyTSS,
      };

      setCreatedOrder(order);
      setIsProcessing(false);
      setIsCompleted(true);

      // Notify parent App
      onSuccess(order, scheduled);
    }, 1200);
  };

  const handleDownloadICS = () => {
    if (generatedWorkouts.length === 0) return;
    // Map to ICS structure
    const icsWorkouts = generatedWorkouts.map((w) => ({
      date: w.date,
      title: w.title,
      sport: w.sport,
      durationMinutes: w.plannedDurationMinutes,
      plannedTSS: w.plannedTSS,
      description: w.description,
    }));
    const icsContent = generateCalendarICS(icsWorkouts, plan.title);
    downloadICSFile(icsContent, `${plan.id}-schedule.ics`);
  };

  const handleResetAndClose = () => {
    setIsCompleted(false);
    setIsProcessing(false);
    onClose();
  };

  return (
    <div
      id="plan-checkout-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn"
      onClick={handleResetAndClose}
    >
      <div
        id="plan-checkout-modal-container"
        className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-neutral-100 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-neutral-950 via-neutral-900 to-neutral-950 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isCompleted ? 'Training Plan Activated!' : 'Secure Plan Checkout'}
              </h2>
              <p className="text-xs text-neutral-400">
                {isCompleted
                  ? 'Your structured workouts are synced with your Veltrix calendar'
                  : 'Instant calendar integration · 30-day money-back guarantee'}
              </p>
            </div>
          </div>

          <button
            id="checkout-close-btn"
            onClick={handleResetAndClose}
            className="p-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {!isCompleted ? (
            <>
              {/* Plan Summary Card */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 flex items-start gap-4">
                <img
                  src={plan.coach.avatar}
                  alt={plan.coach.name}
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-700 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-neutral-800 text-neutral-300">
                      {plan.sport}
                    </span>
                    <span className="text-xs font-mono text-neutral-400">
                      {plan.durationWeeks} Weeks · {plan.avgWeeklyHours} hrs/wk
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white mt-1 truncate">{plan.title}</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">Designed by {plan.coach.name}</p>
                </div>
              </div>

              {/* TIER SELECTION */}
              <div className="space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  Select Training Plan Package
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Tier 1: Digital Only */}
                  <div
                    onClick={() => setSelectedTier('digital')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      selectedTier === 'digital'
                        ? 'bg-orange-950/20 border-orange-500 shadow-md shadow-orange-500/10'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Digital Plan</span>
                        {selectedTier === 'digital' && (
                          <CheckCircle2 className="w-4 h-4 text-orange-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400">Full 12-wk syllabus, daily workouts & sync.</p>
                    </div>
                    <div className="text-lg font-black text-white font-mono mt-3">${plan.price}</div>
                  </div>

                  {/* Tier 2: Plan + Coach Consult */}
                  <div
                    onClick={() => setSelectedTier('consultation')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      selectedTier === 'consultation'
                        ? 'bg-orange-950/20 border-orange-500 shadow-md shadow-orange-500/10'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">+ Coach Consult</span>
                        {selectedTier === 'consultation' && (
                          <CheckCircle2 className="w-4 h-4 text-orange-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400">Digital plan + 45-min 1-on-1 Zoom call.</p>
                    </div>
                    <div className="text-lg font-black text-white font-mono mt-3">
                      ${plan.price + 49}
                      <span className="text-[10px] text-neutral-400 font-normal ml-1">save $30</span>
                    </div>
                  </div>

                  {/* Tier 3: Annual Season Pass */}
                  <div
                    onClick={() => setSelectedTier('vip')}
                    className={`p-3.5 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      selectedTier === 'vip'
                        ? 'bg-orange-950/20 border-orange-500 shadow-md shadow-orange-500/10'
                        : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">Annual VIP Pass</span>
                        {selectedTier === 'vip' && (
                          <CheckCircle2 className="w-4 h-4 text-orange-400" />
                        )}
                      </div>
                      <p className="text-[11px] text-neutral-400">All 8+ plans unlocked for 365 days.</p>
                    </div>
                    <div className="text-lg font-black text-orange-400 font-mono mt-3">$149/yr</div>
                  </div>
                </div>
              </div>

              {/* START DATE SELECTION */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalIcon className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Target Training Start Date
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-400 font-mono">
                    Starts on a Monday for optimal weekly volume
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full sm:w-auto flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setStartDate(getNextMonday())}
                    className="w-full sm:w-auto px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 font-mono transition"
                  >
                    Reset to Next Monday
                  </button>
                </div>
              </div>

              {/* PROMO CODE BOX */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-neutral-400">
                  <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                    <Tag className="w-3.5 h-3.5 text-orange-400" />
                    Promo Code
                  </span>
                  <span className="text-[11px] text-neutral-500">Hint: Try VELTRIX20 for 20% off</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter code (e.g. VELTRIX20)"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-3.5 py-2 text-xs text-white uppercase tracking-wider font-mono focus:outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyPromo}
                    className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition"
                  >
                    Apply
                  </button>
                </div>

                {promoMessage && (
                  <div
                    className={`text-xs font-mono mt-1 ${
                      discountPct > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {promoMessage}
                  </div>
                )}
              </div>

              {/* PAYMENT SIMULATION */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    Payment Details (Mock Simulation)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      Apple Pay
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      Google Pay
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                      Visa/MC
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">Expires</label>
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 mb-1">CVC Security Code</label>
                    <input
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              </div>

              {/* Order Total Breakdown */}
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-neutral-400">
                  <span>Base Package:</span>
                  <span className="text-white">${basePrice}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Athlete Discount ({discountPct}%):</span>
                    <span>-${discountAmount}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-neutral-800">
                  <span>Total Due Today:</span>
                  <span className="text-orange-400">${finalPrice}</span>
                </div>
              </div>
            </>
          ) : (
            /* SUCCESS CONFIRMATION SCREEN */
            <div className="py-6 text-center space-y-6 animate-fadeIn">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-2xl font-black text-white">Purchase Confirmed!</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Congratulations! <strong>{plan.title}</strong> has been successfully attached to your Veltrix athlete profile.
                </p>
              </div>

              {/* Order Details Receipt Box */}
              <div className="p-5 rounded-2xl bg-neutral-950 border border-neutral-800 text-left space-y-3 font-mono text-xs max-w-lg mx-auto">
                <div className="flex justify-between pb-2 border-b border-neutral-800/80">
                  <span className="text-neutral-400">Order Reference:</span>
                  <span className="text-white font-bold">{createdOrder?.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Target Start Date:</span>
                  <span className="text-orange-400 font-bold">{startDate} (Week 1)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Scheduled Workouts:</span>
                  <span className="text-white font-bold">{generatedWorkouts.length} Sessions Loaded</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-400">Head Unit Sync:</span>
                  <span className="text-emerald-400 font-bold">Enabled (Garmin / Wahoo / Zwift)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-neutral-800/80 font-bold">
                  <span className="text-neutral-300">Amount Paid:</span>
                  <span className="text-white">${finalPrice}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto pt-2">
                <button
                  id="view-in-calendar-btn"
                  onClick={() => {
                    handleResetAndClose();
                    onNavigateToCalendar();
                  }}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition"
                >
                  <Calendar className="w-4 h-4" />
                  <span>View in Training Calendar</span>
                </button>

                <button
                  id="download-plan-ics-btn"
                  onClick={handleDownloadICS}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .ICS File</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer (When not completed) */}
        {!isCompleted && (
          <div className="p-4 sm:p-5 bg-neutral-950 border-t border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>30-Day Money-Back Guarantee · Cancel Anytime</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetAndClose}
                className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold uppercase tracking-wider text-neutral-300 transition"
              >
                Cancel
              </button>

              <button
                id="complete-checkout-btn"
                type="button"
                disabled={isProcessing}
                onClick={handleProcessCheckout}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-500/25 transition active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    <span>Authorizing & Syncing...</span>
                  </>
                ) : (
                  <>
                    <span>Pay ${finalPrice} & Activate Plan</span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
