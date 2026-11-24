import { createOrder } from "../repositories/order.repository.js";

// Convert the active menu into a lookup table for fast price and vendor access.
export function buildMenuMap(activeMenu) {
  const menuMap = {};

  // Guard against null/undefined menu responses before iterating.
  if (!Array.isArray(activeMenu)) return menuMap;

  activeMenu.forEach((item) => {
    menuMap[item.name] = { vendorId: item.vendorId, price: item.price };
  });

  return menuMap;
}

function groupItemsByVendor(geminiItems, menuMap) {
  const vendorGroups = {}; // key: vendorId (string), value: array of items

  geminiItems.forEach((item) => {
    if (!item.isAvailable) return; // skip unavailable items

    const menuData = menuMap[item.name];
    if (!menuData) {
      throw new Error(`Available item "${item.name}" was not found in the active menu.`);
    }

    const vendorId = menuData.vendorId.toString();

    if (!vendorGroups[vendorId]) {
      vendorGroups[vendorId] = [];
    }

    vendorGroups[vendorId].push({
      itemName: item.name,
      quantity: item.quantity,
      priceAtOrderTime: menuData.price,
    });
  });

  return Object.entries(vendorGroups).map(([vendorId, items]) => ({
    vendorId,
    items,
  }));
}

export const createOrderFromIntent = async (intent, tenant, customerId, activeMenu) => {
  if (intent.status !== "confirm_order") {
    throw new Error(`Cannot create an order for intent status "${intent.status}".`);
  }

  const menuMap = buildMenuMap(activeMenu);
  const subOrders = groupItemsByVendor(intent.items, menuMap);

  if (subOrders.length === 0) {
    throw new Error("Cannot create an order without available menu items.");
  }

  return await createOrder({
    tenantId: tenant._id,
    customerId,
    subOrders,
  });
};


// Calculate line totals and the cart total from the live active menu.
export const calculateCartTotal = (cartItems, menuMap) => {
  if (!Array.isArray(cartItems)) {
    return { items: [], total: 0 };
  }

  const availableItems = cartItems.filter((item) => item.isAvailable);

  const pricedItems = availableItems.map((item) => {
    const menuData = menuMap[item.name];
    if (!menuData) {
      throw new Error(`Cart item "${item.name}" was not found in the active menu.`);
    }

    const lineTotal = menuData.price * item.quantity;
    return {
      name: item.name,
      quantity: item.quantity,
      price: menuData.price,
      lineTotal,
    };
  });
  const total = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);

  return { items: pricedItems, total };
};
