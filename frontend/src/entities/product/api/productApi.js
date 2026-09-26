import { INITIAL_PRODUCTS } from '../model/mockProducts';

let productsCache = [...INITIAL_PRODUCTS];

export const productApi = {
  async getProducts() {
    return [...productsCache];
  },

  async addProduct(newProduct) {
    const item = {
      id: String(Date.now()),
      name: newProduct.name || 'New Product',
      code: newProduct.code || `[PROD_${Math.floor(1000 + Math.random() * 9000)}] Custom Item`,
      icon: newProduct.icon || 'inventory_2',
      unitCost: Number(newProduct.unitCost) || 0,
      onHand: Number(newProduct.onHand) || 1,
      freeToUse: Number(newProduct.freeToUse) || 1,
      status: newProduct.status || 'Available',
    };
    productsCache = [...productsCache, item];
    return item;
  },

  async updateProduct(id, updates) {
    productsCache = productsCache.map((p) => (p.id === id ? { ...p, ...updates } : p));
    return productsCache.find((p) => p.id === id);
  },

  async deleteProduct(id) {
    productsCache = productsCache.filter((p) => p.id !== id);
    return true;
  },
};
