import React from 'react';

/** Component hiển thị trong lúc data đang load thay cho màn hình trắng */
export function SkeletonCard() {
  return (
    <div className="card bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-fade-up">
      <div className="skeleton skeleton-img w-full mb-4" />
      <div className="skeleton skeleton-title mb-3" />
      <div className="skeleton skeleton-text w-[85%]" />
      <div className="skeleton skeleton-text w-[65%]" />
      <div className="flex gap-2 mt-4 pt-2 border-t border-slate-100">
        <div className="skeleton skeleton-btn flex-1" />
        <div className="skeleton skeleton-btn w-20" />
      </div>
    </div>
  );
}

/** Grid skeleton cho danh sách */
export function SkeletonList({ count = 5 }) {
  return (
    <div className="space-y-3 animate-fade-up">
      {Array.from({ length: count }, (_, i) => (
        <div 
          key={i} 
          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200"
        >
          <div className="skeleton w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="skeleton skeleton-text w-[45%]" />
            <div className="skeleton skeleton-text w-[75%]" />
          </div>
          <div className="skeleton skeleton-btn w-20 h-8" />
        </div>
      ))}
    </div>
  );
}
