"use client";

import { useParams, useRouter } from "next/navigation";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useEffect, useRef, useState, useCallback } from "react";
import { socket, SOCKET_URL } from "@/lib/socket";
import VideoPlayer from "@/components/VideoPlayer";

type ReactionItem = { id: number; type: "emoji" | "gif"; content: string };

const QUICK_EMOJIS = [
  // Faces / Smiles (30)
  "­şİÇ","­şİâ","­şİä","­şİü","­şİå","­şİà","­şİé","­şñú","­şİè","­şİç","­şÖé","­şÖâ","­şİë","­şİî","­şİı","­şÑ░","­şİİ","­şİù","­şİÖ","­şİÜ","­şİï","­şİø","­şİØ","­şİ£","­şñ¬","­şñ¿","­şğÉ","­şñô","­şİÄ","­şÑ©",
  // Hand Gestures (30)
  "­şæı","­şæÄ","­şæè","Ô£è","­şñø","­şñ£","­şñŞ","Ô£î´©Å","­şñş","­şñİ","­şæî","­şñî","­şñÅ","­şæê","­şæë","­şæå","­şæç","ÔİØ´©Å","Ô£ï","­şñÜ","­şæï","­şñÖ","­şÆ¬","­şæÅ","­şÖî","­şæÉ","­şñ▓","­şñØ","­şÖÅ","Ô£ı´©Å",
  // Hearts & Love (20)
  "ÔØñ´©Å","­şğí","­şÆø","­şÆÜ","­şÆÖ","­şÆ£","­şûñ","­şñı","­şñÄ","­şÆö","ÔØñ´©ÅÔÇı­şöÑ","ÔØñ´©ÅÔÇı­ş®╣","ÔØú´©Å","­şÆò","­şÆŞ","­şÆô","­şÆù","­şÆû","­şÆİ","­şÆØ",
  // Party & Celebration (15)
  "­şÄë","­şÄè","­şÑ│","­şÄê","­şÄé","­şÄü","­şÄç","­şÄå","­şğ¿","Ô£¿","­şîş","Ô¡É´©Å","ÔÜí´©Å","­şÆÑ","­şöÑ",
  // Expressions / Random (25)
  "­şİ▒","­şİ¡","­şİ«","­şÑ▒","­şİ┤","­şñö","­şİñ","­şİí","­şñ¼","­şñ»","­ş½á","­şÆÇ","­şæ¢","­şñû","­şÄâ","­şİ║","­şæ╗","­şæ╣","­şÆ»","­şÄ»","­şÜÇ","­şæÇ","­şÆñ","­şñæ","­şÄ«"
];

