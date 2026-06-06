"use client";

import { useParams, useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useEffect, useRef, useState, useCallback } from "react";
import { socket, SOCKET_URL } from "@/lib/socket";
import VideoPlayer from "@/components/VideoPlayer";

type ReactionItem = { id: number; type: "emoji" | "gif"; content: string };

const QUICK_EMOJIS = [
  // Gülen / Mutlu
  "😀", "😂", "🤣", "😊", "😍", "🥰", "😘", "😎", "🤩", "🥳",
  // Tepkiler
  "😮", "😱", "😳", "🤯", "😤", "😡", "🤬", "😢", "😭", "🥹",
  // Komik
  "😜", "🤪", "😏", "🙄", "😒", "🥱", "😴", "🤤", "🤧", "🤢",
  // El hareketleri
  "👍", "👎", "👌", "🤌", "🤞", "✌️", "👏", "🙌", "🤝", "🫶",
  // Kalpler
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "💔", "💕", "💗",
  // Kutlama
  "🎉", "🎊", "🎈", "🎂", "🏆", "🥇", "✨", "🔥", "💥", "⭐",
  // Film / Eğlence
  "🍿", "🎬", "🎭", "🎮", "🎧", "📺", "🎵", "🎤", "🕹️", "🎯",
  // Hayvanlar
  "🐱", "🐶", "🐸", "🦊", "🐼", "🐨", "🦁", "🐯", "🐻", "🦋",
  // Yiyecek
  "🍕", "🍔", "🌮", "🍜", "🍣", "🍦", "🧁", "🍩", "🧋", "🥤",
  // Misc eğlenceli
  "💀", "👻", "👽", "🤖", "🎃", "🌈", "💫", "🌙", "☀️", "💎",
];

const getGifUrl = (id: string) => `https://media.giphy.com/media/${id}/giphy.gif`;

