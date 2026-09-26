import { MOCK_KPIS, MOCK_TRANSFERS } from '../model/mockKpis';

export const kpiApi = {
  async getKpis() {
    return MOCK_KPIS;
  },

  async getTransfers() {
    return MOCK_TRANSFERS;
  },
};
