import React from 'react';
import './SkeletonLoader.css';

export function ProductCardSkeleton() {
  return (
    <div className="skeleton-product-card">
      <div className="skeleton-image skeleton-shimmer" />
      <div className="skeleton-content">
        <div className="skeleton-line skeleton-title skeleton-shimmer" />
        <div className="skeleton-line skeleton-subtitle skeleton-shimmer" />
        <div className="skeleton-line skeleton-price skeleton-shimmer" />
      </div>
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div className="skeleton-order-row">
      <div className="skeleton-square skeleton-shimmer" style={{ width: '60px', height: '80px' }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '16px' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '25%', height: '12px' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '20%', height: '14px' }} />
      </div>
      <div className="skeleton-line skeleton-shimmer" style={{ width: '80px', height: '28px', borderRadius: '2px' }} />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="skeleton-detail-grid">
      <div className="skeleton-image skeleton-shimmer" style={{ height: '600px' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '32px' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '22px' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '90%', height: '14px' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '85%', height: '14px' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '70%', height: '14px' }} />
        <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '54px', marginTop: '30px' }} />
      </div>
    </div>
  );
}

export const ProductDetailSkeleton = DetailSkeleton;

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="skeleton-table">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <div className="skeleton-line skeleton-shimmer" style={{ width: '25%', height: '14px' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '20%', height: '14px' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '15%', height: '14px' }} />
          <div className="skeleton-line skeleton-shimmer" style={{ width: '15%', height: '14px' }} />
        </div>
      ))}
    </div>
  );
}