const GIFS = [
  // 😂 Komik / Kahkaha
  { label: "😂 Kahkaha", id: "T3Vx6sVAXzuG4" },
  { label: "🤣 Yerde Gülüyor", id: "Hx51DYLn161MenC18F" },
  { label: "💀 Ölüyorum", id: "vUbjGDJrLX6qCvTNhE" },
  { label: "😹 Kedi Güler", id: "D3umcr3d38kLfCpfAL" },
  { label: "😜 Deli Gibi", id: "FC0cXc70bGttd9lajy" },
  { label: "🤦 Facepalm", id: "6yRVg0HWzgS88" },
  { label: "🐸 Kermit Şok", id: "EeHAD3z9pS43myC5Fk" },
  { label: "🤦 Ne yapayım", id: "JRhS6WoswF8FxE0g2R" },
  { label: "🌽 Minion Gülüşü", id: "l3HBbltOYjoNq" },
  { label: "🧽 SpongeBob Gülüşü", id: "zLBIu5sOUMydi" },
  { label: "👶 Bebek Kahkahası", id: "A97DsLbVCEBBS" },
  { label: "🐶 Köpek Sırıtması", id: "sWBzg2D15WwQjHcxbt" },
  { label: "😈 Kötü Kahkaha", id: "xl5QdxfNonh3q" },
  { label: "😏 Alaycı Gülüş", id: "7YrnYstmGxYFa" },
  { label: "🥸 Jim Carrey", id: "LNGjIcfGNrTI7ZUeNg" },

  // 🎉 Kutlama / Mutlu
  { label: "🎉 Tebrik", id: "jJQC2puVZpTMO4vUs0" },
  { label: "🥳 Parti", id: "oaGEZtx2Zs1OPSoHQi" },
  { label: "👏 Alkış", id: "qnOBmH70CGSVa" },
  { label: "🎊 Konfeti", id: "epbQ7l3UQor7y" },
  { label: "🏆 Kazandım", id: "1BfPP1taCof3s61x71" },
  { label: "💃 Dans", id: "1oCzRaTnZj4mJCELQ6" },
  { label: "🕺 Dans Pistinde", id: "nBMJJpA4DfX0trqAfc" },
  { label: "✅ Başardım", id: "XBlwFU4OJ0cgZVbNUl" },
  { label: "🕴️ Carlton", id: "3s24RhPWgbRYlySJ3k" },
  { label: "🌽 Minions Mutlu", id: "KyTeViWZEuzUoia9Rq" },
  { label: "🧽 SpongeBob Mutlu", id: "aosOPhpJHrJq8" },
  { label: "🐱 Kedi Dansı", id: "VSLIjK1WyV3GbT5m9G" },
  { label: "🧒 Çocuk Kutlama", id: "114i7iKbd9Mkak" },
  { label: "🤩 Harika", id: "90F8aUepslB84" },
  { label: "🎆 Havai Fişek", id: "13n4Hd98ewKJsQ" },

  // 😮 Şok / Sürpriz
  { label: "😮 Şok", id: "Gl7mfimOjkkGl5mMDS" },
  { label: "🤯 Kafa Patladı", id: "5aLrlDiJPMPFS" },
  { label: "😱 İnanamıyorum", id: "LJPfWhMCs9Rks" },
  { label: "🐶 Hayret", id: "oZHLtSqQeW8JrpyRIr" },
  { label: "🤯 Akıl Uçması", id: "2jmma5yWrWUF6uaBkw" },
  { label: "⚡ Şok Pikachu", id: "6nWhy3ulBL7GSCvKw6" },
  { label: "🦖 Pratt Şok", id: "mWCtOYKrk7rb0Z4EeO" },
  { label: "🙅 Steve HAYIR", id: "hyyV7pnbE0FqLNBAzs" },
  { label: "😳 Şaşıran Çocuk", id: "jwjQ3H9XUtRDLSNLIY" },
  { label: "👀 Göz Yuvarlama", id: "dEdmW17JnZhiU" },

  // 😍 Aşk / Sevgi
  { label: "😍 Aşk", id: "YxKXWOhTSq8I14NKEn" },
  { label: "💕 Kalpler", id: "26ufcYAkp8e66vanu" },
  { label: "🥰 Sevgi Dolu", id: "OHRF8LZis06OiPDJby" },
  { label: "😘 Öpücük", id: "8YBM61XW2vZJykO0j4" },
  { label: "🐱 Kedi Sevgisi", id: "VJloBpDk34yxB39V15" },
  { label: "🧽 Kalp Kutu", id: "Em4eDeu5Rcyf6" },
  { label: "🫶 Kalp Elleri", id: "oj7riquJFVinXdmER5" },
  { label: "🐼 Panda Aşk", id: "4MAKo5i5bORISNmPkL" },
  { label: "🤗 Sarılma", id: "ABjJcFelbuanC" },
  { label: "💓 Kalp Atışı", id: "l3q2JIwxP6vQK8uf6" },

  // 😢 Ağlama / Üzgün
  { label: "😢 Ağlıyorum", id: "qQdL532ZANbjy" },
  { label: "😭 Çok Üzgün", id: "XZxMu2iWn10WfU1Cpm" },
  { label: "🥺 Çizmeli Kedi", id: "zZbf6UpZslp3nvFjIR" },
  { label: "💅 Kim Kardashian", id: "W7RVlWfc1O9gY" },
  { label: "☔ Yağmur Altında", id: "fOQs20FLdvINW" },
  { label: "👶 Ağlayan Bebek", id: "jnQYWZ0T4mkhCmkzcn" },
  { label: "🐕 Üzgün Köpek", id: "fqst7AVqF6AVLlYklE" },
  { label: "😿 Üzgün Kedi", id: "lGBecpB2dIMwt6ohfI" },
  { label: "🤦 Oh Hayır", id: "14aUO0Mf7dWDXW" },
  { label: "😔 Hayal Kırıklığı", id: "Ph8OWoJA2M3eM" },

  // 🍿 Film / Eğlence
  { label: "🍿 Popcorn", id: "dZylOH8HYZ6KOed8N6" },
  { label: "🎬 Sinema", id: "kdnqjPZtISY1Mi6Rze" },
  { label: "🎵 Dans Et", id: "blSTtZehjAZ8I" },
  { label: "🍌 Muz Dansı", id: "IB9foBA4PVkKA" },
  { label: "🌈 Nyan Cat", id: "BSx6mzbW1ew7K" },
  { label: "🎮 Oyun Modu", id: "Zh03CNl9ghWpcYDHOm" },
  { label: "🌳 Homer Çalılar", id: "jUwpNzg9IcyrK" },
  { label: "🍿 Popcorn Yiyen", id: "iDJuQR0UmiqOI" },
  { label: "🕶️ Jackson Popcorn", id: "pUeXcg80cO8I8" },
  { label: "🎧 DJ Kedi", id: "H1pT4XEyqA9XtbJvnj" },

  // 👍 Onay / Reddetme
  { label: "👍 Harika", id: "xHMIDAy1qkzNS" },
  { label: "🙅 Hayır", id: "zt7PB3Zxf5RbtsiZPA" },
  { label: "🎤 Mic Drop", id: "NLNZ2CPw78YSc" },
  { label: "🚀 Uçuyoruz", id: "8FBCOSYErFjmDoaxeG" },
  { label: "👋 Selam", id: "qGvmdlfJ0FtBSwxqA3" },
  { label: "🐕 Baş Sallıyor", id: "CX2pn94zLXZLrXf5kx" },
  { label: "🔥 Alev", id: "WqU7RqJh4R7z5q8UBj" },
  { label: "👻 Hayalet Dans", id: "toYHMPMkP6O5OQZsLW" },
  { label: "💯 Mükemmel", id: "P5An0NiVLcVpvhhiGh" },
  { label: "👍 Onay", id: "emzm1YLeS9QHDusJnN" },
  { label: "🙆 Evet", id: "GuDU8r5CnUoYtbS2CR" },
  { label: "🙅 Yok Artık", id: "xXqpuURrhGEyZr1BGj" },
  { label: "👌 Tamamdır", id: "JQ9gksa9siKViguS0S" },
  { label: "👏 Obama Alkış", id: "mPIA4KZVXv0ty" },

  // 😠 Kızgın / Sinirli
  { label: "😠 Kızgın", id: "eKS2TiHojIeHcDhSUQ" },
  { label: "😡 Çok Kızgın", id: "QW1nG7xLMJHsk" },
  { label: "┬─┬ ノ( ゜-゜ノ)", id: "yBGiswlJ2z1dl1A3l9" },
  { label: "😿 Sinirli Kedi", id: "A0lTlnxCyVogONSvum" },
  { label: "👶 Çıldıran Bebek", id: "d1ytb3wOL6PiF1iSan" },
  { label: "🦆 Donald Duck", id: "UghQkKPk9LMNa" },
  { label: "💻 Pc Kırma", id: "AILHrGyr3eQkHgzXHF" },
  { label: "🤯 Saç Yolma", id: "3o7TKRwpns23QMNNiE" },
  { label: "🙄 Göz Devirme", id: "gnJgBlPgHtcnS" },
  { label: "🐕 Sinirli Köpek", id: "11NDk1NnldC9vq" },

  // 🕺 Dans / Müzik
  { label: "🕺 Michael Jackson", id: "fxpPSvdGnxfR6" },
  { label: "💃 Shakira Dansı", id: "xTiTngGSQaTuxyngLm" },
  { label: "🎸 Rock Gitar", id: "SlvLxEag2zgxW" },
  { label: "🎧 Müzik Keyfi", id: "gbmWwWm4sGMQvAYm1G" },
  { label: "🎤 Şarkı Söyleyen", id: "143qWPF33HtSTK" },
  { label: "🥳 Parti Zamanı", id: "tlawNnswcTAmGjKRHQ" },
  { label: "🕶️ Cool Dansçı", id: "3oEdv9R4D62GPrVY4g" }
];



