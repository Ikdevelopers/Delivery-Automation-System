// services/vendorNotification.service.js;
import { getVenodrIds } from "../repositories/vendor.repository.js";
import { notificationQueue } from "../queues/notification.queue.js"

export const notifyVendors = async (subOrders, orderId) => {
  // Step 1 & 2: fetch all vendors in one DB call (done in repository)
    const vendors = await getVenodrIds(subOrders);
    
    // Step 3: build vendorMap for O(1) lookup
    const vendorMap = {};
    vendors.forEach(v => vendorMap[v._id] = v);

    // Step 4: loop over each vendor subOrder
    for(const {vendorId, items} of subOrders ){   
        // Step 4a: get vendor from vendorMap
        const vendor = vendorMap[vendorId];
        
        if (!vendor) continue;// safety guard — vendor not found in DB

    // Step 4b: enqueue notification job for this vendor
     await notificationQueue.add("vendor-notify", {
      phone: vendor.phone,
      shortCode: vendor.shortCode,
      items,
      orderId,
    });       

    }
};