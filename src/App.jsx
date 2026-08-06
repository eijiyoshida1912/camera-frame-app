import { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

const FRAMES = [
  { id: "none", name: "なし", src: null },
  { id: "gold", name: "ゴールド", src: "/frames/gold.svg" },
  { id: "hearts", name: "ハート", src: "/frames/hearts.svg" },
  { id: "starry", name: "星空", src: "/frames/starry.svg" },
];

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [selectedFrame, setSelectedFrame] = useState("none");
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [error, setError] = useState(null);
  const [frameImages, setFrameImages] = useState({});
  const [toast, setToast] = useState(false);

  useEffect(() => {
    FRAMES.forEach((frame) => {
      if (!frame.src) return;
      const img = new Image();
      img.src = frame.src;
      img.onload = () => {
        setFrameImages((prev) => ({ ...prev, [frame.id]: img }));
      };
    });
  }, []);

  const startCamera = useCallback(
    async (facing) => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setError(null);
      } catch (err) {
        setError(
          "カメラへのアクセスが許可されていません。設定を確認してください。",
        );
      }
    },
    [stream],
  );

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!capturedImage && videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [capturedImage, stream]);

  const switchCamera = () => {
    const newFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newFacing);
    startCamera(newFacing);
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const size = Math.min(vw, vh);
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);

    const frameImg = frameImages[selectedFrame];
    if (frameImg) {
      ctx.drawImage(frameImg, 0, 0, size, size);
    }

    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
  };

  const downloadPhoto = () => {
    if (!capturedImage) return;
    const link = document.createElement("a");
    link.download = `frame-photo-${Date.now()}.png`;
    link.href = capturedImage;
    link.click();
    setCapturedImage(null);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  };

  const retake = () => {
    setCapturedImage(null);
  };

  const currentFrame = FRAMES.find((f) => f.id === selectedFrame);

  if (error) {
    return (
      <div className="app">
        <div className="error-screen">
          <p>{error}</p>
          <button onClick={() => startCamera(facingMode)}>再試行</button>
        </div>
      </div>
    );
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
            {currentFrame?.src && (
              <img src={currentFrame.src} alt="" className="frame-overlay" />
            )}
          </div>

          <div className="frame-selector">
            {FRAMES.map((frame) => (
              <button
                key={frame.id}
                className={`frame-btn ${selectedFrame === frame.id ? "active" : ""}`}
                onClick={() => setSelectedFrame(frame.id)}
              >
                {frame.name}
              </button>
            ))}
          </div>

          <div className="controls">
            <button className="switch-btn" onClick={switchCamera}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
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
            <button className="action-btn retake-btn" onClick={retake}>
              撮り直す
            </button>
            <button className="action-btn download-btn" onClick={downloadPhoto}>
              保存
            </button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} />
      {toast && <div className="toast">保存しました！</div>}
    </div>
  );
}

export default App;
