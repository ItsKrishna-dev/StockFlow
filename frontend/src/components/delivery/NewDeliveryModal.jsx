import React, { useState } from 'react';

export default function NewDeliveryModal({ onClose, onCreateOrder }) {
  const [contact, setContact] = useState('Acme Interior');
  const [fromLocation, setFromLocation] = useState('WH/Stock1');
  const [toLocation, setToLocation] = useState('Partner Locations/Customers');
  const [productName, setProductName] = useState('Steel Rods (STL-001)');
  const [quantity, setQuantity] = useState(25);
  const [uom, setUom] = useState('kg');
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreateOrder({
      contact,
      fromLocation,
      toLocation,
      scheduledDate: new Date().toISOString().split('T')[0],
      status: 'ready',
      lines: [
        {
          productName,
          demand: Number(quantity),
          reserved: Number(quantity),
          done: Number(quantity),
          uom,
        }
      ],
      note,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-header">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">add_shopping_cart</span>
              <h2 className="modal-title">New Delivery Order</h2>
            </div>
            <button type="button" className="tool-icon-btn" onClick={onClose} title="Close">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Customer / Partner</label>
                <select className="form-select" value={contact} onChange={(e) => setContact(e.target.value)}>
                  <option value="Acme Interior">Acme Interior</option>
                  <option value="Customer Alpha">Customer Alpha</option>
                  <option value="Customer Beta">Customer Beta</option>
                  <option value="Delta Heavy Industries">Delta Heavy Industries</option>
                </select>
              </div>

              <div className="form-group">
                <label>Source Location (From)</label>
                <select className="form-select" value={fromLocation} onChange={(e) => setFromLocation(e.target.value)}>
                  <option value="WH/Stock1">WH/Stock1 (Main Warehouse)</option>
                  <option value="WH/Rack-A">WH/Rack-A</option>
                  <option value="WH/Rack-B">WH/Rack-B</option>
                  <option value="WH/Dispatch">WH/Dispatch</option>
                </select>
              </div>

              <div className="form-group">
                <label>Destination Location (To)</label>
                <select className="form-select" value={toLocation} onChange={(e) => setToLocation(e.target.value)}>
                  <option value="Partner Locations/Customers">Partner Locations/Customers</option>
                  <option value="vendor">vendor (Return)</option>
                  <option value="Virtual Locations/Production">Virtual Locations/Production</option>
                </select>
              </div>

              <div className="form-group">
                <label>Product</label>
                <select className="form-select" value={productName} onChange={(e) => setProductName(e.target.value)}>
                  <option value="Steel Rods (STL-001)">Steel Rods (STL-001)</option>
                  <option value="Wooden Panels (WPN-002)">Wooden Panels (WPN-002)</option>
                  <option value="Industrial Paint (PNT-006)">Industrial Paint (PNT-006)</option>
                  <option value="Safety Gloves (GLV-004)">Safety Gloves (GLV-004)</option>
                  <option value="Screws (SCR-003)">Screws (SCR-003)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Demand Quantity</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Unit of Measure</label>
                <select className="form-select" value={uom} onChange={(e) => setUom(e.target.value)}>
                  <option value="kg">kg</option>
                  <option value="pcs">pcs</option>
                  <option value="L">L</option>
                  <option value="pairs">pairs</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Internal Note</label>
              <textarea
                className="form-textarea"
                placeholder="Add special delivery or dispatch instructions..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Delivery Order
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
