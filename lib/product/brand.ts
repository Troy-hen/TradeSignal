export const PRODUCT_BRAND = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME || "Opportunity Intelligence",
  shortName: process.env.NEXT_PUBLIC_PRODUCT_SHORT_NAME || "Opportunity Intelligence",
  iconLightSrc: process.env.NEXT_PUBLIC_PRODUCT_ICON_LIGHT || "/brand/mytradebox-icon-light.png",
  iconDarkSrc: process.env.NEXT_PUBLIC_PRODUCT_ICON_DARK || "/brand/mytradebox-icon.png",
} as const;

