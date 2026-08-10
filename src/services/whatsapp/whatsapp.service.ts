export class WhatsAppService {
  /**
   * Sends a raw text message via Meta's WhatsApp Cloud API
   * @param to Phone number in E.164 format (no + sign)
   * @param body The message content
   */
  static async sendMessage(to: string, body: string) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      throw new Error("Missing WhatsApp API credentials in environment.");
    }

    // WhatsApp Cloud API expects the number without the leading + and ONLY digits
    let cleanTo = to.replace(/[^0-9]/g, "");

    // Automatically convert local Nigerian numbers (091...) to international format (23491...)
    if (cleanTo.startsWith("0") && cleanTo.length === 11) {
      cleanTo = "234" + cleanTo.substring(1);
    }

    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    
    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: cleanTo,
      type: "text",
      text: {
        preview_url: true,
        body: body
      }
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(`WhatsApp API Error: ${JSON.stringify(errData)}`);
    }

    return await res.json();
  }
}
