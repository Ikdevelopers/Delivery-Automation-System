import { checkbaseCode } from "../repositories/vendor.repository.js";

export const generateBaseCode = (vendorName) => {
  const parts = vendorName.trim().split(" ");

  if (parts.length<= 1) {
    // single word case
    return (parts[0].slice(0, 2)).toUpperCase();
  } else {
    // multiple words case
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
};

export const generateShortCode = async (vendorName) => {
    const baseCode = generateBaseCode(vendorName);
     const existing = await checkbaseCode(baseCode);
    const usedCodes = new Set(
        existing.map((vendor) => String(vendor.shortCode).toUpperCase())
    );

    if(existing.length === 0){
        return baseCode;
    }

    if (!usedCodes.has(baseCode)) {
        return baseCode;
    }

    let suffix = 1;
    while (usedCodes.has(`${baseCode}${suffix}`)) {
        suffix += 1;
    }

    return `${baseCode}${suffix}`;
};