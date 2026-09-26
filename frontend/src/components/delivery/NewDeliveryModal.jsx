import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveriesApi } from '../../shared/api/operationsApi';
import { warehousesApi } from '../../shared/api/warehousesApi';
import { productApi } from '../../entities/product';

export default function NewDeliveryModal({ onClose, onSuccess, onError }) {
  const queryClient = useQueryClient();

  const [customerName, setCustomerName] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState('');
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [lines, setLines] = useState([
    {
      product_id: '',
      quantity_expected: 10,
    },
  ]);

  // Queries
  const { data: warehouses = [] } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.listWarehouses(),
  });

  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: () => warehousesApi.listLocations(),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners'],
    queryFn: () => warehousesApi.listPartners(),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => productApi.getProducts(),
  });

  // Default warehouse selection
  const selectedWarehouseId = useMemo(() => {
    if (warehouseId) return warehouseId;
    return warehouses[0]?.id || '';
  }, [warehouseId, warehouses]);

  // Internal Locations & Sublocations for the selected warehouse
  const internalSubLocations = useMemo(() => {
    const internalOnly = locations.filter((l) => l.type === 'internal' || !l.type);
    if (!selectedWarehouseId) return internalOnly;
    const matched = internalOnly.filter((l) => l.warehouse_id === selectedWarehouseId);
    return matched.length > 0 ? matched : internalOnly;
  }, [locations, selectedWarehouseId]);

  // Customer Destination Location
  const customerLocation = useMemo(() => {
    return locations.find((l) => l.type === 'customer') || locations.find((l) => l.code === 'CUST') || locations[0];
  }, [locations]);

  // Product Map
  const productMap = useMemo(() => {
    const map = {};
    products.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [products]);

  // Auto-fill first source location if empty
  const activeSourceLocationId = useMemo(() => {
    if (sourceLocationId && internalSubLocations.some((l) => l.id === sourceLocationId)) {
      return sourceLocationId;
    }
    return internalSubLocations[0]?.id || '';
  }, [sourceLocationId, internalSubLocations]);

  // Handle line changes
  const handleLineChange = (index, field, value) => {
    setLines((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        product_id: products[0]?.id || '',
        quantity_expected: 5,
      },
    ]);
  };

  const handleRemoveLine = (index) => {
    if (lines.length <= 1) {
      if (onError) onError('At least one product line is required');
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      return deliveriesApi.create(payload);
    },
    onSuccess: (newDoc) => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      if (onSuccess) {
        onSuccess(`Delivery Order ${newDoc.document_number || 'created'} registered successfully!`);
      }
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || err.message || 'Failed to create delivery order';
      if (onError) onError(msg);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cleanCustomerName = customerName.trim();
    if (!cleanCustomerName) {
      if (onError) onError('Please enter a customer / client name');
      return;
    }

    if (!selectedWarehouseId) {
      if (onError) onError('Please select a dispatch facility / warehouse');
      return;
    }

    if (!activeSourceLocationId) {
      if (onError) onError('Please select an internal source sub-location');
      return;
    }

    if (!customerLocation?.id) {
      if (onError) onError('Customer destination location not found');
      return;
    }

    if (lines.length === 0 || !lines[0].product_id) {
      if (onError) onError('Please select at least one product for delivery');
      return;
    }

    try {
      // 1. Resolve or Create Partner in DB
      let resolvedPartnerId = null;
      const existingPartner = partners.find(
        (p) => p.name.trim().toLowerCase() === cleanCustomerName.toLowerCase()
      );

      if (existingPartner) {
        resolvedPartnerId = existingPartner.id;
      } else {
        try {
          const newPartner = await warehousesApi.createPartner({
            name: cleanCustomerName,
            type: 'customer',
          });
          resolvedPartnerId = newPartner.id;
        } catch (pErr) {
          console.warn('Could not auto-create partner, proceeding without partner_id:', pErr);
        }
      }

      // 2. Build payload for backend delivery creation
      const payload = {
        internal_location_id: activeSourceLocationId,
        customer_location_id: customerLocation.id,
        warehouse_id: selectedWarehouseId,
        partner_id: resolvedPartnerId,
        notes: note.trim()
          ? `${note.trim()} (Customer: ${cleanCustomerName})`
          : `Customer: ${cleanCustomerName}`,
        lines: lines.map((l) => {
          const prod = productMap[l.product_id];
          return {
            product_id: l.product_id,
            uom_id: prod?.uomId || prod?.uom_id || '149909fe-577b-4f68-aa40-16a9df7c6377',
            quantity_expected: Number(l.quantity_expected) || 1,
          };
        }),
      };

      createMutation.mutate(payload);
    } catch (err) {
      if (onError) onError(err.message || 'Error preparing delivery order');
    }
  };

  return (
    <div className="delivery-modal-overlay" onClick={onClose}>
      <div className="delivery-modal-card" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="delivery-modal-header">
            <div className="delivery-modal-title">
              <span className="material-symbols-outlined" style={{ fontSize: '22px', color: '#714b67' }}>
                local_shipping
              </span>
              <span>New Delivery Order</span>
            </div>
            <button type="button" className="delivery-modal-close" onClick={onClose} title="Close">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                close
              </span>
            </button>
          </div>

          <div className="delivery-modal-body">
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#f4edf3',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#57344f',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
                border: '1px solid #e4d3e1',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#714b67' }}>
                info
              </span>
              <span>
                Delivery Orders dispatch goods from internal warehouse sub-locations to customers.
                Upon validation, inventory is deducted and logged in the stock movements ledger.
              </span>
            </div>

            <div className="delivery-form-grid">
              {/* Customer Text Input */}
              <div className="delivery-form-group" style={{ gridColumn: 'span 2' }}>
                <label className="delivery-form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    Customer / Client Name <span style={{ color: '#ba1a1a' }}>*</span>
                  </span>
                  <span style={{ fontSize: '11.5px', fontWeight: 500, color: '#756f82' }}>
                    Type customer name or client company
                  </span>
                </label>
                <input
                  type="text"
                  className="delivery-form-input"
                  placeholder="e.g. Acme Corp, Horizon Logistics, John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  list="customer-suggestions"
                  required
                  autoFocus
                />
                <datalist id="customer-suggestions">
                  {partners
                    .filter((p) => p.type === 'customer' || p.type === 'both')
                    .map((p) => (
                      <option key={p.id} value={p.name} />
                    ))}
                </datalist>
              </div>

              {/* Warehouse Facility */}
              <div className="delivery-form-group">
                <label className="delivery-form-label">
                  Dispatch Facility / Warehouse <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <select
                  className="delivery-form-select"
                  value={selectedWarehouseId}
                  onChange={(e) => {
                    setWarehouseId(e.target.value);
                    setSourceLocationId('');
                  }}
                  required
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name || w.code} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Source Internal Sub-Location */}
              <div className="delivery-form-group">
                <label className="delivery-form-label">
                  Source Sub-Location (From) <span style={{ color: '#ba1a1a' }}>*</span>
                </label>
                <select
                  className="delivery-form-select"
                  value={activeSourceLocationId}
                  onChange={(e) => setSourceLocationId(e.target.value)}
                  required
                >
                  {internalSubLocations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.complete_name || l.name} ({l.code || 'Internal'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled Date */}
              <div className="delivery-form-group">
                <label className="delivery-form-label">Scheduled Date</label>
                <input
                  type="date"
                  className="delivery-form-input"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              {/* Destination Location */}
              <div className="delivery-form-group">
                <label className="delivery-form-label">Destination</label>
                <input
                  type="text"
                  className="delivery-form-input"
                  value={customerLocation?.name || 'Partner Locations/Customers'}
                  disabled
                  style={{ backgroundColor: '#f8f9fa', color: '#6b7280', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Product Lines Section */}
            <div className="delivery-form-group" style={{ marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label className="delivery-form-label">
                  Items to Deliver / Demand Lines
                </label>
                <button
                  type="button"
                  onClick={handleAddLine}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#714b67',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  + Add Product Line
                </button>
              </div>

              <div className="delivery-line-box">
                {lines.map((line, idx) => {
                  const currentProd = productMap[line.product_id];
                  return (
                    <div key={idx} className="delivery-line-row">
                      <div className="delivery-form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#756f82' }}>Product</label>
                        <select
                          className="delivery-form-select"
                          value={line.product_id}
                          onChange={(e) => handleLineChange(idx, 'product_id', e.target.value)}
                          required
                        >
                          <option value="">— Select Product —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} {p.code ? `(${p.code})` : ''} — On Hand: {p.onHand}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="delivery-form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#756f82' }}>Demand Qty</label>
                        <input
                          type="number"
                          min="1"
                          step="any"
                          className="delivery-form-input"
                          value={line.quantity_expected}
                          onChange={(e) => handleLineChange(idx, 'quantity_expected', e.target.value)}
                          required
                        />
                      </div>

                      <div className="delivery-form-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: '12px', fontWeight: 600, color: '#756f82' }}>UOM</label>
                        <input
                          type="text"
                          className="delivery-form-input"
                          value={currentProd?.uomId || 'Units'}
                          disabled
                          style={{ backgroundColor: '#f8f9fa', color: '#6b7280', cursor: 'not-allowed' }}
                        />
                      </div>

                      {lines.length > 1 && (
                        <button
                          type="button"
                          className="delivery-remove-btn"
                          title="Remove item"
                          onClick={() => handleRemoveLine(idx)}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                            delete
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes / Special Instructions */}
            <div className="delivery-form-group">
              <label className="delivery-form-label">Shipping Notes & Special Instructions</label>
              <textarea
                className="delivery-form-textarea"
                placeholder="Add customer delivery address, special handling instructions, or tracking details..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="delivery-modal-footer">
            <button type="button" className="delivery-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="delivery-btn-primary"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Registering Delivery...' : 'Create Delivery Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
