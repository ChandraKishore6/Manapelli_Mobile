export type HeightOption = {
  value: string;
  label: string;
};

export const HEIGHT_OPTIONS: HeightOption[] = [
  { value: "4'5\"", label: "4'5\" (134 cm)" },
  { value: "4'6\"", label: "4'6\" (137 cm)" },
  { value: "4'7\"", label: "4'7\" (139 cm)" },
  { value: "4'8\"", label: "4'8\" (142 cm)" },
  { value: "4'9\"", label: "4'9\" (144 cm)" },
  { value: "4'10\"", label: "4'10\" (147 cm)" },
  { value: "4'11\"", label: "4'11\" (149 cm)" },
  { value: "5'0\"", label: "5'0\" (152 cm)" },
  { value: "5'1\"", label: "5'1\" (154 cm)" },
  { value: "5'2\"", label: "5'2\" (157 cm)" },
  { value: "5'3\"", label: "5'3\" (160 cm)" },
  { value: "5'4\"", label: "5'4\" (162 cm)" },
  { value: "5'5\"", label: "5'5\" (165 cm)" },
  { value: "5'6\"", label: "5'6\" (167 cm)" },
  { value: "5'7\"", label: "5'7\" (170 cm)" },
  { value: "5'8\"", label: "5'8\" (172 cm)" },
  { value: "5'9\"", label: "5'9\" (175 cm)" },
  { value: "5'10\"", label: "5'10\" (177 cm)" },
  { value: "5'11\"", label: "5'11\" (180 cm)" },
  { value: "6'0\"", label: "6'0\" (182 cm)" },
  { value: "6'1\"", label: "6'1\" (185 cm)" },
  { value: "6'2\"", label: "6'2\" (187 cm)" },
  { value: "6'3\"", label: "6'3\" (190 cm)" },
  { value: "6'4\"", label: "6'4\" (193 cm)" },
  { value: "6'5\"", label: "6'5\" (195 cm)" },
  { value: "6'6\"", label: "6'6\" (198 cm)" },
  { value: "6'7\"+", label: "6'7\"+ (200+ cm)" },
];

export type CurrencyOption = {
  code: string;
  symbol: string;
  label: string;
};

export const POPULAR_CURRENCIES: CurrencyOption[] = [
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "AED", symbol: "AED", label: "AED - UAE Dirham" },
  { code: "SAR", symbol: "SAR", label: "SAR - Saudi Riyal" },
  { code: "QAR", symbol: "QAR", label: "QAR - Qatari Riyal" },
  { code: "OMR", symbol: "OMR", label: "OMR - Omani Rial" },
  { code: "KWD", symbol: "KWD", label: "KWD - Kuwaiti Dinar" },
  { code: "BHD", symbol: "BHD", label: "BHD - Bahraini Dinar" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "CAD", symbol: "C$", label: "CAD (C$) - Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "AUD (A$) - Australian Dollar" },
  { code: "SGD", symbol: "S$", label: "SGD (S$) - Singapore Dollar" },
  { code: "MYR", symbol: "RM", label: "MYR (RM) - Malaysian Ringgit" },
  { code: "NZD", symbol: "NZ$", label: "NZD (NZ$) - New Zealand Dollar" },
];

export function getCurrencySymbol(code?: string | null): string {
  if (!code) return "₹";
  const found = POPULAR_CURRENCIES.find((c) => c.code === code.toUpperCase());
  return found ? found.symbol : code;
}

export function formatSalary(salary?: number | null, currency?: string | null): string {
  if (salary == null || isNaN(salary) || salary <= 0) return 'Not specified';

  const currCode = (currency || "INR").toUpperCase();
  const symbol = getCurrencySymbol(currCode);

  let formattedAmount: string;
  if (currCode === "INR") {
    formattedAmount = Number(salary).toLocaleString("en-IN");
  } else {
    formattedAmount = Number(salary).toLocaleString("en-US");
  }

  return `${symbol} ${formattedAmount} per annum`;
}
