// Repository imports: all database operations stay in the repository layer.
import {
    createMenuItem as createMenuItemInRepository,
    findMenuItemsByVendor,
    findMenuItemById,
    updateMenuItem as updateMenuItemInRepository,
    deleteMenuItem as deleteMenuItemInRepository,
    getMenuItemsByVendorIds
} from "../repositories/menu.repository.js";
import { getVendorsByTenant } from "../repositories/vendor.repository.js";

// Fetch menu items for multiple vendor IDs.
export const getActiveMenuForTenant = async (tenantId) => {
    if (!tenantId) {
        return [];
    }

    const vendors = await getVendorsByTenant(tenantId);
    if (!Array.isArray(vendors) || vendors.length === 0) {
        return [];
    }

    const vendorIds = vendors.map((vendor) => {
        return vendor._id;
    });

    return await getMenuItemsByVendorIds(vendorIds);
};


// Fetch menu items for one vendor.
export const getMenuItemsByVendor = async (vendorId) => {
    if (!vendorId) {
        return [];
    }

    return await findMenuItemsByVendor(vendorId);
};

// Create a menu item through the repository.
export const createMenuItem = async (data, session) => {
    if (!data) {
        throw new Error("Menu item data is required");
    }

    return await createMenuItemInRepository(data, session);
};

// Fetch one menu item by its ID.
export const getMenuItemById = async (menuItemId) => {
    if (!menuItemId) {
        throw new Error("Menu item ID is required");
    }

    return await findMenuItemById(menuItemId);
};

// Update an existing menu item.
export const updateMenuItem = async (menuItemId, data) => {
    if (!menuItemId) {
        throw new Error("Menu item ID is required");
    }

    if (!data) {
        throw new Error("Menu item update data is required");
    }

    return await updateMenuItemInRepository(menuItemId, data);
};

// Delete a menu item by its ID.
export const deleteMenuItem = async (menuItemId) => {
    if (!menuItemId) {
        throw new Error("Menu item ID is required");
    }

    return await deleteMenuItemInRepository(menuItemId);
};