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
    } else if (window.YT?.Player) {
      resolve(window.YT)
    }
  })
  return ytApiPromise
}

function timeStorageKey(videoId) {
  return `lms_yt_t:${videoId}`
}

function readSavedTime(videoId) {
  try {
    const v = Number(sessionStorage.getItem(timeStorageKey(videoId)))
    return Number.isFinite(v) && v > 0 ? v : 0
  } catch {
    return 0
  }
}

function writeSavedTime(videoId, seconds) {
  try {
    if (!videoId || !(seconds > 2)) return
    sessionStorage.setItem(timeStorageKey(videoId), String(Math.floor(seconds)))
  } catch {
    /* ignore */
  }
}

function clearSavedTime(videoId) {
  try {
    sessionStorage.removeItem(timeStorageKey(videoId))
  } catch {
    /* ignore */
  }
}

/**
 * YouTube player — gọi onEnded khi xem hết video.
 * Giữ vị trí phát trong sessionStorage để quay lại tab không mất tiến độ.
 */
export default function YoutubeLessonPlayer({ videoId, title = 'Video bài học', onEnded }) {
  const reactId = useId()
  const containerId = `yt-player-${reactId.replace(/:/g, '')}`
  const playerRef = useRef(null)
  const endedFiredRef = useRef(false)
  const onEndedRef = useRef(onEnded)
  const saveTimerRef = useRef(null)

  useEffect(() => {
    onEndedRef.current = onEnded
  }, [onEnded])

  useEffect(() => {
    if (!videoId) return undefined
    let destroyed = false
    endedFiredRef.current = false

    const saveProgress = () => {
      const player = playerRef.current
      if (!player?.getCurrentTime) return
      try {
        const t = player.getCurrentTime()
        const dur = player.getDuration?.() || 0
        if (dur > 0 && t >= dur - 1.5) {
          clearSavedTime(videoId)
          return
        }
        writeSavedTime(videoId, t)
      } catch {
        /* ignore */
      }
    }

    const mount = async () => {
      try {
        const YT = await loadYoutubeApi()
        if (destroyed) return

        if (playerRef.current?.destroy) {
          try {
            playerRef.current.destroy()
          } catch {
            /* ignore */
          }
          playerRef.current = null
        }

        const startAt = readSavedTime(videoId)

        playerRef.current = new YT.Player(containerId, {
          videoId,
          width: '100%',
          height: '100%',
          playerVars: {
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            origin: window.location.origin,
            start: startAt > 0 ? Math.floor(startAt) : undefined,
          },
          events: {
            onReady: (event) => {
              if (startAt > 2) {
                try {
                  event.target.seekTo(startAt, true)
                } catch {
                  /* ignore */
                }
              }
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.ENDED && !endedFiredRef.current) {
                endedFiredRef.current = true
                clearSavedTime(videoId)
                onEndedRef.current?.()
                return
              }
              if (
                event.data === YT.PlayerState.PAUSED ||
                event.data === YT.PlayerState.BUFFERING
              ) {
                saveProgress()
              }
            },
          },
        })
      } catch (err) {
        console.warn('YouTube player error', err)
      }
    }

    mount()

    saveTimerRef.current = window.setInterval(saveProgress, 5000)

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') saveProgress()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', saveProgress)

    return () => {
      destroyed = true
      saveProgress()
      if (saveTimerRef.current) window.clearInterval(saveTimerRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', saveProgress)
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
