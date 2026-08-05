import { useState, useRef, useEffect, useCallback } from 'react'
import './App.css'

const FRAMES = [
  { id: 'none', name: 'なし', render: () => null },
  {
    id: 'polaroid',
    name: 'ポラロイド',
    render: (ctx, w, h) => {
      const border = Math.min(w, h) * 0.06
      const bottom = Math.min(w, h) * 0.18
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, w, border)
      ctx.fillRect(0, 0, border, h)
      ctx.fillRect(w - border, 0, border, h)
      ctx.fillRect(0, h - bottom, w, bottom)
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 2
      ctx.strokeRect(border / 2, border / 2, w - border, h - bottom + border / 2)
    }
  },
  {
    id: 'vintage',
    name: 'ヴィンテージ',
    render: (ctx, w, h) => {
      const border = Math.min(w, h) * 0.05
      ctx.strokeStyle = '#8B4513'
      ctx.lineWidth = border
      ctx.strokeRect(border / 2, border / 2, w - border, h - border)
      ctx.strokeStyle = '#D2691E'
      ctx.lineWidth = border * 0.4
      ctx.strokeRect(border * 0.8, border * 0.8, w - border * 1.6, h - border * 1.6)
      const corner = border * 2
      ctx.fillStyle = '#8B4513'
      drawCornerOrnament(ctx, 0, 0, corner, 1, 1)
      drawCornerOrnament(ctx, w, 0, corner, -1, 1)
      drawCornerOrnament(ctx, 0, h, corner, 1, -1)
      drawCornerOrnament(ctx, w, h, corner, -1, -1)
    }
  },
  {
    id: 'neon',
    name: 'ネオン',
    render: (ctx, w, h) => {
      const border = Math.min(w, h) * 0.04
      const colors = ['#ff00ff', '#00ffff', '#ff00ff']
      colors.forEach((color, i) => {
        ctx.shadowColor = color
        ctx.shadowBlur = 15
        ctx.strokeStyle = color
        ctx.lineWidth = border * 0.3
        const offset = border * 0.4 * i + border * 0.2
        ctx.strokeRect(offset, offset, w - offset * 2, h - offset * 2)
      })
      ctx.shadowBlur = 0
    }
  },
  {
    id: 'flower',
    name: '花柄',
    render: (ctx, w, h) => {
      const border = Math.min(w, h) * 0.07
      ctx.fillStyle = '#fce4ec'
      ctx.fillRect(0, 0, w, border)
      ctx.fillRect(0, 0, border, h)
      ctx.fillRect(w - border, 0, border, h)
      ctx.fillRect(0, h - border, w, border)
      const flowerSize = border * 0.5
      const spacing = flowerSize * 2
      for (let x = spacing; x < w - spacing; x += spacing) {
        drawFlower(ctx, x, border / 2, flowerSize)
        drawFlower(ctx, x, h - border / 2, flowerSize)
      }
      for (let y = spacing; y < h - spacing; y += spacing) {
        drawFlower(ctx, border / 2, y, flowerSize)
        drawFlower(ctx, w - border / 2, y, flowerSize)
      }
    }
  },
]

function drawCornerOrnament(ctx, x, y, size, dx, dy) {
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + size * dx, y)
  ctx.lineTo(x + size * dx * 0.7, y + size * dy * 0.3)
  ctx.lineTo(x + size * dx * 0.3, y + size * dy * 0.7)
  ctx.lineTo(x, y + size * dy)
  ctx.closePath()
  ctx.fill()
}

function drawFlower(ctx, x, y, size) {
  const petals = 5
  ctx.fillStyle = '#f48fb1'
  for (let i = 0; i < petals; i++) {
    const angle = (i * 2 * Math.PI) / petals
    const px = x + Math.cos(angle) * size * 0.4
    const py = y + Math.sin(angle) * size * 0.4
    ctx.beginPath()
    ctx.arc(px, py, size * 0.25, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = '#ffeb3b'
  ctx.beginPath()
  ctx.arc(x, y, size * 0.15, 0, Math.PI * 2)
  ctx.fill()
}

function App() {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const overlayCanvasRef = useRef(null)
  const [stream, setStream] = useState(null)
  const [selectedFrame, setSelectedFrame] = useState('none')
  const [capturedImage, setCapturedImage] = useState(null)
  const [facingMode, setFacingMode] = useState('environment')
  const [error, setError] = useState(null)

  const startCamera = useCallback(async (facing) => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1920 } },
        audio: false
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setError(null)
    } catch (err) {
      setError('カメラへのアクセスが許可されていません。設定を確認してください。')
    }
  }, [stream])

  useEffect(() => {
    startCamera(facingMode)
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  useEffect(() => {
    if (!capturedImage && videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [capturedImage, stream])

  useEffect(() => {
    if (!videoRef.current || capturedImage) return
    const video = videoRef.current
    const canvas = overlayCanvasRef.current
    if (!canvas) return

    let animId
    const drawOverlay = () => {
      if (video.videoWidth && video.videoHeight) {
        canvas.width = video.clientWidth
        canvas.height = video.clientHeight
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        const frame = FRAMES.find(f => f.id === selectedFrame)
        if (frame && frame.render) {
          frame.render(ctx, canvas.width, canvas.height)
        }
      }
      animId = requestAnimationFrame(drawOverlay)
    }
    drawOverlay()
    return () => cancelAnimationFrame(animId)
  }, [selectedFrame, capturedImage])

  const switchCamera = () => {
    const newFacing = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(newFacing)
    startCamera(newFacing)
  }

  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const frame = FRAMES.find(f => f.id === selectedFrame)
    if (frame && frame.render) {
      frame.render(ctx, canvas.width, canvas.height)
    }

    const dataUrl = canvas.toDataURL('image/png')
    setCapturedImage(dataUrl)
  }

  const downloadPhoto = () => {
    if (!capturedImage) return
    const link = document.createElement('a')
    link.download = `frame-photo-${Date.now()}.png`
    link.href = capturedImage
    link.click()
  }

  const retake = () => {
    setCapturedImage(null)
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-screen">
          <p>{error}</p>
          <button onClick={() => startCamera(facingMode)}>再試行</button>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {!capturedImage ? (
        <>
          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />
            <canvas ref={overlayCanvasRef} className="overlay-canvas" />
          </div>

          <div className="frame-selector">
            {FRAMES.map(frame => (
              <button
                key={frame.id}
                className={`frame-btn ${selectedFrame === frame.id ? 'active' : ''}`}
                onClick={() => setSelectedFrame(frame.id)}
              >
                {frame.name}
              </button>
            ))}
          </div>

          <div className="controls">
            <button className="switch-btn" onClick={switchCamera}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6"/>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
              </svg>
            </button>
            <button className="capture-btn" onClick={capturePhoto}>
              <div className="capture-inner" />
            </button>
            <div className="spacer" />
          </div>
        </>
      ) : (
        <div className="preview-screen">
          <img src={capturedImage} alt="captured" className="preview-image" />
          <div className="preview-controls">
            <button className="action-btn retake-btn" onClick={retake}>撮り直す</button>
            <button className="action-btn download-btn" onClick={downloadPhoto}>保存</button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  )
}

export default App
