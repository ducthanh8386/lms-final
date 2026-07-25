import React from 'react'

/** Spinner nhỏ trong main — không che layout */
const PageFallback = () => (
  <div className="flex min-h-[50vh] items-center justify-center px-4 py-12">
    <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
  </div>
)

export default PageFallback