const GIFS = [
  // Happy / Laughing / Celebrating
  { label: "Happy Dance", url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif" },
  { label: "OMG Excited", url: "https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif" },
  { label: "Minion Laugh", url: "https://media.giphy.com/media/Vbtc9VG53qLCg/giphy.gif" },
  { label: "Confetti Celebration", url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif" },
  { label: "Love Heart", url: "https://media.giphy.com/media/26Ff3yDMoOp5ySMkc/giphy.gif" },
  { label: "Applause Clapping", url: "https://media.giphy.com/media/l0MYEqEzwMWFCg8rm/giphy.gif" },
  { label: "Surprised Face", url: "https://media.giphy.com/media/26ufdipQqU84H52sg/giphy.gif" },
  { label: "Muscle Flex", url: "https://media.giphy.com/media/l0HlvtIPzPdt2uO0E/giphy.gif" },
  { label: "Crying Out Loud", url: "https://media.giphy.com/media/xT9IgG50Lg7rusyxfm/giphy.gif" },
  { label: "Facepalm", url: "https://media.giphy.com/media/3og0IPikp8PxHbyK2Y/giphy.gif" },
  { label: "Sleeping Cat", url: "https://media.giphy.com/media/l46Cy1rHbQ92uuLXa/giphy.gif" },
  { label: "Dance Floor", url: "https://media.giphy.com/media/l0MYGb1vogBi9sFKo/giphy.gif" },
  { label: "Yes excited", url: "https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif" },
  { label: "Sad Alone", url: "https://media.giphy.com/media/ISOckXUybVfQ4/giphy.gif" },
  { label: "Angry Tableflip", url: "https://media.giphy.com/media/l1IY5NRhxqIn22Vfa/giphy.gif" },
  { label: "Green Check", url: "https://media.giphy.com/media/xT9DPpf0zTqRASyzgA/giphy.gif" },
  { label: "Red Cross No", url: "https://media.giphy.com/media/1iTX97yx7H6K4/giphy.gif" },
  { label: "Scared Scream", url: "https://media.giphy.com/media/90F8aUepslB84/giphy.gif" },
  { label: "Deal With It", url: "https://media.giphy.com/media/jQumaiwjA3sHW/giphy.gif" },
  { label: "Mind Blown", url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif" },
  { label: "Party Popper", url: "https://media.giphy.com/media/3oEjHV0z8S7WM4KV7i/giphy.gif" },
  { label: "Awkward Grimace", url: "https://media.giphy.com/media/l3vRnHhk5cUGBJRaa/giphy.gif" },
  { label: "Gold Trophy", url: "https://media.giphy.com/media/26u4lOMA8JKSnL9Uk/giphy.gif" },
  { label: "100 Percent", url: "https://media.giphy.com/media/DhstvI3zZ598Nb1rFf/giphy.gif" },
  { label: "Rolling Laugh", url: "https://media.giphy.com/media/kiOvNHLSKBESk/giphy.gif" },
  { label: "Heart Hands", url: "https://media.giphy.com/media/26AHLNnJ4UlOhFD7W/giphy.gif" },
  { label: "Confetti Toss", url: "https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif" },
  { label: "Rocket Launch", url: "https://media.giphy.com/media/3o7WTBGtbSCEsaU4s0/giphy.gif" },
  { label: "Skeleton Death", url: "https://media.giphy.com/media/MCfhrrNN1goH6/giphy.gif" },
  { label: "Shifty Eyes", url: "https://media.giphy.com/media/3ohc10nduj1irsuzgA/giphy.gif" },

  // Expressions & Actions
  { label: "Wink", url: "https://media.giphy.com/media/3o7abKhOpu0NXS3HBC/giphy.gif" },
  { label: "Thumbs Up", url: "https://media.giphy.com/media/g9582DNuQppxC/giphy.gif" },
  { label: "Mic Drop", url: "https://media.giphy.com/media/3o7qDEq2bMbcbPRVP2/giphy.gif" },
  { label: "Popcorn Eat", url: "https://media.giphy.com/media/13cptIwW9bgzkA/giphy.gif" },
  { label: "Sassy Snicker", url: "https://media.giphy.com/media/3ohzdYJK1wAdPWVk88/giphy.gif" },
  { label: "Facepalm Picard", url: "https://media.giphy.com/media/XsUtdIeJ0MWMo/giphy.gif" },
  { label: "Happy Dance Kid", url: "https://media.giphy.com/media/l41YkxvU8Z751CXYI/giphy.gif" },
  { label: "Shocked Cat", url: "https://media.giphy.com/media/12OMY457Zu7xJG/giphy.gif" },
  { label: "Slow Clap", url: "https://media.giphy.com/media/2xO4L2iIBgjw4/giphy.gif" },
  { label: "Nod Yes", url: "https://media.giphy.com/media/3o7abKhOpu0NXS3HBC/giphy.gif" },
  { label: "Shake Head No", url: "https://media.giphy.com/media/daPCSyIHEaf2o/giphy.gif" },
  { label: "Bored Sleep", url: "https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif" },
  { label: "Hooray Jump", url: "https://media.giphy.com/media/KYElw07CpsnOTQxet1/giphy.gif" },
  { label: "Salute", url: "https://media.giphy.com/media/l0ExbnGIX9sMFS7PG/giphy.gif" },
  { label: "High Five", url: "https://media.giphy.com/media/3oEjHV0z8S7WM4KV7i/giphy.gif" },
  { label: "Crying Baby", url: "https://media.giphy.com/media/2WxWfiavndgcM/giphy.gif" },
  { label: "Dance Carlton", url: "https://media.giphy.com/media/pa37AAGzKXoek/giphy.gif" },
  { label: "Shocked Minion", url: "https://media.giphy.com/media/10VJ2YDmosmWg0/giphy.gif" },
  { label: "Confused Travolta", url: "https://media.giphy.com/media/g01ZnwAUvutuK8KNdH/giphy.gif" },
  { label: "Mic Wave", url: "https://media.giphy.com/media/dzaUX7CAG0Ihi/giphy.gif" },
  { label: "Victory V", url: "https://media.giphy.com/media/l0HlHFRbmaZtBRhXG/giphy.gif" },
  { label: "Blow Kiss", url: "https://media.giphy.com/media/3o7TKoWXm3okO1SjAI/giphy.gif" },
  { label: "Evil Smile", url: "https://media.giphy.com/media/XVbQsIjdXDNys/giphy.gif" },
  { label: "Sweating Bullets", url: "https://media.giphy.com/media/32mC2kXYRC30k/giphy.gif" },
  { label: "Angry Baby", url: "https://media.giphy.com/media/11tIB893VLShXi/giphy.gif" },
  { label: "Thinking hard", url: "https://media.giphy.com/media/d3mlE7uhX8KFgEmY/giphy.gif" },
  { label: "Applause Joker", url: "https://media.giphy.com/media/A2W1Qq8WZNsVq/giphy.gif" },
  { label: "Dancing Cat", url: "https://media.giphy.com/media/13CoXDiaCcC2EA/giphy.gif" },
  { label: "Staring Dog", url: "https://media.giphy.com/media/ghuvaCOI6kBYk/giphy.gif" },
  { label: "Ooooh Damn", url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblUk/giphy.gif" },

  // Pop Culture & Memes
  { label: "Fire Flame", url: "https://media.giphy.com/media/T2vDaYr8y1LRm/giphy.gif" },
  { label: "Party Hard", url: "https://media.giphy.com/media/l2JIdnF6aJmSgSmgE/giphy.gif" },
  { label: "DJ Cat", url: "https://media.giphy.com/media/3o72EX5QZ9N9d51dqo/giphy.gif" },
  { label: "Cool Sun", url: "https://media.giphy.com/media/1xVbZRfBYAoMYy4Oi6/giphy.gif" },
  { label: "Laughing Dog", url: "https://media.giphy.com/media/10ECcyDXfJQA0w/giphy.gif" },
  { label: "Yawn", url: "https://media.giphy.com/media/mkhMTZalL0LyU/giphy.gif" },
  { label: "Hungry Eat", url: "https://media.giphy.com/media/ZgYAzwP5PfN84/giphy.gif" },
  { label: "Fistbump", url: "https://media.giphy.com/media/bp01bkt6TIRzy/giphy.gif" },
  { label: "Running Out", url: "https://media.giphy.com/media/3o7ZetIsjtbkgNE1I4/giphy.gif" },
  { label: "Celebrating Win", url: "https://media.giphy.com/media/13GKP7ACGjpxO8/giphy.gif" },
  { label: "Wink Cat", url: "https://media.giphy.com/media/C9x8gX5jFt22A/giphy.gif" },
  { label: "Love Eyes Dog", url: "https://media.giphy.com/media/l4pTdcifP6CtmN8lm/giphy.gif" },
  { label: "Dancing Banana", url: "https://media.giphy.com/media/EluFWEdnZtv1e/giphy.gif" },
  { label: "Good Job", url: "https://media.giphy.com/media/l3q2XhfQ8oCkm1Ts4/giphy.gif" },
  { label: "OMG Surprised", url: "https://media.giphy.com/media/xT77XWum9yHCwUjFWg/giphy.gif" },
  { label: "Sad Rain", url: "https://media.giphy.com/media/OPU6wUKdXaoRG/giphy.gif" },
  { label: "Smug Smile", url: "https://media.giphy.com/media/d1E1ms5DgbT62MKs/giphy.gif" },
  { label: "Nervous laugh", url: "https://media.giphy.com/media/H5C8CevNMbpBqJFqeH/giphy.gif" },
  { label: "Mindblown Einstein", url: "https://media.giphy.com/media/l0IylOPCNkiqOgMyA/giphy.gif" },
  { label: "Waving Hello", url: "https://media.giphy.com/media/3og0IMJcSI8p6hYQXS/giphy.gif" },
  { label: "Goodbye Wave", url: "https://media.giphy.com/media/26u4b45b8KlgAB7iM/giphy.gif" },
  { label: "Clapping Seal", url: "https://media.giphy.com/media/129N27j6wT3b2/giphy.gif" },
  { label: "Scream Edvard", url: "https://media.giphy.com/media/3otWpoQUMzLPPAxnaM/giphy.gif" },
  { label: "Rolling Head", url: "https://media.giphy.com/media/d2YWTOsVtuPa/giphy.gif" },
  { label: "Dizzy Spin", url: "https://media.giphy.com/media/3o7bu3XilJ5BOESgbK/giphy.gif" },
  { label: "Dancing parrot", url: "https://media.giphy.com/media/l3q2zVr6cu95nF6O4/giphy.gif" },
  { label: "Angry Face", url: "https://media.giphy.com/media/3o7qE1YN7aBOFPRw8E/giphy.gif" },
  { label: "Crying Niagara", url: "https://media.giphy.com/media/j0qSbeNFuzjhXKFVSP/giphy.gif" },
  { label: "Thumbs Up Kid", url: "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif" },
  { label: "Aww Cute", url: "https://media.giphy.com/media/14urMYvBD4YNsY/giphy.gif" },

  // Famous Meme Classics
  { label: "Mind Blown Galaxy", url: "https://media.giphy.com/media/Um3ljJl8jfqCI/giphy.gif" },
  { label: "Shining Star", url: "https://media.giphy.com/media/26tPplGWjN0x9CH9C/giphy.gif" },
  { label: "Spidey Dance", url: "https://media.giphy.com/media/10pxA5bQx6am8o/giphy.gif" },
  { label: "Homer Bush", url: "https://media.giphy.com/media/jUwpNzg9mcyZi/giphy.gif" },
  { label: "Popcorn Thriller", url: "https://media.giphy.com/media/pUeXcg80cO8I8/giphy.gif" },
  { label: "Surprised Pikachu", url: "https://media.giphy.com/media/3kzJvEciJa94SMW3hN/giphy.gif" },
  { label: "This Is Fine", url: "https://media.giphy.com/media/3ntq5qnEtvVba/giphy.gif" },
  { label: "Success Kid", url: "https://media.giphy.com/media/B0vFJHv75FC36/giphy.gif" },
  { label: "Side Eye Chloe", url: "https://media.giphy.com/media/AAsj7jABcH/giphy.gif" },
  { label: "Disaster Girl", url: "https://media.giphy.com/media/13d2jHlSlxklVe/giphy.gif" },
  { label: "Kermit Typing", url: "https://media.giphy.com/media/ukqBV7WM4BQ4w/giphy.gif" },
  { label: "Salt Bae", url: "https://media.giphy.com/media/l4Jz3a8jO92crUlWM/giphy.gif" },
  { label: "Roll Safe Think", url: "https://media.giphy.com/media/cIyGxK5fDLyZ7KLjHC/giphy.gif" },
  { label: "Shocked Kawaii", url: "https://media.giphy.com/media/3o85xGocUH8TCQDDry/giphy.gif" },
  { label: "Crying Kim K", url: "https://media.giphy.com/media/yoJC2Js9NZpf9IZ7Bm/giphy.gif" },
  { label: "Drake Hotline", url: "https://media.giphy.com/media/fSRs6aJJTE0HN89Ztk/giphy.gif" },
  { label: "Shrug Emoji", url: "https://media.giphy.com/media/l3q2Lz5cYCDuH2e3e/giphy.gif" },
  { label: "Okay Okay", url: "https://media.giphy.com/media/1xVbZRfBYAoMYy4Oi6/giphy.gif" },
  { label: "Dancing Groot", url: "https://media.giphy.com/media/14bhmZtBNhVnIk/giphy.gif" },
  { label: "Confused Cat", url: "https://media.giphy.com/media/26gR0YFZxW5p1Vjx6/giphy.gif" },
  { label: "Coughing Cat", url: "https://media.giphy.com/media/4Z1NhFZCWQUMec15RD/giphy.gif" },
  { label: "Excited Minion", url: "https://media.giphy.com/media/F3j9DCMUXE42k/giphy.gif" },
  { label: "Waving Cat", url: "https://media.giphy.com/media/V8E0HbaPsGU8/giphy.gif" },
  { label: "Clapping Penguin", url: "https://media.giphy.com/media/l2JHRhAtnJSDNJ2py/giphy.gif" },
  { label: "Facepalm Monkey", url: "https://media.giphy.com/media/d30qasEQJH5Ms3mg/giphy.gif" },
  { label: "Nodding Dog", url: "https://media.giphy.com/media/fV2maQ4MAyUxrZWHEy/giphy.gif" },
  { label: "Crying Stream", url: "https://media.giphy.com/media/f95F2O3E5uRLy/giphy.gif" }
];

export default function Room() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.id as string;

  const { stream, remoteStream, toggleMute, toggleVideo, shareScreen, shareBrowserTab, isMuted, isVideoOff, isScreenSharing, isTabSharing, peerConnected, screenShareError, showMobileGuide, setShowMobileGuide } = useWebRTC(roomId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Separate draggable coordinates for local and remote webcams (initially left side out of search area)
  const [localPos, setLocalPos] = useState({ x: 24, y: 100 });
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);
  const [dragOffsetLocal, setDragOffsetLocal] = useState({ x: 0, y: 0 });

  const [remotePos, setRemotePos] = useState({ x: 24, y: 235 });
  const [isDraggingRemote, setIsDraggingRemote] = useState(false);
  const [dragOffsetRemote, setDragOffsetRemote] = useState({ x: 0, y: 0 });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImmersive, setIsImmersive] = useState(false);
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [reactionTab, setReactionTab] = useState<"emoji" | "gif">("emoji");
  const [activeReactions, setActiveReactions] = useState<ReactionItem[]>([]);
  const reactionIdCounter = useRef(0);
  
  // Synchronized Real-Time Co-Browsing States
  const [browserUrl, setBrowserUrl] = useState("https://www.google.com/webhp?igu=1");
  const [inputUrl, setInputUrl] = useState("https://www.google.com/webhp?igu=1");
  const [historyStack, setHistoryStack] = useState<string[]>(["https://www.google.com/webhp?igu=1"]);
  const [historyIndex, setHistoryIndex] = useState(0);

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
    const fn = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", fn);
    return () => document.removeEventListener("fullscreenchange", fn);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen().catch(() => {});
    else await document.exitFullscreen().catch(() => {});
  };

  const btnBase = "flex-shrink-0 p-3 md:p-4 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center";
  const btnGhost = `${btnBase} bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20`;

  return (
    <div className="w-screen h-screen bg-[#0f0f11] relative overflow-hidden flex items-center justify-center font-sans text-white">

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes popInFadeOut {
          0%   { transform: translate(-50%,-50%) scale(0.1); opacity:0; }
          15%  { transform: translate(-50%,-50%) scale(1.2); opacity:1; }
          30%  { transform: translate(-50%,-50%) scale(1);   opacity:1; }
          80%  { transform: translate(-50%,-50%) scale(1);   opacity:1; }
          100% { transform: translate(-50%,-60%) scale(0.85); opacity:0; }
        }
        .reaction-pop { animation: popInFadeOut 3.5s forwards; position:absolute; left:50%; top:50%; }
      `}} />

      {/* REAL-TIME CO-BROWSING INTERACTIVE BROWSER */}
      <div className="absolute inset-0 w-full h-full bg-[#0a0a0c] flex flex-col z-0">
        
        {/* Sleek Browser Navigation Top Bar */}
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
              ÔùÇ
            </button>
            <button
              onClick={handleForward}
              disabled={historyIndex === historyStack.length - 1}
              className="p-2 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent text-white/80 transition-all font-bold text-sm"
              title="─░leri"
            >
              ÔûÂ
            </button>
            <button
              onClick={() => {
                const iframe = document.getElementById("browser-iframe") as HTMLIFrameElement;
                if (iframe) iframe.src = iframe.src;
              }}
              className="p-2 rounded-xl hover:bg-white/10 text-white/80 transition-all text-sm"
              title="Yenile"
            >
              ­şöä
            </button>
          </div>

          {/* Elegant Address bar input */}
          <div className="flex-1 bg-black/40 border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-2.5 text-xs text-white/40 shadow-inner">
            <span className="text-indigo-400 text-xs font-semibold select-none flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              Payla┼ş─▒ml─▒ Ekran
            </span>
            <span className="text-white/10 select-none">|</span>
            <input
              value={inputUrl}
              onChange={e => setInputUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && navigateBrowser(inputUrl)}
              className="flex-1 bg-transparent text-white/90 outline-none placeholder:text-white/30 text-xs md:text-sm font-medium"
              placeholder="Film arat─▒n veya direkt film/makale linki yap─▒┼şt─▒r─▒n..."
            />
          </div>

          <button
            onClick={() => navigateBrowser("https://www.google.com/webhp?igu=1")}
            className="text-xs text-indigo-400 hover:text-white bg-indigo-500/10 hover:bg-indigo-500 border border-indigo-500/30 px-3 py-2 rounded-xl transition-all font-semibold"
          >
            Ana Sayfa
          </button>
        </div>

        <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0c0c0e]">
          <iframe
            id="browser-iframe"
            src={
              browserUrl.includes("google.com") 
                ? browserUrl 
                : `${SOCKET_URL}/api/proxy?url=${encodeURIComponent(browserUrl)}`
            }
            className="w-full h-full border-none"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          />
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
          µÅÉÕıç {screenShareError}
        </div>
      )}

      {/* TOP BAR */}
      {!isImmersive && (
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 bg-gradient-to-b from-black/80 to-transparent z-10 flex justify-between items-start pointer-events-none">
          <div className="flex flex-col gap-1">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight drop-shadow-md">Watch<span className="text-indigo-500">Together</span></h1>
            <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border border-indigo-500/30 w-max">Room: {roomId}</span>
          </div>
        </div>
      )}

      {/* FLOATING DRAGGABLE BUBBLE 1: LOCAL WEBCAM */}
      {!isImmersive && stream && (
        <div
          className={`absolute z-30 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 transition-shadow ${isDraggingLocal ? "cursor-grabbing scale-105" : "cursor-grab hover:border-white/30"}`}
          style={{ width: 160, height: 110, left: localPos.x, top: localPos.y, touchAction: "none" }}
          onPointerDown={handlePointerDownLocal} onPointerMove={handlePointerMoveLocal} onPointerUp={handlePointerUpLocal}
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted={true}
            className={`w-full h-full object-cover ${isVideoOff ? "opacity-0" : "opacity-100"}`}
            style={{ transform: "scaleX(-1)" }}
          />
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
              <svg className="w-8 h-8 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
              </svg>
            </div>
          )}
          <div className="absolute bottom-1.5 left-2 pointer-events-none">
            <span className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10">Siz</span>
          </div>
        </div>
      )}

      {/* FLOATING DRAGGABLE BUBBLE 2: REMOTE WEBCAM */}
      {!isImmersive && remoteStream && (
        <div
          className={`absolute z-30 overflow-hidden rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md bg-black/40 transition-shadow ${isDraggingRemote ? "cursor-grabbing scale-105" : "cursor-grab hover:border-white/30"}`}
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
            <span className="bg-black/60 px-1.5 py-0.5 rounded text-[10px] font-medium border border-white/10">Arkada┼ş─▒n─▒z</span>
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
                {tab === "emoji" ? "­şİÇ Emoji" : "­şÄÑ GIF"}
              </button>
            ))}
            <button onClick={() => setShowReactionPanel(false)} className="px-4 text-white/40 hover:text-white/80 text-xl leading-none pb-0.5">Ô£ò</button>
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
              {GIFS.map(g => (
                <button key={g.url} onClick={() => sendReaction("gif", g.url)}
                  className="relative rounded-xl overflow-hidden aspect-square bg-zinc-800 hover:ring-2 hover:ring-indigo-400 active:scale-95 transition-all">
                  <img src={g.url} alt={g.label} className="w-full h-full object-cover" loading="lazy" />
                  <span className="absolute bottom-0.5 right-1 text-xs">{g.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BAR CONTROLS */}
      {!isImmersive && (
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center justify-center gap-1.5 md:gap-3 bg-zinc-900/60 backdrop-blur-xl px-3 py-2 md:px-5 md:py-3 rounded-3xl border border-white/10 shadow-2xl max-w-[97vw] overflow-x-auto">

          <button onClick={toggleMute} title={isMuted ? "Unmute" : "Mute"}
            className={`${btnBase} ${isMuted ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              {isMuted && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
            </svg>
          </button>

          <button onClick={toggleVideo} title={isVideoOff ? "Camera On" : "Camera Off"}
            className={`${btnBase} ${isVideoOff ? "bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              {isVideoOff && <line x1="3" y1="3" x2="21" y2="21" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />}
            </svg>
          </button>

          <button onClick={shareScreen} title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
            className={`${btnBase} ${isScreenSharing ? "bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/30" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </button>

          {/* Tab Share: captures THIS tab's video AND audio — best for movie sync */}
          <button
            onClick={shareBrowserTab}
            title={isTabSharing ? "Sekme Paylaşımını Durdur" : "Bu Sekmeyi Sesli Paylaş (Film izle)"}
            className={`${btnBase} gap-1.5 px-3 text-sm font-semibold ${
              isTabSharing
                ? "bg-purple-600 text-white hover:bg-purple-700 border border-purple-400/50"
                : "bg-purple-500/20 text-purple-300 hover:bg-purple-500/40 border border-purple-500/30"
            }`}
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8l2 2 4-4" />
            </svg>
            <span className="hidden md:inline whitespace-nowrap">{isTabSharing ? "⏹ Durdur" : "📺 Sekme+Ses"}</span>
          </button>




          <button onClick={() => setShowReactionPanel(v => !v)} title="Reactions / GIF"
            className={`${btnBase} ${showReactionPanel ? "bg-indigo-500 text-white" : "bg-white/10 text-white hover:bg-white/20 border border-transparent hover:border-white/20"}`}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <button onClick={() => setIsImmersive(true)} title="Cinema Mode" className={btnGhost}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>

          <button onClick={toggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"} className={btnGhost}>
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {isFullscreen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              }
            </svg>
          </button>

          <div className="w-px h-8 bg-white/10 mx-0.5" />

          <button onClick={() => { if (stream) stream.getTracks().forEach(t => { try { t.stop(); } catch {} }); router.push("/"); }}
            className={`${btnBase} bg-red-600 text-white hover:bg-red-700 border border-red-500 shadow-red-600/30`} title="Leave Room">
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ transform: "rotate(180deg)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>

        </div>
      )}

      {isImmersive && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-md text-white/70 px-4 py-2 rounded-full text-sm font-medium pointer-events-none animate-pulse">
          Tam ekrandan çıkmak için dokunun
        </div>
      )}

      {/* MOBILE SCREEN SHARE GUIDE MODAL */}
      {showMobileGuide && (
        <div className="absolute inset-0 z-[100] flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
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
            <div className="px-6 py-5 space-y-4">
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
                  <p className="text-white/50 text-xs mt-0.5">Ekranın üstünden aşağı kaydırarak hızlı ayarlar panelini aç.</p>
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
            </div>

            <div className="px-6 pb-5">
              <button
                onClick={() => setShowMobileGuide(false)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-2xl transition-colors text-sm"
              >
                Anladım, başlayacağım!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
