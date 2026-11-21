import Menu from  "../models/MenuItem.model.js"

export const createMenuItem = async (data, session) => {
    const [menuItem] = await Menu.create([data], { session });
    return menuItem;
};

export const findMenuItemsByVendor = async (vendorId) => {
    return await Menu.find({ vendorId });
};

export const findMenuItemById = async (menuItemId) => {
    // Pass the id value directly; wrapping it in an object would search for _id: { menuItemId }
    return await Menu.findById(menuItemId);
};

export const updateMenuItem = async (menuItemId, data) => {
    return await Menu.findByIdAndUpdate(menuItemId, data, { new: true });
};

export const deleteMenuItem = async (menuItemId) => {
    return await Menu.findByIdAndDelete(menuItemId);
};

export const getMenuItemsByVendorIds = async (vendorIds) => {
    return await Menu.find({
        vendorId: { $in: vendorIds },
        isAvailable: true,
    });
};