export default function Room() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const {
    stream,
    remoteStream,
    toggleMute,
    toggleVideo,
    shareScreen,
    shareBrowserTab,
    isMuted,
    isVideoOff,
    isRemoteMuted,
    isRemoteVideoOff,
    isScreenSharing,
    isTabSharing,
    peerConnected,
    screenShareError,
  } = useWebRTC(roomId);

  // Redirect if room is full
  useEffect(() => {
    const handleRoomFull = () => {
      alert("Bu oda dolu! Şu an 2 kişi mevcut. Yeni bir oda oluştur.");
      router.push("/");
    };
    socket.on("room-full", handleRoomFull);
    return () => { socket.off("room-full", handleRoomFull); };
  }, [router]);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Hyperbeam SDK container and instance state
  const hyperbeamContainerRef = useRef<HTMLDivElement>(null);
  const [hyperbeamInstance, setHyperbeamInstance] = useState<any>(null);

  // Separate draggable coordinates for local and remote webcams (initially left side out of search area)
  const [localPos, setLocalPos] = useState({ x: 24, y: 100 });
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [dragOffsetLocal, setDragOffsetLocal] = useState({ x: 0, y: 0 });

  const [remotePos, setRemotePos] = useState({ x: 24, y: 235 });
  const [isDraggingRemote, setIsDraggingRemote] = useState(false);
  const [dragOffsetRemote, setDragOffsetRemote] = useState({ x: 0, y: 0 });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [videoFit, setVideoFit] = useState<"contain" | "cover" | "stretch">("contain");
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [reactionTab, setReactionTab] = useState<"emoji" | "gif">("emoji");
  const [activeReactions, setActiveReactions] = useState<ReactionItem[]>([]);
  const reactionIdCounter = useRef(0);
  
  // Synchronized Real-Time Co-Browsing States
  const [browserUrl, setBrowserUrl] = useState("https://www.google.com/webhp?igu=1");
  const [inputUrl, setInputUrl] = useState("https://www.google.com/webhp?igu=1");
  const [historyStack, setHistoryStack] = useState<string[]>(["https://www.google.com/webhp?igu=1"]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Premium Cloud Virtual Browser (Hyperbeam) States
  const [hyperbeamActive, setHyperbeamActive] = useState(false);
  const [hyperbeamEmbedUrl, setHyperbeamEmbedUrl] = useState<string | null>(null);
  const [showHyperbeamKeyModal, setShowHyperbeamKeyModal] = useState(false);
  const [hyperbeamApiKey, setHyperbeamApiKey] = useState("");

  // Camera layout and UI states
  const [webcamLayout, setWebcamLayout] = useState<"floating" | "split">("floating");
  const [hideCameras, setHideCameras] = useState(false);
  const [hideControls, setHideControls] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const isMobile = typeof navigator !== "undefined" && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  // Toast helper
  const showToast = useCallback((msg: string, ms = 3000) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), ms);
  }, []);

  // Listen for remote peer mute/camera state via socket (only for UI toasts, state is managed by useWebRTC)
  useEffect(() => {
    const handlePeerMuted = ({ enabled }: { enabled: boolean }) => {
      const muted = !enabled;
      showToast(muted ? "🎤 Arkadaşınız mikrofonu kapattı" : "🎤 Arkadaşınız mikrofonu açtı");
    };
    const handlePeerVideo = ({ enabled }: { enabled: boolean }) => {
      showToast(!enabled ? "📷 Arkadaşınız kamerayı kapattı" : "📷 Arkadaşınız kamerayı açtı");
    };
    socket.on("mic-state", handlePeerMuted);
    socket.on("camera-state", handlePeerVideo);
    return () => {
      socket.off("mic-state", handlePeerMuted);
      socket.off("camera-state", handlePeerVideo);
    };
  }, [showToast]);

  // Button style constants
  const btnBase = "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl transition-all duration-200 active:scale-90";
  const btnGhost = `${btnBase} bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20`;

  // Callback refs for split vs floating video elements
  const setLocalVideoRef = useCallback((el: HTMLVideoElement | null) => {
    localVideoRef.current = el;
    if (el && stream) {
      el.srcObject = stream;
      el.play().catch(() => {});
    }
  }, [stream]);

  const setRemoteVideoRef = useCallback((el: HTMLVideoElement | null) => {
    remoteVideoRef.current = el;
    if (el && remoteStream) {
      el.srcObject = remoteStream;
      el.play().catch(() => {});
    }
  }, [remoteStream]);

  // Sync address bar input whenever actual URL changes
  useEffect(() => {
    // Hide the igu=1 parameter in the address bar for a cleaner look
    setInputUrl(browserUrl === "https://www.google.com/webhp?igu=1" ? "https://www.google.com/" : browserUrl);
  }, [browserUrl]);

  // Synchronized Navigation function
  const navigateBrowser = useCallback((target: string, emit = true) => {
    let url = target.trim();
    if (!url) return;

    if (!/^https?:\/\//i.test(url)) {
      if (url.includes(".") && !url.includes(" ")) {
        url = "https://" + url;
      } else {
        url = `https://www.google.com/search?q=${encodeURIComponent(url)}&igu=1`;
      }
    }

    setBrowserUrl(url);

    // Update history stack
    const newStack = historyStack.slice(0, historyIndex + 1);
    newStack.push(url);
    setHistoryStack(newStack);
    setHistoryIndex(newStack.length - 1);

    if (emit) {
      socket.emit("browser-navigate", { roomId, url });
    }
  }, [roomId, historyStack, historyIndex]);

  // Synchronized History Back
  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      const prevUrl = historyStack[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setBrowserUrl(prevUrl);
      socket.emit("browser-navigate", { roomId, url: prevUrl });
    }
  }, [roomId, historyStack, historyIndex]);

  // Synchronized History Forward
  const handleForward = useCallback(() => {
    if (historyIndex < historyStack.length - 1) {
      const nextUrl = historyStack[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setBrowserUrl(nextUrl);
      socket.emit("browser-navigate", { roomId, url: nextUrl });
    }
  }, [roomId, historyStack, historyIndex]);

  // Local drag handlers
  const handlePointerDownLocal = (e: React.PointerEvent) => {
    setIsDraggingLocal(true);
    setDragOffsetLocal({ x: e.clientX - localPos.x, y: e.clientY - localPos.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMoveLocal = (e: React.PointerEvent) => {
    if (isDraggingLocal) setLocalPos({ x: e.clientX - dragOffsetLocal.x, y: e.clientY - dragOffsetLocal.y });
  };
  const handlePointerUpLocal = (e: React.PointerEvent) => {
    setIsDraggingLocal(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Remote drag handlers
  const handlePointerDownRemote = (e: React.PointerEvent) => {
    setIsDraggingRemote(true);
    setDragOffsetRemote({ x: e.clientX - remotePos.x, y: e.clientY - remotePos.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMoveRemote = (e: React.PointerEvent) => {
    if (isDraggingRemote) setRemotePos({ x: e.clientX - dragOffsetRemote.x, y: e.clientY - dragOffsetRemote.y });
  };
  const handlePointerUpRemote = (e: React.PointerEvent) => {
    setIsDraggingRemote(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // Bind video streams directly to floating webcam refs
  useEffect(() => {
    if (localVideoRef.current && stream) {
      localVideoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  // Resume local and remote video playback when camera state returns to enabled (prevents freezing in WebViews)
  useEffect(() => {
    if (!isVideoOff && localVideoRef.current) {
      localVideoRef.current.play().catch(() => {});
    }
  }, [isVideoOff]);

  useEffect(() => {
    if (!isRemoteVideoOff && remoteVideoRef.current) {
      remoteVideoRef.current.play().catch(() => {});
    }
  }, [isRemoteVideoOff]);

  // Helper to extract the pure original URL from absolute proxy URLs and preserve all appended query parameters
  const cleanProxyUrl = useCallback((url: string): string => {
    try {
      const urlObj = new URL(url);
      const proxiedUrl = urlObj.searchParams.get("url");
      if (proxiedUrl) {
        const pureUrlObj = new URL(proxiedUrl);
        // Append all extra parameters (like form submissions) that were attached to the proxy url
        urlObj.searchParams.forEach((value, key) => {
          if (key !== "url") {
            pureUrlObj.searchParams.set(key, value);
          }
        });
        return pureUrlObj.href;
      }
    } catch (e) {}
    return url;
  }, []);

  // Listen to postMessages from inside the proxy iframe (scroll, click, form submit, video play/pause)
  useEffect(() => {
    const handleIframeMessage = (e: MessageEvent) => {
      if (!e.data || typeof e.data !== "object") return;

      if (e.data.type === "iframe-navigate") {
        const targetUrl = cleanProxyUrl(e.data.url);
        console.log("[In-App Browser] Intercepted navigation:", targetUrl);
        setBrowserUrl(targetUrl);

        const newStack = historyStack.slice(0, historyIndex + 1);
        newStack.push(targetUrl);
        setHistoryStack(newStack);
        setHistoryIndex(newStack.length - 1);

        socket.emit("browser-navigate", { roomId, url: targetUrl });
      }

      if (e.data.type === "iframe-scroll") {
        const { scrollX, scrollY } = e.data;
        socket.emit("browser-scroll", { roomId, scrollX, scrollY });
      }

      if (e.data.type === "iframe-video") {
        const { action, time } = e.data;
        socket.emit("browser-video", { roomId, action, time });
      }
    };

    window.addEventListener("message", handleIframeMessage);
    return () => {
      window.removeEventListener("message", handleIframeMessage);
    };
  }, [roomId, historyStack, historyIndex, cleanProxyUrl]);

  // Listen to remote Socket co-browsing events
  useEffect(() => {
    const handleRemoteNavigate = ({ url }: { url: string }) => {
      console.log("[Socket] Remote navigated browser to:", url);
      setBrowserUrl(url);

      const newStack = historyStack.slice(0, historyIndex + 1);
      newStack.push(url);
      setHistoryStack(newStack);
      setHistoryIndex(newStack.length - 1);
    };

    const handleRemoteScroll = ({ scrollX, scrollY }: { scrollX: number; scrollY: number }) => {
      const iframe = document.getElementById("browser-iframe") as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "sync-scroll", scrollX, scrollY }, "*");
      }
    };

    const handleRemoteVideo = ({ action, time }: { action: string; time: number }) => {
      const iframe = document.getElementById("browser-iframe") as HTMLIFrameElement;
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({ type: "sync-video", action, time }, "*");
      }
    };

    socket.on("browser-navigate", handleRemoteNavigate);
    socket.on("browser-scroll", handleRemoteScroll);
    socket.on("browser-video", handleRemoteVideo);

    return () => {
      socket.off("browser-navigate", handleRemoteNavigate);
      socket.off("browser-scroll", handleRemoteScroll);
      socket.off("browser-video", handleRemoteVideo);
    };
  }, [historyStack, historyIndex]);

  // Premium Cloud Browser: Initial Check & Socket Sync
  useEffect(() => {
    // If we already have a saved key in localStorage, pre-fill it
    const savedKey = localStorage.getItem("hyperbeam_api_key");
    if (savedKey) setHyperbeamApiKey(savedKey);

    // Initial check for an active room session
    const checkActiveSession = async () => {
      try {
        const res = await fetch(`${SOCKET_URL}/api/hyperbeam-session`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.embedUrl) {
            setHyperbeamEmbedUrl(data.embedUrl);
            setHyperbeamActive(true);
          }
        }
      } catch (e) {}
    };
    checkActiveSession();

    // Socket listeners for Hyperbeam state changes
    const handleHyperbeamState = ({ active, embedUrl }: { active: boolean; embedUrl?: string }) => {
      setHyperbeamActive(active);
      setHyperbeamEmbedUrl(embedUrl || null);
    };

    socket.on("hyperbeam-state", handleHyperbeamState);
    return () => {
      socket.off("hyperbeam-state", handleHyperbeamState);
    };
  }, [roomId]);

  // Dynamically initialize Hyperbeam SDK on mount / state change
  useEffect(() => {
    if (!hyperbeamActive || !hyperbeamEmbedUrl || !hyperbeamContainerRef.current) {
      if (hyperbeamInstance) {
        try { hyperbeamInstance.destroy(); } catch {}
        setHyperbeamInstance(null);
      }
      return;
    }

    let active = true;
    let hb: any = null;

    const initHyperbeam = async () => {
      try {
        const HyperbeamSDK = (await import("@hyperbeam/web")).default;
        if (!active) return;

        // Clear container first
        if (hyperbeamContainerRef.current) {
          hyperbeamContainerRef.current.innerHTML = "";
        }

        hb = await HyperbeamSDK(hyperbeamContainerRef.current!, hyperbeamEmbedUrl, {
          delegateKeyboard: true, // forward keyboard input
        });

        if (active) {
          setHyperbeamInstance(hb);
        }
      } catch (err) {
        console.error("[Hyperbeam SDK] Init failed:", err);
      }
    };

    initHyperbeam();

    return () => {
      active = false;
      if (hb) {
        try { hb.destroy(); } catch {}
      }
    };
  }, [hyperbeamActive, hyperbeamEmbedUrl]);

  // Handler to start or stop Hyperbeam
  const handleHyperbeamClick = useCallback(async () => {
    if (hyperbeamActive) {
      if (confirm("Sanal bulut bilgisayarını sonlandırmak istiyor musunuz?")) {
        const savedKey = localStorage.getItem("hyperbeam_api_key");
        if (savedKey) {
          try {
            await fetch(`${SOCKET_URL}/api/hyperbeam-session`, {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "x-hyperbeam-key": savedKey
              },
              body: JSON.stringify({ roomId })
            });
          } catch (e) {
            console.error("Failed to delete hyperbeam session on backend:", e);
          }
        }
        setHyperbeamActive(false);
        setHyperbeamEmbedUrl(null);
        socket.emit("hyperbeam-state", { roomId, active: false });
      }
      return;
    }

    const savedKey = localStorage.getItem("hyperbeam_api_key");
    if (savedKey) {
      startHyperbeamSession(savedKey);
    } else {
      setShowHyperbeamKeyModal(true);
    }
  }, [hyperbeamActive, roomId]);

  const startHyperbeamSession = async (key: string) => {
    try {
      const res = await fetch(`${SOCKET_URL}/api/hyperbeam-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-hyperbeam-key": key
        },
        body: JSON.stringify({ roomId })
      });

      if (!res.ok) {
        throw new Error(await res.text());
      }

      const data = await res.json();
      setHyperbeamEmbedUrl(data.embedUrl);
      setHyperbeamActive(true);
      socket.emit("hyperbeam-state", { roomId, active: true, embedUrl: data.embedUrl });
      localStorage.setItem("hyperbeam_api_key", key);
      setShowHyperbeamKeyModal(false);
    } catch (e: any) {
      alert("Sanal bilgisayar başlatılamadı: " + e.message);
    }
  };

  const showReaction = useCallback((type: "emoji" | "gif", content: string) => {
    const id = reactionIdCounter.current++;
    setActiveReactions(prev => [...prev, { id, type, content }]);
    setTimeout(() => setActiveReactions(prev => prev.filter(r => r.id !== id)), 3500);
  }, []);

  const sendReaction = useCallback((type: "emoji" | "gif", content: string) => {
    socket.emit("reaction", { roomId, type, content });
    showReaction(type, content);
    setShowReactionPanel(false);
  }, [roomId, showReaction]);

  useEffect(() => {
    const handler = ({ type, content }: { type: "emoji" | "gif"; content: string }) => showReaction(type, content);
    socket.on("reaction", handler);
    return () => { socket.off("reaction", handler); };
  }, [showReaction]);

  useEffect(() => {
    const fn = () => {
      const doc = document as any;
      setIsFullscreen(!!(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", fn);
    document.addEventListener("webkitfullscreenchange", fn);
    return () => {
      document.removeEventListener("fullscreenchange", fn);
      document.removeEventListener("webkitfullscreenchange", fn);
    };
  }, []);

  const toggleFullscreen = async () => {
    // Standard Fullscreen API with Webkit/Safari fallbacks for non-iOS / generic fallback
    const docEl = document.documentElement as any;
    const doc = document as any;

    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } else {
      if (doc.exitFullscreen) {
        await doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      }
    }
  };

  const handleFullscreenClick = (e: React.MouseEvent) => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      // Direct, synchronous iOS webkitEnterFullscreen trigger inside light and shadow DOMs
      const container = document.getElementById("hyperbeam-container-el");
      
      const findVideoSync = (el: HTMLElement | null): HTMLVideoElement | null => {
        if (!el) return null;
        if (el.tagName === "VIDEO") return el as HTMLVideoElement;
        if (el.shadowRoot) {
          const found = findVideoSync(el.shadowRoot as any);
          if (found) return found;
        }
        for (let i = 0; i < el.childNodes.length; i++) {
          const child = el.childNodes[i];
          if (child.nodeType === Node.ELEMENT_NODE) {
            const found = findVideoSync(child as HTMLElement);
            if (found) return found;
          }
        }
        return null;
      };

      // 1. Try Bulut PC video (in Shadow DOM)
      if (hyperbeamActive && container) {
        const video = findVideoSync(container);
        if (video && (video as any).webkitEnterFullscreen) {
          try {
            (video as any).webkitEnterFullscreen();
            return;
          } catch (err) {
            console.error("[Sync iOS Fullscreen] Hyperbeam failed:", err);
          }
        }
      }

      // 2. Try Webrtc remote stream video
      if (remoteVideoRef.current && (remoteVideoRef.current as any).webkitEnterFullscreen) {
        try {
          (remoteVideoRef.current as any).webkitEnterFullscreen();
          return;
        } catch (err) {
          console.error("[Sync iOS Fullscreen] Remote video failed:", err);
        }
      }
    }
    // Fallback: standard fullscreen for non-iOS or if webkitEnterFullscreen failed
    toggleFullscreen();
  };

  return (
    <div className={`w-screen h-[100dvh] bg-[#0f0f11] relative overflow-hidden flex font-sans text-white ${
      webcamLayout === "split" && !hideCameras ? "flex-col md:flex-row" : "items-center justify-center"
    }`}>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popInFadeOut {
          0%   { transform: translate(-50%,-50%) scale(0.1); opacity:0; }
          15%  { transform: translate(-50%,-50%) scale(1.2); opacity:1; }
          30%  { transform: translate(-50%,-50%) scale(1);   opacity:1; }
          80%  { transform: translate(-50%,-50%) scale(1);   opacity:1; }
          100% { transform: translate(-50%,-60%) scale(0.85); opacity:0; }
        }
        .reaction-pop { animation: popInFadeOut 3.5s forwards; position:absolute; left:50%; top:50%; }

        /* iPhone notch & safe-area-inset cover */
        @viewport { viewport-fit: cover; }

        /* Dynamic screen crop and fit system for Bulut PC (Hyperbeam) & iframe */
        #hyperbeam-container-el video,
        #hyperbeam-container-el iframe,
        #browser-iframe {
          object-fit: ${videoFit === "cover" ? "cover" : videoFit === "stretch" ? "fill" : "contain"} !important;
          transform: ${videoFit === "cover" ? "scale(1.18)" : "scale(1)"} !important;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), object-fit 0.3s ease !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}} />

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[100] bg-zinc-900/90 text-white px-5 py-3 rounded-full text-xs font-semibold border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-2 animate-bounce">
          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
          {toastMessage}
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className={`relative flex flex-col bg-[#0a0a0c] transition-all duration-500 h-full ${
        webcamLayout === "split" && !hideCameras
          ? "w-full h-[50vh] md:w-1/2 md:h-full border-b md:border-b-0 md:border-r border-white/5"
          : "absolute inset-0 w-full h-full z-0"
      }`}>
        
        {/* Sleek Browser Navigation Top Bar / Hyperbeam Minimalism */}
        {!hideControls && (
          hyperbeamActive ? (
            <div className="w-full bg-[#121215]/90 border-b border-white/5 px-4 py-2.5 flex items-center justify-between shadow-xl z-20 backdrop-blur-md mt-14 md:mt-0">
              <div className="flex items-center gap-3">
                <span className="flex h-3.5 w-3.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                </span>
                <span className="text-xs md:text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-rose-500 select-none">
                  ☁️ Bulut PC Aktif
                </span>
              </div>

              {/* Robust Mobile/PC Keyboard Input helper */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className="bg-black/50 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-pink-500 w-32 sm:w-48 md:w-64"
                  placeholder="⌨️ Mobil Klavye ile Yaz..."
                  onInput={(e: any) => {
                    const val = e.target.value;
                    if (val.length > 0) {
                      const char = val.substring(val.length - 1);
                      if (hyperbeamInstance) {
                        hyperbeamInstance.sendEvent({ type: "keydown", key: char });
                        hyperbeamInstance.sendEvent({ type: "keyup", key: char });
                      }
                      e.target.value = ""; // Keep cleared so they can type next char
                    }
                  }}
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter") {
                      if (hyperbeamInstance) {
                        hyperbeamInstance.sendEvent({ type: "keydown", key: "Enter" });
                        hyperbeamInstance.sendEvent({ type: "keyup", key: "Enter" });
                      }
                    } else if (e.key === "Backspace") {
                      if (hyperbeamInstance) {
                        hyperbeamInstance.sendEvent({ type: "keydown", key: "Backspace" });
                        hyperbeamInstance.sendEvent({ type: "keyup", key: "Backspace" });
                      }
                    }
                  }}
                />

                <button
                  onClick={handleHyperbeamClick}
                  className="text-xs text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 border border-rose-500/30 px-3 py-2 rounded-xl transition-all font-semibold"
                >
                  Bulut Kapat
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full bg-[#121215]/90 border-b border-white/5 px-4 py-2.5 flex items-center gap-3 shadow-xl z-20 backdrop-blur-md mt-14 md:mt-0">
              {/* Mac-like decorative colored circles */}
              <div className="flex gap-1.5 pr-1.5 hidden md:flex">
                <span className="w-3 h-3 rounded-full bg-red-500/80" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <span className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>

              {/* Navigation Control Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleBack}
                  disabled={historyIndex === 0}
                  className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white/80 transition-all font-bold text-sm"
                  title="Geri"
                >
                  ←
                </button>
                <button
                  onClick={handleForward}
                  disabled={historyIndex === historyStack.length - 1}
                  className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white/80 transition-all font-bold text-sm"
                  title="İleri"
                >
                  →
                </button>
                <button
                  onClick={() => {
                    const iframe = document.getElementById("browser-iframe") as HTMLIFrameElement;
                    if (iframe) iframe.src = iframe.src;
                  }}
                  className="p-2 rounded-xl hover:bg-white/10 text-white/80 transition-all text-sm"
                  title="Yenile"
                >
                  ↻
                </button>
              </div>

              {/* Elegant Address bar input */}
              <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-2.5 text-xs text-white/40 shadow-inner">
                <span className="text-indigo-400 text-xs font-semibold select-none flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  Paylaşımlı Ekran
                </span>
                <span className="text-white/10 select-none">|</span>
                <input
                  value={inputUrl}
                  onChange={e => setInputUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && navigateBrowser(inputUrl)}
                  className="flex-1 bg-transparent text-white/90 outline-none placeholder:text-white/30 text-xs md:text-sm font-medium"
                  placeholder="Film aratın veya direkt film/makale linki yapıştırın..."
                />
              </div>

              <button
                onClick={() => navigateBrowser("https://www.google.com/webhp?igu=1")}
                className="text-xs text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/30 px-3 py-2 rounded-xl transition-all font-semibold"
              >
                Ana Sayfa
              </button>
            </div>
          )
        )}

        <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0c0c0e]">
          {hyperbeamActive && hyperbeamEmbedUrl ? (
            <div
              id="hyperbeam-container-el"
              ref={hyperbeamContainerRef}
              className="w-full h-full bg-black relative"
            />
          ) : (
            <iframe
              id="browser-iframe"
              src={
                browserUrl.includes("google.com") 
                  ? browserUrl 
                  : `${SOCKET_URL}/api/proxy?url=${encodeURIComponent(browserUrl)}`
              }
              className="w-full h-full border-none"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
              allow="autoplay; encrypted-media; fullscreen; microphone; camera; display-capture;"
              allowFullScreen={true}
            />
          )}
        </div>

        {/* REACTION PANEL */}
        {showReactionPanel && (
          <div className="absolute bottom-24 md:bottom-28 left-1/2 -translate-x-1/2 z-40 bg-zinc-900/95 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden w-[94vw] sm:w-[420px]">
            <div className="flex border-b border-white/10">
              {(["emoji", "gif"] as const).map(tab => (
                <button key={tab} onClick={() => setReactionTab(tab)}
                  className={`flex-1 py-3 text-sm font-semibold uppercase tracking-wide transition-colors ${reactionTab === tab ? "text-indigo-400 border-b-2 border-indigo-400" : "text-white/40 hover:text-white/70"}`}>
                  {tab === "emoji" ? "😀 Emoji" : "🎬 GIF"}
                </button>
              ))}
              <button onClick={() => setShowReactionPanel(false)} className="px-4 text-white/40 hover:text-white/80 text-xl leading-none pb-0.5">✕</button>
            </div>

            {reactionTab === "emoji" && (
              <div className="grid grid-cols-6 gap-0.5 p-3 max-h-56 overflow-y-auto">
                {QUICK_EMOJIS.map(e => (
                  <button key={e} onClick={() => sendReaction("emoji", e)}
                    className="text-2xl md:text-3xl p-1.5 rounded-xl hover:bg-white/10 active:scale-110 transition-transform text-center">
                    {e}
                  </button>
                ))}
              </div>
            )}

            {reactionTab === "gif" && (
              <div className="grid grid-cols-4 gap-2 p-3 max-h-64 overflow-y-auto">
                {GIFS.map(g => {
                  const url = getGifUrl(g.id);
                  return (
                    <button key={g.id} onClick={() => sendReaction("gif", url)}
                      className="relative rounded-xl overflow-hidden aspect-square bg-zinc-800 hover:ring-2 hover:ring-indigo-400 active:scale-95 transition-all">
                      <img src={url} alt={g.label} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                      <span className="absolute bottom-0.5 right-1 text-xs">{g.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BAR CONTROLS */}
        {!hideControls && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-[96vw] sm:w-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>

            {/* Row 1 — core buttons, always visible */}
            <div className="flex items-center justify-center gap-1 sm:gap-2 bg-zinc-900/80 backdrop-blur-xl px-2 py-2 sm:px-4 sm:py-2.5 rounded-3xl border border-white/10 shadow-2xl w-full sm:w-auto overflow-x-auto">

              <button onClick={toggleMute} title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 active:scale-90 ${isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent"}`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  {isMuted && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
                </svg>
              </button>

              <button onClick={toggleVideo} title={isVideoOff ? "Kamerayı Aç" : "Kamerayı Kapat"}
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 active:scale-90 ${isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent"}`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  {isVideoOff && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
                </svg>
              </button>

              <button onClick={() => setHideCameras(v => !v)} title={hideCameras ? "Kameraları Göster" : "Kameraları Gizle"}
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 active:scale-90 ${hideCameras ? "bg-amber-500/20 text-amber-500 border border-amber-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent"}`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {hideCameras
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  }
                </svg>
              </button>

              <button onClick={() => setWebcamLayout(v => v === "floating" ? "split" : "floating")} title={webcamLayout === "split" ? "Yüzen Düzen" : "Ekranı Böl"}
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 active:scale-90 ${webcamLayout === "split" ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent"}`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>

              <button onClick={() => setShowReactionPanel(v => !v)} title="Tepkiler / GIF"
                className={`flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 active:scale-90 ${showReactionPanel ? "bg-indigo-500 text-white" : "bg-white/10 text-white hover:bg-white/20 border border-transparent"}`}>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              <button onClick={() => setHideControls(true)} title="Kontrolleri Gizle"
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/10 text-white hover:bg-white/20 border border-transparent transition-all duration-200 active:scale-90">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              </button>

              <button onClick={handleFullscreenClick} title={isFullscreen ? "Tam Ekrandan Çık" : "Tam Ekran"}
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white/10 text-white hover:bg-white/20 border border-transparent transition-all duration-200 active:scale-90">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {isFullscreen
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  }
                </svg>
              </button>

              <div className="flex-shrink-0 w-px h-7 bg-white/10 mx-0.5" />

              <button onClick={() => { if (stream) stream.getTracks().forEach(t => { try { t.stop(); } catch {} }); router.push("/"); }}
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-red-600 text-white hover:bg-red-700 border border-red-500 transition-all duration-200 active:scale-90" title="Odadan Çık">
                <svg className="w-4 h-4 sm:w-5 sm:h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: "rotate(180deg)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>

            {/* Row 2 — secondary buttons, shown on ALL devices (horizontally scrollable on mobile) */}
            <div className="flex items-center gap-1.5 sm:gap-2 bg-zinc-900/60 backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/10 shadow-xl w-full sm:w-auto overflow-x-auto scrollbar-none">

              <button onClick={shareScreen} title={isScreenSharing ? "Paylaşımı Durdur" : "Ekranı Paylaş"}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-90 ${isScreenSharing ? "bg-indigo-500 text-white hover:bg-indigo-600" : "bg-white/10 text-white hover:bg-white/20 border border-transparent"}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="whitespace-nowrap">{isScreenSharing ? "⏹ Durdur" : "Ekran"}</span>
              </button>

              <button onClick={shareBrowserTab} title={isTabSharing ? "Sekme Paylaşımını Durdur" : "Bu Sekmeyi Paylaş"}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-90 ${isTabSharing ? "bg-purple-600 text-white hover:bg-purple-700 border border-purple-400/50" : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/30"}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8l2 2 4-4" />
                </svg>
                <span className="whitespace-nowrap">{isTabSharing ? "⏹ Durdur" : "📺 Sekme+Ses"}</span>
              </button>

              <button onClick={handleHyperbeamClick} title={hyperbeamActive ? "Bulut PC'yi Kapat" : "Bulut PC Başlat"}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-90 ${hyperbeamActive ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white border border-rose-400/50 animate-pulse" : "bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 hover:from-pink-500/40 hover:to-rose-500/40 border border-pink-500/30"}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span className="whitespace-nowrap">{hyperbeamActive ? "⏹ Bulut Kapat" : "☁️ Bulut PC"}</span>
              </button>

              <button
                onClick={() => setVideoFit(v => v === "contain" ? "cover" : v === "cover" ? "stretch" : "contain")}
                title={`Ekran Sığdırma: ${videoFit === "contain" ? "Orjinal" : videoFit === "cover" ? "Doldur" : "Sığdır"}`}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-all duration-200 active:scale-90 ${videoFit !== "contain" ? "bg-pink-500/20 text-pink-400 border border-pink-500/50" : "bg-white/10 text-white border border-transparent hover:bg-white/20"}`}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 8V7a3 3 0 013-3h10a3 3 0 013 3v1" />
                  <rect x="6" y="8" width="12" height="8" rx="1" stroke="currentColor" strokeWidth={1.5} fill="none" />
                </svg>
                <span className="whitespace-nowrap">{videoFit === "contain" ? "Orjinal" : videoFit === "cover" ? "Doldur" : "Sığdır"}</span>
              </button>

            </div>
            {/* end row 2 */}

          </div>
        )}

      </div>

      {/* SPLIT WEBCAMS CONTAINER (Right 50% on Desktop, Bottom 50% on Mobile) */}
      {webcamLayout === "split" && !hideCameras && (
        <div className="w-full h-[50vh] md:w-1/2 md:h-full flex flex-row md:flex-col bg-[#070709] transition-all duration-500 select-none">
          {/* Remote Webcam Pane */}
          <div className="w-1/2 h-full md:w-full md:h-1/2 relative border-r md:border-r-0 md:border-b border-white/5 flex items-center justify-center overflow-hidden bg-black/40">
            {remoteStream ? (
              <>
                <video
                  ref={setRemoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {isRemoteVideoOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 gap-2">
                    <span className="text-4xl">📷</span>
                    <span className="text-xs text-white/40 font-semibold tracking-wide uppercase">Görüntü Kapalı</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-4 bg-black/60 px-3 py-1.5 rounded-2xl text-[10px] md:text-xs font-semibold border border-white/10 flex items-center gap-2 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Arkadaşınız</span>
                  {isRemoteMuted && <span className="text-red-400 ml-1 font-bold">🎤 Sessiz</span>}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl animate-pulse text-indigo-400">👤</span>
                <span className="text-[10px] md:text-xs text-white/30 font-medium tracking-wide uppercase">Arkadaşınız Bekleniyor...</span>
              </div>
            )}
          </div>

          {/* Local Webcam Pane */}
          <div className="w-1/2 h-full md:w-full md:h-1/2 relative flex items-center justify-center overflow-hidden bg-black/40">
            {stream ? (
              <>
                <video
                  ref={setLocalVideoRef}
                  autoPlay
                  playsInline
                  muted={true}
                  className="w-full h-full object-cover"
                  style={{ transform: "scaleX(-1)" }}
                />
                {isVideoOff && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950/95 gap-2">
                    <span className="text-4xl">📷</span>
                    <span className="text-xs text-white/40 font-semibold tracking-wide uppercase">Görüntünüz Kapalı</span>
                  </div>
                )}
                <div className="absolute bottom-3 left-4 bg-black/60 px-3 py-1.5 rounded-2xl text-[10px] md:text-xs font-semibold border border-white/10 flex items-center gap-2 backdrop-blur-md">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>Siz</span>
                  {isMuted && <span className="text-red-400 ml-1 font-bold">🎤 Sessiz</span>}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span className="text-3xl text-white/10">👤</span>
                <span className="text-[10px] md:text-xs text-white/30 font-medium tracking-wide uppercase">Kamera Bulunamadı</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FLOATING WEBCAMS (Only shown when webcamLayout === "floating") */}
      {webcamLayout === "floating" && !hideCameras && (
        <>
          {/* Local Floating Webcam */}
          {stream && (
            <div
              className={`absolute z-30 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 transition-all duration-300 ${
                isDraggingLocal ? "cursor-grabbing scale-105" : "cursor-grab hover:border-white/30"
              } ${!isVideoOff ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
              style={{ width: 160, height: 110, left: localPos.x, top: localPos.y, touchAction: "none" }}
              onPointerDown={handlePointerDownLocal} onPointerMove={handlePointerMoveLocal} onPointerUp={handlePointerUpLocal}
            >
              <video
                ref={setLocalVideoRef}
                autoPlay
                playsInline
                muted={true}
                className="w-full h-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <div className="absolute bottom-1.5 left-2 pointer-events-none flex items-center gap-1.5">
                <span className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10 flex items-center gap-1">
                  <span>Siz</span>
                  {isMuted && <span className="text-red-400">🎤</span>}
                </span>
              </div>
            </div>
          )}

          {/* Remote Floating Webcam */}
          {remoteStream && (
            <div
              className={`absolute z-30 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 transition-all duration-300 ${
                isDraggingRemote ? "cursor-grabbing scale-105" : "cursor-grab hover:border-white/30"
              } ${!isRemoteVideoOff ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
              style={{ width: 160, height: 110, left: remotePos.x, top: remotePos.y, touchAction: "none" }}
              onPointerDown={handlePointerDownRemote} onPointerMove={handlePointerMoveRemote} onPointerUp={handlePointerUpRemote}
            >
              <video
                ref={setRemoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1.5 left-2 pointer-events-none">
                <span className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10 flex items-center gap-1">
                  <span>Arkadaşınız</span>
                  {isRemoteMuted && <span className="text-red-400">🎤</span>}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* ACTIVE REACTIONS OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {activeReactions.map(r => (
          <div key={r.id} className="reaction-pop drop-shadow-2xl">
            {r.type === "emoji"
              ? <span className="text-7xl md:text-9xl">{r.content}</span>
              : <img src={r.content} alt="reaction" className="w-40 h-40 md:w-56 md:h-56 object-contain rounded-2xl" referrerPolicy="no-referrer" />
            }
          </div>
        ))}
      </div>

      {/* SCREEN SHARE ERROR TOAST */}
      {screenShareError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 text-white px-5 py-3 rounded-2xl text-sm border border-red-500/50 backdrop-blur-md max-w-xs text-center shadow-xl">
          Hata: {screenShareError}
        </div>
      )}

      {/* TOP BAR */}
      {!hideControls && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 pointer-events-none">
          <span className="bg-black/60 text-white/90 px-3.5 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-lg">
            Oda ID: {roomId}
            {hyperbeamActive && (
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            )}
          </span>
        </div>
      )}

      {/* RESTORE CONTROLS BUTTON (Shown when controls are hidden) */}
      {hideControls && (
        <button
          onClick={() => setHideControls(false)}
          className="absolute bottom-6 right-6 z-50 p-3 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white/40 hover:text-white backdrop-blur-md transition-all duration-300 opacity-60 hover:opacity-100 shadow-lg"
          title="Menüyü Göster"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      )}

      {/* HYPERBEAM KEY MODAL */}
      {showHyperbeamKeyModal && (
        <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">☁️ Bulut PC Tarayıcısı</h2>
                <p className="text-white/70 text-xs mt-0.5">Telefon ve PC'de sıfır donma ile birlikte izleyin!</p>
              </div>
              <button
                onClick={() => setShowHyperbeamKeyModal(false)}
                className="text-white/60 hover:text-white text-2xl leading-none"
              >✕</button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 text-sm text-white/70">
              <p className="leading-relaxed">
                Bulut sunucularımızda çalışan güçlü bir sanal bilgisayarı odaya bağlayarak, **telefon veya PC fark etmeksizin** tüm filmleri ve videoları sıfır gecikmeyle, mükemmel ses ve görüntü kalitesiyle izleyebilirsiniz.
              </p>

              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
                <p className="font-semibold text-white">🔑 Ücretsiz API Anahtarınızı Alın (1 Dakika):</p>
                <ol className="list-decimal list-inside space-y-1 text-white/60">
                  <li><a href="https://hyperbeam.com" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:underline">hyperbeam.com</a> sitesine gidin.</li>
                  <li>Ücretsiz bir hesap oluşturun.</li>
                  <li>Developer Portal'dan **API Key** değerini kopyalayın.</li>
                  <li>Aşağıdaki kutuya yapıştırıp "Başlat"a basın.</li>
                </ol>
                <p className="text-pink-400 mt-1 font-medium">💡 Her ay 10,000 dakika (~166 saat) tamamen ücretsizdir!</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white/50">Hyperbeam API Key</label>
                <input
                  type="password"
                  value={hyperbeamApiKey}
                  onChange={e => setHyperbeamApiKey(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-pink-500 placeholder:text-white/20"
                  placeholder="sk_live_..."
                />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => setShowHyperbeamKeyModal(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 text-white font-semibold py-3 rounded-2xl transition-colors text-sm"
              >
                İptal
              </button>
              <button
                onClick={() => startHyperbeamSession(hyperbeamApiKey)}
                disabled={!hyperbeamApiKey.trim()}
                className="flex-1 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-colors text-sm shadow-lg shadow-pink-500/20"
              >
                Bulut PC Başlat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
