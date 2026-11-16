import webhookQueue from "../queues/webhook.queue.js";

export const handleWebhook = async (req, res) => {
    const { entry, value } = req.webhookData ?? {};
    const incoming = value?.messages?.[0];
    const statusUpdate = value?.statuses?.[0];

    const payload = {
        wamid: incoming?.id ?? statusUpdate?.id,
        type: incoming? "message" : statusUpdate? "status" : "unknown",
        from: incoming?.from ?? statusUpdate?.recipient_id ?? null,
        text: incoming?.text?.body ?? null,
        status: statusUpdate?.status ?? null,
        timestamp: incoming?.timestamp ?? statusUpdate?.timestamp ?? Date.now(),
        phoneNumberId: value?.metadata?.phone_number_id ?? null,
        phoneNumber: value?.metadata?.display_phone_number ?? null,
        businessAccountId: entry?.id ?? null,
    }

    await webhookQueue.add("process-webhook", payload);

    return res.status(200).json({ok: true})
};

/* --The object passed to webhookQueue.add() is basically:
{
  wamid: "wamid_HK123456",
  type: "message",
  from: "15551234567",
  text: "Hello",
  status: null,
  timestamp: 1730000000
}
*/

/*
Or for a status event:
{
  wamid: "wamid_HK123456",
  type: "status",
  from: null,
  text: null,
  status: "sent",
  timestamp: 1730000001
}
And line by line, in the controller:
*/