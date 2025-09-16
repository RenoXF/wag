export const sendWebhook = (
  data: object,
  webhookUrl?: string | null,
) => {
  if (webhookUrl) {
    return fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch((err) => {
      console.error('Error sending auth webhook:', err);
    });
  }

  return Promise.resolve();
};
