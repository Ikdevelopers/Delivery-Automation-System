// Build a human-readable order summary message from priced cart items.
export const buildOrderSummaryMessage = (pricedItems, total) => {
    const lines = pricedItems.map(
        (item) => `- ${item.quantity} x ${item.name} = Rs. ${item.lineTotal}`,
    );

    return `*Order Summary*\n${lines.join("\n")}\n\n*Total: Rs. ${total}*\n\nConfirm this order?`;
};

// Send a text message to a customer via the WhatsApp Cloud API.
export async function sendWhatsAppMessage(phoneNumberId, to, text) {
    const accessToken = process.env.WHATSAPP_TOKEN;
    const apiVersion = process.env.WHATSAPP_API_VERSION || "v23.0";

    if (!accessToken) {
        throw new Error("WHATSAPP_TOKEN is not configured.");
    }

    if (!phoneNumberId || !to || !text) {
        throw new Error("phoneNumberId, recipient phone number, and message text are required.");
    }

    const response = await fetch(
        `https://graph.facebook.com/${apiVersion}/${encodeURIComponent(phoneNumberId)}/messages`,
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to,
                type: "text",
                text: {
                    preview_url: false,
                    body: text,
                },
            }),
        },
    );

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error(`WhatsApp API returned an invalid JSON response (HTTP ${response.status}).`);
    }

    if (!response.ok) {
        const apiMessage = result?.error?.message || "Unknown WhatsApp API error.";
        throw new Error(`WhatsApp API request failed (HTTP ${response.status}): ${apiMessage}`);
    }

    return result;
}