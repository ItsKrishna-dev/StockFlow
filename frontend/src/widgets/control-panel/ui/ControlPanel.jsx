import React from 'react';
import { cn } from '../../../shared/lib/classNames';
import styles from './ControlPanel.module.css';

export function ControlPanel({
  parentSection = 'Inventory',
  title = 'Dashboard',
  onNew,
  onUpload,
  searchValue = '',
  onSearchChange,
  placeholder = 'Search...',
  activeView = 'kanban',
  onViewChange,
  availableViews = ['kanban', 'list'],
  pager = null, // e.g. { current: '1-2', total: '2' }
}) {
  return (
    <div className={styles.controlPanel}>
      {/* Left: Breadcrumb & Main Actions */}
      <div className={styles.leftGroup}>
        <div className={styles.breadcrumbs}>
          <span className={styles.breadcrumbParent}>{parentSection}</span>
          <span className={styles.breadcrumbDivider}>/</span>
          <span className={styles.breadcrumbCurrent}>{title}</span>
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnNew} onClick={onNew}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              add
            </span>
            <span>New</span>
          </button>

          {onUpload && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={onUpload}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                upload
              </span>
              <span>Upload</span>
            </button>
          )}
        </div>
      </div>

      {/* Right: Search, Filter Group, Pager, View Switchers */}
      <div className={styles.rightGroup}>
        {/* Search Input */}
        <div className={styles.searchWrapper}>
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '18px', color: 'var(--stockflow-text-secondary)' }}
          >
            search
          </span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />
          <div className={styles.searchActions}>
            <button
              type="button"
              className={styles.searchActionBtn}
              title="Filters"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                filter_alt
              </span>
            </button>
            <button
              type="button"
              className={styles.searchActionBtn}
              title="Group By"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                layers
              </span>
            </button>
            <button
              type="button"
              className={styles.searchActionBtn}
              title="Favorites"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                star
              </span>
            </button>
          </div>
        </div>

        {/* Pager */}
        {pager && (
          <div className={styles.pager}>
            <span>{pager.current}</span>
            <span>/</span>
            <span className={styles.pagerCurrent}>{pager.total}</span>
            <div style={{ display: 'flex', marginLeft: '4px' }}>
              <button
                type="button"
                className={styles.pagerBtn}
                disabled={!pager.hasPrev}
                onClick={pager.onPrev}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  chevron_left
                </span>
              </button>
              <button
                type="button"
                className={styles.pagerBtn}
                disabled={!pager.hasNext}
                onClick={pager.onNext}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        )}

        {/* View Switchers */}
        <div className={styles.viewSwitchers}>
          {availableViews.includes('list') && (
            <button
              type="button"
              className={cn(
                styles.viewBtn,
                activeView === 'list' ? styles.viewBtnActive : ''
              )}
              title="List View"
              onClick={() => onViewChange && onViewChange('list')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                format_list_bulleted
              </span>
            </button>
          )}

          {availableViews.includes('kanban') && (
            <button
              type="button"
              className={cn(
                styles.viewBtn,
                activeView === 'kanban' ? styles.viewBtnActive : ''
              )}
              title="Kanban View"
              onClick={() => onViewChange && onViewChange('kanban')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                view_kanban
              </span>
            </button>
          )}

          {availableViews.includes('pivot') && (
            <button
              type="button"
              className={cn(
                styles.viewBtn,
                activeView === 'pivot' ? styles.viewBtnActive : ''
              )}
              title="Pivot View"
              onClick={() => onViewChange && onViewChange('pivot')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                table_chart
              </span>
            </button>
          )}

          {availableViews.includes('graph') && (
            <button
              type="button"
              className={cn(
                styles.viewBtn,
                activeView === 'graph' ? styles.viewBtnActive : ''
              )}
              title="Graph View"
              onClick={() => onViewChange && onViewChange('graph')}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                bar_chart
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
