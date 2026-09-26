/**
 * entities/copilot/api/copilotApi.js
 *
 * API client for the AI Inventory Copilot endpoint (/api/v1/copilot/ask).
 */
import { apiClient } from '../../../shared/lib/apiClient';

export const copilotApi = {
  /**
   * Send a question to the AI Inventory Copilot.
   * @param {string} question - Natural language inventory question.
   * @returns {Promise<{ intent: string, data: any, answer: string }>}
   */
  async ask(question) {
    return apiClient.post('/copilot/ask', { question });
  },
};
