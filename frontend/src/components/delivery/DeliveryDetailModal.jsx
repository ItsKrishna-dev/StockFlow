import React from 'react';

export default function DeliveryDetailModal({ order, onClose, onValidate, onCancelOrder }) {
  if (!order) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-error outgoing-arrow">arrow_forward</span>
            <h2 className="modal-title">{order.reference}</h2>
          </div>
          <button className="tool-icon-btn" onClick={onClose} title="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="modal-body">
          {/* Chevron Stage Workflow Bar */}
          <div className="workflow-stage-bar">
            <div className={`stage-step ${order.status === 'draft' ? 'active' : ''}`}>Draft</div>
            <div className={`stage-step ${order.status === 'waiting' ? 'active' : ''}`}>Waiting</div>
            <div className={`stage-step ${order.status === 'ready' ? 'active' : ''}`}>Ready</div>
            <div className={`stage-step ${order.status === 'done' ? 'active' : ''}`}>Done</div>
            {order.status === 'canceled' && (
              <div className="stage-step active" style={{ backgroundColor: 'var(--color-error)' }}>Canceled</div>
            )}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Delivery Address / Contact</label>
              <input className="form-input" value={order.contact} readOnly />
            </div>
            <div className="form-group">
              <label>Scheduled Date</label>
              <input className="form-input" value={order.scheduledDate || 'Today'} readOnly />
            </div>
            <div className="form-group">
              <label>Source Location (From)</label>
              <input className="form-input" value={order.fromLocation} readOnly />
            </div>
            <div className="form-group">
              <label>Destination Location (To)</label>
              <input className="form-input" value={order.toLocation} readOnly />
            </div>
          </div>

          {/* Product Items Table */}
          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-on-surface-variant)', display: 'block', marginBottom: '6px' }}>
              Operations / Product Lines
            </label>
            <div className="table-wrapper">
              <table className="enterprise-table">
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
                        <td style={{ fontWeight: 600, color: 'var(--color-primary-container)' }}>{line.productName}</td>
                        <td>{line.demand}</td>
                        <td style={{ color: 'var(--color-secondary)' }}>{line.reserved}</td>
                        <td style={{ fontWeight: 600 }}>{line.done || line.demand}</td>
                        <td style={{ color: 'var(--color-outline)' }}>{line.uom}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td style={{ fontWeight: 600, color: 'var(--color-primary-container)' }}>Steel Rods (STL-001)</td>
                      <td>15</td>
                      <td style={{ color: 'var(--color-secondary)' }}>15</td>
                      <td style={{ fontWeight: 600 }}>15</td>
                      <td style={{ color: 'var(--color-outline)' }}>kg</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {order.note && (
            <div className="form-group">
              <label>Note / Tracking</label>
              <textarea className="form-textarea" value={order.note} readOnly />
            </div>
          )}
        </div>

        <div className="modal-footer">
          {order.status === 'ready' && (
            <button className="btn-validate" onClick={() => onValidate(order.id)}>
              Validate Transfer
            </button>
          )}
          {order.status !== 'done' && order.status !== 'canceled' && (
            <button className="btn-secondary" style={{ color: 'var(--color-error)' }} onClick={() => onCancelOrder(order.id)}>
              Cancel Order
            </button>
          )}
          <button className="btn-secondary" onClick={() => window.print()}>
            Print Slip
          </button>
          <button className="btn-primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
