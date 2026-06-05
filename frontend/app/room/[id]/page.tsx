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
  "🍕", "🍔", "🌮", "🍜", "🍣", "🍦", "🎂", "🍩", "🧋", "🥤",
  // Misc eğlenceli
  "💀", "👻", "👽", "🤖", "🎃", "🌈", "💫", "🌙", "☀️", "💎",
];

const getGifUrl = (id: string) => `https://i.giphy.com/${id}.gif`;

const GIFS = [
  // 😂 Komik / Kahkaha
  { label: "😂 Kahkaha", id: "3oEjI6SIIHBdRxXI40" },
  { label: "🤣 Yerde Gülüyor", id: "l4FGJAarb2sJPlXFu" },
  { label: "💀 Ölüyorum", id: "8vQSQ3cNXuDGo" },
  { label: "😹 Kedi Güler", id: "12OMY457Zu7xJG" },
  { label: "😜 Deli Gibi", id: "5GoVLqeAOo6PK" },
  { label: "🤦 Facepalm", id: "3og0IPikp8PxHbyK2Y" },
  { label: "🐸 Kermit Şok", id: "d3mlE7uhX8KFgEmY" },
  { label: "🤦 Ne yapayım", id: "dkGqmRTJXlhcQ" },
  { label: "🌽 Minion Gülüşü", id: "M12t2bUR1mG5y" },
  { label: "🧽 SpongeBob Gülüşü", id: "26AHCgWc6dJWRUtJ6" },
  { label: "👶 Bebek Kahkahası", id: "10yIEN8cMn40IE" },
  { label: "🐶 Köpek Sırıtması", id: "113427m33CyUha" },
  { label: "😈 Kötü Kahkaha", id: "7zxzMXcrk4PG" },
  { label: "😏 Alaycı Gülüş", id: "jQmVFypWqn2yA" },
  { label: "🥸 Jim Carrey", id: "12SBwtRR9BnWg" },

  // 🎉 Kutlama / Mutlu
  { label: "🎉 Tebrik", id: "l0MYt5jPR6QX5pnqM" },
  { label: "🥳 Parti", id: "26tOZ42Mg6pbTUPHW" },
  { label: "👏 Alkış", id: "7rj2ZgttvgomY" },
  { label: "🎊 Konfeti", id: "g9582DNuQppxC" },
  { label: "🏆 Kazandım", id: "g01ZnwAX5R9yJl74GJ" },
  { label: "💃 Dans", id: "l0HlGgbOFqWyCOGOs" },
  { label: "🕺 Dans Pistinde", id: "3oGRFl3jwFVLsGFakw" },
  { label: "✅ Başardım", id: "111ebonhjOu4vK" },
  { label: "🕴️ Carlton", id: "12tV141W7oCcGk" },
  { label: "🌽 Minions Mutlu", id: "14udF3WUwwGiss" },
  { label: "🧽 SpongeBob Mutlu", id: "nDSlfqf0gn5qh" },
  { label: "🐱 Kedi Dansı", id: "13CoXDiaCcC9Cl" },
  { label: "🧒 Çocuk Kutlama", id: "l0HU7yHIK6V2SDFec" },
  { label: "🤩 Harika", id: "3o7abldj0OL3f5CAsU" },
  { label: "🎆 Havai Fişek", id: "26tP21C1S0tXmpxTO" },

  // 😮 Şok / Sürpriz
  { label: "😮 Şok", id: "26ufdipQqU84H52sg" },
  { label: "🤯 Kafa Patladı", id: "3o6Zt6ML6BklcajjsA" },
  { label: "😱 İnanamıyorum", id: "11sBLVxNs7v6WA" },
  { label: "🐶 Hayret", id: "UO5elnTqI4OPK" },
  { label: "🤯 Akıl Uçması", id: "xT0xeJpnrWC4XWblEk" },
  { label: "⚡ Şok Pikachu", id: "3kzJvclYXS47K" },
  { label: "🦖 Pratt Şok", id: "3o7qDYXe0Qu9698xF6" },
  { label: "🙅 Steve HAYIR", id: "cqwP5vD976ipq" },
  { label: "😳 Şaşıran Çocuk", id: "3o7527xuWmWv3N2Ny7" },
  { label: "👀 Göz Yuvarlama", id: "l3q2K1M5wN64" },

  // 😍 Aşk / Sevgi
  { label: "😍 Aşk", id: "26Ff3yDMoOp5ySMkc" },
  { label: "💕 Kalpler", id: "3rXPNHHzSMtlRGPMqQ" },
  { label: "🥰 Sevgi Dolu", id: "Peqz6OoKBXAe0" },
  { label: "😘 Öpücük", id: "3o7TKoWXm3okO1bdCw" },
  { label: "🐱 Kedi Sevgisi", id: "wcJW16149720" },
  { label: "🧽 Kalp Kutu", id: "26FLdmIp6wJr91JAI" },
  { label: "🫶 Kalp Elleri", id: "145fC1268mD8tO" },
  { label: "🐼 Panda Aşk", id: "4PYB540dKsmE8" },
  { label: "🤗 Sarılma", id: "ZBQhoZC0nqknS" },
  { label: "💓 Kalp Atışı", id: "12vV5gZ8feWi7C" },

  // 😢 Ağlama / Üzgün
  { label: "😢 Ağlıyorum", id: "xT9IgG50Lg7rusyxfm" },
  { label: "😭 Çok Üzgün", id: "ROF8OQvDmxytW" },
  { label: "🥺 Çizmeli Kedi", id: "qU05wYe134652" },
  { label: "💅 Kim Kardashian", id: "Iau2Mc2YPss5a" },
  { label: "☔ Yağmur Altında", id: "d2jjuAZzDSVLy" },
  { label: "👶 Ağlayan Bebek", id: "2WxWxgFTWpuq4" },
  { label: "🐕 Üzgün Köpek", id: "14d1db" },
  { label: "😿 Üzgün Kedi", id: "3Orslc681" },
  { label: "🤦 Oh Hayır", id: "9Y5BbDSkVJ5II" },
  { label: "😔 Hayal Kırıklığı", id: "26xBI73g35CBBC3t6" },

  // 🍿 Film / Eğlence
  { label: "🍿 Popcorn", id: "13cptIwW9bgzkA" },
  { label: "🎬 Sinema", id: "pUeXcg80cO8I8" },
  { label: "🎵 Dans Et", id: "l0MYC0LajbaPoEADu" },
  { label: "🍌 Muz Dansı", id: "EluFWEdnZtv1e" },
  { label: "🌈 Nyan Cat", id: "3oKIPrc2ngFZ6BTyww" },
  { label: "🎮 Oyun Modu", id: "xT9IgHHnMPAjb5f8Mk" },
  { label: "🌳 Homer Çalılar", id: "jUwpNzg9jcyrK" },
  { label: "🍿 Popcorn Yiyen", id: "3o7rc0qMuRAq5xleMg" },
  { label: "🕶️ Jackson Popcorn", id: "p0L1Y4oGl39hC" },
  { label: "🎧 DJ Kedi", id: "5GoVLqeAOo6PK" },

  // 👍 Onay / Reddetme
  { label: "👍 Harika", id: "l3q2XhfQ8oCkm1Ts4" },
  { label: "🙅 Hayır", id: "3o6ZtaO9BZHcOjmErm" },
  { label: "🎤 Mic Drop", id: "l0HlvtIPzPdt2uapq" },
  { label: "🚀 Uçuyoruz", id: "3o7WTBGtbSCEsaU4s0" },
  { label: "👋 Selam", id: "3og0IMJcSI8p6hYQXS" },
  { label: "🐕 Baş Sallıyor", id: "yJFeycRK2DB4c" },
  { label: "🔥 Alev", id: "T2vDaYr8y1LRm" },
  { label: "👻 Hayalet Dans", id: "10pxA5bQx6am8o" },
  { label: "💯 Mükemmel", id: "QMHoU66sBXqqLqYvGO" },
  { label: "👍 Onay", id: "3o7abldj0OL3f5CAsU" },
  { label: "🙆 Evet", id: "3oFzmc17crToG2OB68" },
  { label: "🙅 Yok Artık", id: "26hkhHM9V1QCQ0HYg" },
  { label: "👌 Tamamdır", id: "4T3QP5BDigpmU" },
  { label: "👏 Obama Alkış", id: "3o7qDJKT" },

  // 😠 Kızgın / Sinirli
  { label: "😠 Kızgın", id: "xT0Gq30VfVsM1wFDW" },
  { label: "😡 Çok Kızgın", id: "12gY6Jgowz355i" },
  { label: "┬─┬ ノ( ゜-゜ノ)", id: "tJCyr6s5li5X2" },
  { label: "😿 Sinirli Kedi", id: "2G376r5qs40yQ" },
  { label: "👶 Çıldıran Bebek", id: "10t3xNDLg1K03C" },
  { label: "🦆 Donald Duck", id: "u1vFt244Dm10Y" },
  { label: "💻 Pc Kırma", id: "xTiTnHXb3dVHRJo31y" },
  { label: "🤯 Saç Yolma", id: "l1J9u3y35uWiRLF6" },
  { label: "🙄 Göz Devirme", id: "tZiLKidv7XYTC" },
  { label: "🐕 Sinirli Köpek", id: "132pSKn6EO55hS" },

  // 🕺 Dans / Müzik
  { label: "🕺 Michael Jackson", id: "pU315Kb91II48" },
  { label: "💃 Shakira Dansı", id: "fA1OFFAzYauMo" },
  { label: "🎸 Rock Gitar", id: "l2JIdnXD575Cs" },
  { label: "🎧 Müzik Keyfi", id: "l4Ep3N17MRJ7K" },
  { label: "🎤 Şarkı Söyleyen", id: "3oEdv0LJISfOiQGSmA" },
  { label: "🥳 Parti Zamanı", id: "l2JHPB2PtZCYiJ7S8" },
  { label: "🕶️ Cool Dansçı", id: "3o72F8t31QO40OT7" }
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
    isRemoteVideoOff,
    isScreenSharing,
    isTabSharing,
    peerConnected,
    screenShareError,
    showMobileGuide,
    setShowMobileGuide
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

      // 3. Try any visible video in document
      const anyVideo = findVideoSync(document.body);
      if (anyVideo && (anyVideo as any).webkitEnterFullscreen) {
        try {
          (anyVideo as any).webkitEnterFullscreen();
          return;
        } catch (err) {
          console.error("[Sync iOS Fullscreen] General video failed:", err);
        }
      }
    }

    // Call standard fullscreen for non-iOS
    toggleFullscreen();
  };

  const btnBase = "flex-shrink-0 p-3 md:p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center select-none cursor-pointer active:scale-95 touch-manipulation";
  const btnGhost = `${btnBase} bg-white/10 text-white border border-transparent hover:bg-white/20 active:bg-white/30`;

  return (
    <div className="w-screen h-[100dvh] bg-[#0f0f11] relative overflow-hidden flex items-center justify-center font-sans text-white">

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

      {/* REAL-TIME CO-BROWSING INTERACTIVE BROWSER */}
      <div className="absolute inset-0 w-full h-full bg-[#0a0a0c] flex flex-col z-0">
        
        {/* Sleek Browser Navigation Top Bar / Hyperbeam Minimalism */}
        {!isImmersive && (
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
      </div>

      {/* ACTIVE REACTIONS OVERLAY */}
      <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
        {activeReactions.map(r => (
          <div key={r.id} className="reaction-pop drop-shadow-2xl">
            {r.type === "emoji"
              ? <span className="text-7xl md:text-9xl">{r.content}</span>
              : <img src={r.content} alt="reaction" className="w-40 h-40 md:w-56 md:h-56 object-contain rounded-2xl" />
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
      {!isImmersive && (
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

      {/* FLOATING DRAGGABLE BUBBLE 1: LOCAL WEBCAM */}
      {stream && (
        <div
          className={`absolute z-30 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 transition-all duration-300 ${
            isDraggingLocal ? "cursor-grabbing scale-105" : "cursor-grab hover:border-white/30"
          } ${(!isImmersive && !isVideoOff) ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
          style={{ width: 160, height: 110, left: localPos.x, top: localPos.y, touchAction: "none" }}
          onPointerDown={handlePointerDownLocal} onPointerMove={handlePointerMoveLocal} onPointerUp={handlePointerUpLocal}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
          />
          <div className="absolute bottom-1.5 left-2 pointer-events-none">
            <span className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10">Siz</span>
          </div>
        </div>
      )}

      {/* FLOATING DRAGGABLE BUBBLE 2: REMOTE WEBCAM */}
      {remoteStream && (
        <div
          className={`absolute z-30 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 transition-all duration-300 ${
            isDraggingRemote ? "cursor-grabbing scale-105" : "cursor-grab hover:border-white/30"
          } ${(!isImmersive && !isRemoteVideoOff) ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
          style={{ width: 160, height: 110, left: remotePos.x, top: remotePos.y, touchAction: "none" }}
          onPointerDown={handlePointerDownRemote} onPointerMove={handlePointerMoveRemote} onPointerUp={handlePointerUpRemote}
        >
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-1.5 left-2 pointer-events-none">
            <span className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10">Arkadaşınız</span>
          </div>
        </div>
      )}



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
                    <img src={url} alt={g.label} className="w-full h-full object-cover" loading="lazy" />
                    <span className="absolute bottom-0.5 right-1 text-xs">{g.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* BAR CONTROLS */}
      {!isImmersive && (
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 w-[96vw] md:w-auto" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {/* Row 1 — always visible core buttons */}
          <div className="flex items-center justify-center gap-1.5 md:gap-3 bg-zinc-900/60 backdrop-blur-xl px-3 py-2 md:px-5 md:py-3 rounded-3xl border border-white/10 shadow-2xl w-full md:w-auto">

          <button onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}
            className={`${btnBase} ${isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              {isMuted && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
            </svg>
          </button>

          <button onClick={toggleVideo} title={isVideoOff ? "Camera On" : "Camera Off"}
            className={`${btnBase} ${isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              {isVideoOff && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
            </svg>
          </button>

          <button onClick={() => setShowReactionPanel(v => !v)} title="Reactions / GIF"
            className={`${btnBase} ${showReactionPanel ? "bg-indigo-500 text-white" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button onClick={() => setIsImmersive(true)} title="Cinema Mode" className={btnGhost}>
            <svg className="w-5 h-5 md:w-6 md:h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          <button onClick={handleFullscreenClick} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} className={btnGhost}>
            <svg className="w-5 h-5 md:w-6 md:h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isFullscreen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              }
            </svg>
          </button>

          <div className="w-px h-8 bg-white/10 mx-0.5" />

          <button onClick={() => { if (stream) stream.getTracks().forEach(t => { try { t.stop(); } catch {} }); router.push("/"); }}
            className={`${btnBase} bg-red-600 text-white hover:bg-red-700 border border-red-500 shadow-red-600/30`} title="Leave Room">
            <svg className="w-5 h-5 md:w-6 md:h-6 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: "rotate(180deg)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

          </div>{/* end row 1 */}

          {/* Row 2 — secondary buttons, wraps on mobile */}
          <div className="flex items-center justify-center flex-wrap gap-1.5 md:gap-2 bg-zinc-900/50 backdrop-blur-xl px-3 py-2 rounded-2xl border border-white/8 shadow-xl w-full md:w-auto">

            <button onClick={shareScreen} title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
              className={`${btnBase} ${isScreenSharing ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/30" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
              <svg className="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] ml-1 whitespace-nowrap font-semibold hidden sm:inline">{isScreenSharing ? "⏹ Durdur" : "Ekran"}</span>
            </button>

            <button
              onClick={shareBrowserTab}
              title={isTabSharing ? "Sekme Paylaşımını Durdur" : "Bu Sekmeyi Sesli Paylaş"}
              className={`${btnBase} gap-1 px-2 text-sm font-semibold ${
                isTabSharing
                  ? "bg-purple-600 text-white hover:bg-purple-700 border border-purple-400/50"
                  : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/30"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8l2 2 4-4" />
              </svg>
              <span className="text-[10px] whitespace-nowrap font-semibold">{isTabSharing ? "⏹ Durdur" : "📺 Sekme+Ses"}</span>
            </button>

            <button
              onClick={handleHyperbeamClick}
              title={hyperbeamActive ? "Bulut Tarayıcıyı Sonlandır" : "Sanal Bulut PC Başlat"}
              className={`${btnBase} gap-1 px-2 text-sm font-semibold ${
                hyperbeamActive
                  ? "bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-rose-500/30 border border-rose-400/50 animate-pulse"
                  : "bg-gradient-to-r from-pink-500/20 to-rose-500/20 text-pink-300 hover:from-pink-500/40 hover:to-rose-500/40 border border-pink-500/30"
              }`}
            >
              <svg className="w-5 h-5 flex-shrink-0 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-[10px] whitespace-nowrap font-semibold">{hyperbeamActive ? "⏹ Bulut Kapat" : "☁️ Bulut PC"}</span>
            </button>

            <button
              onClick={() => setVideoFit(v => v === "contain" ? "cover" : v === "cover" ? "stretch" : "contain")}
              title={`Ekran Sığdırma: ${videoFit === "contain" ? "Orjinal" : videoFit === "cover" ? "Doldur" : "Sığdır"}`}
              className={`relative ${btnBase} gap-1 px-2 ${videoFit !== "contain" ? "bg-pink-500/20 text-pink-400 border border-pink-500/50" : "bg-white/10 text-white border border-transparent"}`}
            >
              <svg className="w-5 h-5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M4 8V7a3 3 0 013-3h10a3 3 0 013 3v1" />
                <rect x="6" y="8" width="12" height="8" rx="1" stroke="currentColor" strokeWidth={1.5} fill="none" />
              </svg>
              <span className="text-[10px] whitespace-nowrap font-semibold">
                {videoFit === "contain" ? "Orjinal" : videoFit === "cover" ? "Doldur" : "Sığdır"}
              </span>
            </button>

          </div>{/* end row 2 */}

        </div>
      )}

      {isImmersive && (
        <button
          onClick={() => setIsImmersive(false)}
          className="absolute top-4 right-4 z-50 p-3 rounded-full bg-black/40 hover:bg-black/80 border border-white/10 text-white/40 hover:text-white backdrop-blur-md transition-all duration-300 opacity-40 hover:opacity-100 shadow-lg"
          title="Menüyü Göster"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
      )}

      {/* MOBILE SCREEN SHARE GUIDE MODAL */}
      {/* MOBILE SCREEN SHARE GUIDE MODAL */}
      {showMobileGuide && (
        <div className="absolute inset-0 z-[100] flex items-end md:items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">📱 Mobil Ekran Paylaşımı</h2>
                <p className="text-white/70 text-xs mt-0.5">Android / iOS için adım adım rehber</p>
              </div>
              <button
                onClick={() => setShowMobileGuide(false)}
                className="text-white/60 hover:text-white text-2xl leading-none"
              >✕</button>
            </div>

            {/* Steps */}
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="flex gap-3 items-start">
                <span className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-sm font-bold flex-shrink-0 flex items-center justify-center">1</span>
                <div>
                  <p className="text-white text-sm font-semibold">Filmi arka planda aç</p>
                  <p className="text-white/50 text-xs mt-0.5">Bu uygulamayı küçültüp telefonun tarayıcısında izlemek istediğin filmi/videoyu başlat.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-sm font-bold flex-shrink-0 flex items-center justify-center">2</span>
                <div>
                  <p className="text-white text-sm font-semibold">Bildirim panelini aşağı çek</p>
                  <p className="text-white/50 text-xs mt-0.5">Ekranın üstünden aşağı iki kez kaydırarak hızlı ayarlar panelini aç.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-sm font-bold flex-shrink-0 flex items-center justify-center">3</span>
                <div>
                  <p className="text-white text-sm font-semibold">"Ekran Kaydı"na bas</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    <span className="text-yellow-400 font-semibold">⚠️ Önemli:</span> Sesi de paylaşmak için mikrofon/ses ikonuna dokunarak <span className="text-green-400 font-semibold">"Sistem Sesi"ni aktif et.</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <span className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-400 text-sm font-bold flex-shrink-0 flex items-center justify-center">4</span>
                <div>
                  <p className="text-white text-sm font-semibold">WatchTogether'a geri dön</p>
                  <p className="text-white/50 text-xs mt-0.5">Kaydı başlattıktan sonra bu uygulamaya geri dön — arkadaşın seni otomatik izlemeye başlar!</p>
                </div>
              </div>

              {/* Troubleshooting Segment */}
              <div className="pt-4 border-t border-white/5 space-y-3">
                <p className="text-sm font-bold text-indigo-400 flex items-center gap-1.5">
                  🔍 Ekran Kaydı Düğmesi Çıkmıyor mu?
                </p>
                
                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 text-xs text-white/70 space-y-2">
                  <p className="font-semibold text-white">Yöntem A: Paneli Düzenle (Düğmeyi Ekle)</p>
                  <p className="leading-relaxed">
                    Hızlı ayarlar panelini sonuna kadar indirin. Sağ üstteki veya alt kısmdaki <span className="text-indigo-300 font-medium">Kalem (Düzenle)</span> veya <span className="text-indigo-300 font-medium">Üç Nokta</span> simgesine basın. Alttaki gizli simgeler arasından <span className="text-indigo-300 font-medium">"Ekran Kaydedici"</span> simgesini bulup yukarıya (aktif olanların yanına) sürükleyin.
                  </p>
                </div>

                <div className="bg-white/5 p-3.5 rounded-2xl border border-white/5 text-xs text-white/70 space-y-2">
                  <p className="font-semibold text-white">Yöntem B: Ücretsiz Uygulama Kullan</p>
                  <p className="leading-relaxed">
                    Telefonunuzda dahili ekran kaydedici yoksa, Google Play Store'dan tamamen ücretsiz ve reklamsız olan <span className="text-indigo-300 font-medium">"AZ Screen Recorder"</span> veya <span className="text-indigo-300 font-medium">"XRecorder"</span> uygulamasını indirin. Bu uygulamalar tek tıkla sesli ekran paylaşımı yapmanızı sağlar.
                  </p>
                </div>

                <div className="bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20 text-xs text-indigo-300 text-center">
                  💡 En iyi ve pürüzsüz deneyim için izleme partisini bir bilgisayardan (PC/Laptop) Chrome sekme paylaşımıyla başlatmanızı öneririz!
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-zinc-950/50 border-t border-white/5 flex gap-3">
              <button
                onClick={() => setShowMobileGuide(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-2xl transition-colors text-sm shadow-lg shadow-purple-500/20"
              >
                Anladım, Deneyeceğim!
              </button>
            </div>
          </div>
        </div>
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
