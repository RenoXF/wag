import { normalizeMessageContent, type WAMessage } from "baileys";

export const extractText = (message: Partial<WAMessage>): string | null => {
  const normalizedMessage = normalizeMessageContent(message.message);

  return (
    normalizedMessage?.conversation ||
    normalizedMessage?.extendedTextMessage?.text ||
    normalizedMessage?.imageMessage?.caption ||
    normalizedMessage?.documentMessage?.caption ||
    normalizedMessage?.videoMessage?.caption ||
    null
  );
};
