export const PRODUCT_BRAND = {
  name: process.env.NEXT_PUBLIC_PRODUCT_NAME || "Everro",
  shortName: process.env.NEXT_PUBLIC_PRODUCT_SHORT_NAME || "Everro",
  iconLightSrc: process.env.NEXT_PUBLIC_PRODUCT_ICON_LIGHT || "/brand/everro-icon-light.svg",
  iconDarkSrc: process.env.NEXT_PUBLIC_PRODUCT_ICON_DARK || "/brand/everro-icon-dark.svg",
} as const;
