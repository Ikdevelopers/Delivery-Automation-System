import Order from "../models/Order.model.js";

// Create an order. `data` is the order document.
// NOTE: not using a transaction/session right now since this is a single
// write. If a future flow needs this write to be atomic with another
// write (e.g. order create + vendor stock update together), reintroduce
// a `session` param here and wrap the call in a transaction in the
// service layer (session.startTransaction() / commitTransaction()).
export const createOrder = async (data) => {
    return await Order.create(data);
};

// Look up one order by its MongoDB ID. Returns null if it doesn't exist.
export const findOrderById = async (orderId) => {
    return await Order.findById(orderId);
};

// Get a customer's orders for a specific tenant.
// Including both IDs keeps the query scoped to that tenant.
export const findOrdersByCustomer = async (tenantId, customerId) => {
    return await Order.find({ tenantId, customerId });
};

// Change the overall order status. Returns the updated order, or null if
// no order matches. `runValidators` checks the status against the schema enum.
export const updateOrderStatus = async (orderId, orderStatus) => {
    return await Order.findByIdAndUpdate(
        orderId,
        { orderStatus },
        { new: true, runValidators: true },
    );
};

// Change the status of one sub-order inside an order.
// `subOrderId` identifies the embedded sub-order; `$` updates that match.
export const updateSubOrderStatus = async (orderId, subOrderId, status) => {
    return await Order.findOneAndUpdate(
        { _id: orderId, "subOrders._id": subOrderId },
        { $set: { "subOrders.$.status": status } },
        { new: true, runValidators: true },
    );
};

// Get all orders for a tenant, newest first.
export const findOrdersByTenant = async (tenantId) => {
    return await Order.find({ tenantId }).sort({ createdAt: -1 });
};

// Get a tenant's orders with the requested overall status, newest first.
export const findOrdersByTenantAndStatus = async (tenantId, orderStatus) => {
    return await Order.find({ tenantId, orderStatus }).sort({ createdAt: -1 });
};

// Save the final bill amount, the user who issued it, and the billing time.
// The filter allows this only if the order hasn't been billed yet.
// Returns null if the order doesn't exist or was already billed.
export const setOrderBillingDetails = async (orderId, billedAmount, billedBy) => {
    return await Order.findOneAndUpdate(
        { _id: orderId, billedAt: null },
        {
            $set: {
                billedAmount,
                billedBy,
                billedAt: new Date(),
            },
        },
        { new: true, runValidators: true },
    );
};