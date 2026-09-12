export const PRODUCT_BRAND = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME || "TradeSignal",
  shortName: process.env.NEXT_PUBLIC_PRODUCT_SHORT_NAME || "TradeSignal",
  iconLightSrc: process.env.NEXT_PUBLIC_PRODUCT_ICON_LIGHT || "/brand/tradesignal-icon-light.png",
  iconDarkSrc: process.env.NEXT_PUBLIC_PRODUCT_ICON_DARK || "/brand/tradesignal-icon.png",
} as const;
