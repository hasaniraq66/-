export type SupportDonationMethod = {
  id: 'zain-cash' | 'master-alrafidain';
  label: string;
  subtitle: string;
  account: string;
};

export const supportDonationMethods: readonly SupportDonationMethod[] = [
  {
    id: 'zain-cash',
    label: 'زين كاش',
    subtitle: 'رقم محفظة إلكترونية',
    account: '07812149176',
  },
  {
    id: 'master-alrafidain',
    label: 'ماستر الرافدين',
    subtitle: 'رقم البطاقة المخصص للدعم',
    account: '5543294713',
  },
];

export function isDonationAccountNumber(value: string): boolean {
  return /^\d{10,14}$/.test(value);
}
