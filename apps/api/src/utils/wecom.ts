/**
 * WeCom (Enterprise WeChat) Notification Utility
 * Sends notifications to WeCom group bot webhook
 */

import axios from 'axios';

const WECOM_GROUP_BOT_WEBHOOK_URL = process.env.WECOM_GROUP_BOT_WEBHOOK_URL;

/**
 * Send text notification to WeCom group
 */
export async function sendWecomText(text: string): Promise<void> {
  if (!WECOM_GROUP_BOT_WEBHOOK_URL) {
    console.log('[WeCom] WECOM_GROUP_BOT_WEBHOOK_URL not set, skipping notification');
    return;
  }

  try {
    await axios.post(WECOM_GROUP_BOT_WEBHOOK_URL, {
      msgtype: 'text',
      text: {
        content: text,
      },
    }, {
      timeout: 5000,
    });
    console.log('[WeCom] Notification sent successfully');
  } catch (error: any) {
    console.error('[WeCom] Failed to send notification:', error.message);
    // Don't throw - notification failures shouldn't break the flow
  }
}

