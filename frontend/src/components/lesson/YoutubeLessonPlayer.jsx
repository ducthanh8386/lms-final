import React, { useEffect, useId, useRef } from 'react'

let ytApiPromise = null

function loadYoutubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (ytApiPromise) return ytApiPromise

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev()
      resolve(window.YT)
    }
    if (!document.getElementById('youtube-iframe-api')) {
      const tag = document.createElement('script')
      tag.id = 'youtube-iframe-api'
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }
  })
  return ytApiPromise
}

/**
 * YouTube player — gọi onEnded khi xem hết video.
 */
export default function YoutubeLessonPlayer({ videoId, title = 'Video bài học', onEnded }) {
  const reactId = useId()
  const containerId = `yt-player-${reactId.replace(/:/g, '')}`
  const playerRef = useRef(null)
  const endedFiredRef = useRef(false)
  const onEndedRef = useRef(onEnded)

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    if (!videoId) return undefined
    let destroyed = false
    endedFiredRef.current = false

    const mount = async () => {
      try {
        const YT = await loadYoutubeApi()
        if (destroyed) return

        // Destroy previous instance if any
        if (playerRef.current?.destroy) {
          try {
            playerRef.current.destroy()
          } catch {
            /* ignore */
          }
          playerRef.current = null
        }

        playerRef.current = new YT.Player(containerId, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onStateChange: (event) => {
              // 0 = ENDED
              if (event.data === YT.PlayerState.ENDED && !endedFiredRef.current) {
                endedFiredRef.current = true
                onEndedRef.current?.()
              }
            },
          },
        })
      } catch (err) {
        console.warn('YouTube player error', err)
      }
    }

    mount()

    return () => {
      destroyed = true
      if (playerRef.current?.destroy) {
        try {
          playerRef.current.destroy()
        } catch {
          /* ignore */
        }
        playerRef.current = null
      }
    }
  }, [videoId, containerId])

  return (
    <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg">
      <div id={containerId} className="absolute inset-0 h-full w-full" title={title} />
    </div>
  )
}
