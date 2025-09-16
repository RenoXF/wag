export const sendWebhook = async   (
  data: object,
  webhookUrl?: string | null,
) => {
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(30_000) // 30 seconds timeout
    }).catch((err) => {
      console.error('Error sending auth webhook:', err);
    });
  }

  return Promise.resolve();
};
