export type AppAccessMode = 'closed_testing_free_access' | 'live_paid_access';

export const CURRENT_ACCESS_MODE: AppAccessMode = 'closed_testing_free_access';
export const PAYMENT_REQUIRED_NOW = false;
export const PAYMENT_GATE_ENABLED = false;

export const CLOSED_TESTING_ACCESS_COPY = {
  title: 'Free closed testing access',
  badge: 'Payment off',
  summary: 'All app areas are unlocked for closed testing. No user should be blocked by payment while the product is being tested.',
  warning: 'This is temporary. Live subscriptions, site-only acquaintance access and storage add-ons must be enforced by the backend before public release.',
};

export function getAccessModeLabel(mode: AppAccessMode = CURRENT_ACCESS_MODE) {
  return mode === 'closed_testing_free_access' ? 'Closed testing — free access enabled' : 'Live — paid access required';
}

export function canUseAppWithoutPayment() {
  return CURRENT_ACCESS_MODE === 'closed_testing_free_access' && !PAYMENT_REQUIRED_NOW && !PAYMENT_GATE_ENABLED;
}
