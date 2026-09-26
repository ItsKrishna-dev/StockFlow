import React from 'react';

export default function DeliveryDetailModal({ order, onClose, onValidate, onCancelOrder }) {
  if (!order) return null;

  return (
    <div className="delivery-modal-overlay" onClick={onClose}>
      <div className="delivery-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="delivery-modal-header">
          <div className="delivery-modal-title">
            <span className="material-symbols-outlined" style={{ color: '#714b67', fontSize: '22px' }}>
              local_shipping
            </span>
            <span>{order.reference}</span>
          </div>
          <button type="button" className="delivery-modal-close" onClick={onClose} title="Close">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              close
            </span>
          </button>
        </div>

        <div className="delivery-modal-body">
          {/* Status info strip */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#fbf9f8',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e8e4ec',
            }}
          >
            <div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#756f82', textTransform: 'uppercase' }}>
                Status
              </span>
              <div style={{ marginTop: '4px', fontWeight: 700, color: '#714b67', textTransform: 'capitalize' }}>
                {order.status}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#756f82', textTransform: 'uppercase' }}>
                Scheduled Date
              </span>
              <div style={{ marginTop: '4px', fontWeight: 600, color: '#212529' }}>
                {order.scheduledDate || 'Today'}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#756f82', textTransform: 'uppercase' }}>
                Warehouse
              </span>
              <div style={{ marginTop: '4px', fontWeight: 600, color: '#212529' }}>
                {order.warehouseName || 'Central WH'}
              </div>
            </div>
          </div>

          <div className="delivery-form-grid">
            <div className="delivery-form-group">
              <label className="delivery-form-label">Customer / Client</label>
              <input className="delivery-form-input" value={order.contact} readOnly style={{ backgroundColor: '#f8f9fa' }} />
            </div>
            <div className="delivery-form-group">
              <label className="delivery-form-label">Scheduled Date</label>
              <input className="delivery-form-input" value={order.scheduledDate || 'Today'} readOnly style={{ backgroundColor: '#f8f9fa' }} />
            </div>
            <div className="delivery-form-group">
              <label className="delivery-form-label">Source Sub-Location (From)</label>
              <input className="delivery-form-input" value={order.fromLocation} readOnly style={{ backgroundColor: '#f8f9fa' }} />
            </div>
            <div className="delivery-form-group">
              <label className="delivery-form-label">Destination Location (To)</label>
              <input className="delivery-form-input" value={order.toLocation} readOnly style={{ backgroundColor: '#f8f9fa' }} />
            </div>
          </div>

          {/* Product Items Table */}
          <div className="delivery-form-group" style={{ marginTop: '4px' }}>
            <label className="delivery-form-label">Items to Deliver</label>
            <div style={{ border: '1.5px solid #e8e4ec', borderRadius: '8px', overflow: 'hidden' }}>
              <table className="enterprise-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Demand</th>
                    <th>Reserved</th>
                    <th>Done</th>
                    <th>Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {order.lines && order.lines.length > 0 ? (
                    order.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600, color: '#714b67' }}>{line.productName}</td>
                        <td>{line.demand}</td>
                        <td style={{ color: '#006398' }}>{line.reserved}</td>
                        <td style={{ fontWeight: 600 }}>{line.done || line.demand}</td>
                        <td style={{ color: '#756f82' }}>{line.uom}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', color: '#756f82', padding: '16px' }}>
                        No product lines recorded
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {order.note && (
            <div className="delivery-form-group">
              <label className="delivery-form-label">Shipping Notes & Special Instructions</label>
              <textarea className="delivery-form-textarea" value={order.note} readOnly style={{ backgroundColor: '#f8f9fa' }} />
            </div>
          )}
        </div>

        <div className="delivery-modal-footer">
          <button type="button" className="delivery-btn-secondary" onClick={() => window.print()}>
            Print Slip
          </button>
          {order.status !== 'done' && order.status !== 'cancelled' && order.status !== 'canceled' && (
            <button
              type="button"
              className="delivery-btn-secondary"
              style={{ color: '#dc2626', borderColor: '#fca5a5' }}
              onClick={() => onCancelOrder(order.id)}
            >
              Cancel Order
            </button>
          )}
          {order.status !== 'done' && order.status !== 'cancelled' && order.status !== 'canceled' && (
            <button
              type="button"
              className="delivery-btn-primary"
              onClick={() => onValidate(order.id)}
            >
              Validate & Dispatch
            </button>
          )}
          <button type="button" className="delivery-btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
