import { toInputDate, daysUntil, isOverdue } from './dateFormat';

export function getDebtProgress(d) {
  // Returns normalized status for both simple debts and installments
  
  if (!d.installmentPlan) {
    return {
      isInstallment: false,
      amountDueNow: Math.max(0, d.totalAmount - d.paidAmount),
      nextDueDate: d.dueDate || null,
      isOverdue: d.dueDate ? isOverdue(d.dueDate) && d.status === 'active' : false,
      completedPaymentsText: null,
      remainingAmount: Math.max(0, d.totalAmount - d.paidAmount)
    };
  }

  const { amount, frequency, startDate, totalPayments } = d.installmentPlan;
  const start = new Date(startDate);
  
  // Calculate completed payments precisely by absolute amount
  const completedFully = Math.min(Math.floor(d.paidAmount / amount), totalPayments);
  
  // Calculate Date of the Next expected payment
  const nextPaymentIndex = Math.min(completedFully, totalPayments - 1);
  const nextDueDate = new Date(start);
  if (frequency === 'monthly') {
    nextDueDate.setMonth(nextDueDate.getMonth() + nextPaymentIndex);
  } else if (frequency === 'weekly') {
    nextDueDate.setDate(nextDueDate.getDate() + (nextPaymentIndex * 7));
  }
  const nextDueStr = toInputDate(nextDueDate);

  // Calculate how many installments passed
  const today = new Date(toInputDate(new Date()));
  let passed = 0;
  for (let i = 0; i < totalPayments; i++) {
    const dDate = new Date(start);
    if (frequency === 'monthly') dDate.setMonth(dDate.getMonth() + i);
    if (frequency === 'weekly') dDate.setDate(dDate.getDate() + (i * 7));
    if (dDate <= today) passed++;
  }

  const expectedPaid = Math.min(passed * amount, d.totalAmount);
  let missedOverdue = expectedPaid - d.paidAmount;
  if (missedOverdue < 0) missedOverdue = 0; // paid ahead

  // The actual amount due *for this specific next payment date*
  // It's the standard installment amount minus any partial payment towards it.
  const partialTowardsNext = d.paidAmount % amount;
  const standardDueNext = amount - partialTowardsNext;
  
  // Combine missed + next
  // If next is today or past, `missedOverdue` ALREADY includes it in `expectedPaid`.
  // If next is in the future, due now is just `missedOverdue`, but we still want to show what's UPCOMING.
  
  let amountDueNow = missedOverdue;
  let upcomingAmount = standardDueNext;

  if (nextDueStr <= toInputDate(new Date())) {
     // The next due date is in the past or today, meaning it's already factored into `missedOverdue`.
     // So the "upcoming" or "next due" amount we show to user is actually the entire missed Overdue amount.
     upcomingAmount = missedOverdue;
  } else {
     // User is not overdue for the *next* block, but they might be overdue for previous?
     // Actually, if `nextDueStr > today`, by definition they are paid up to today! So missedOverdue === 0.
     // In this case, amountDueNow is 0, upcomingAmount is standardDueNext.
  }

  // Edge case: don't overcharge
  upcomingAmount = Math.min(upcomingAmount, d.totalAmount - d.paidAmount);
  amountDueNow = Math.min(amountDueNow, d.totalAmount - d.paidAmount);

  return {
    isInstallment: true,
    amountDueNow: amountDueNow, // Overdue immediately 
    nextUpcomingAmount: upcomingAmount, // What to show as "Next due: $X"
    nextDueDate: nextDueStr,
    isOverdue: amountDueNow > 0 && nextDueStr < toInputDate(new Date()),
    completedPaymentsText: `${Math.min(completedFully + (partialTowardsNext > 0 ? 1 : 0), totalPayments)} / ${totalPayments}`,
    remainingAmount: Math.max(0, d.totalAmount - d.paidAmount)
  };
}
