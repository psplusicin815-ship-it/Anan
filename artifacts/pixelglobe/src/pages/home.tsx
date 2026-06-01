import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { 
  useGetCanvas, 
  useGetMe, 
  usePlacePixel,
  getGetMeQueryKey
} from "@workspace/api-client-react";
import { Layout } from "@/components/Layout";
import { PALETTE } from "@/lib/colors";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 500;

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { data: user, refetch: refetchMe } = useGetMe({ query: { retry: false } });
  const { data: canvasState } = useGetCanvas();
  const placePixel = usePlacePixel();
  const { toast } = useToast();

  const [selectedColor, setSelectedColor] = useState<string>(PALETTE[0]);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const [hoveredPixel, setHoveredPixel] = useState<{ x: number, y: number, color?: string, username?: string } | null>(null);
  const [cooldown, setCooldown] = useState<number>(0);

  // Store pixels efficiently
  const pixelsRef = useRef<Map<string, any>>(new Map());

  // Init canvas from API
  useEffect(() => {
    if (canvasState?.pixels) {
      canvasState.pixels.forEach(p => {
        pixelsRef.current.set(`${p.x},${p.y}`, p);
      });
      drawCanvas();
    }
  }, [canvasState]);

  // WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    let ws: WebSocket;
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "pixel") {
            pixelsRef.current.set(`${data.x},${data.y}`, data);
            drawCanvas();
          }
        } catch (err) {
          console.error("Failed to parse WS message", err);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (!user?.cooldownUntil) {
      setCooldown(0);
      return;
    }

    const updateCooldown = () => {
      const until = new Date(user.cooldownUntil!).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((until - now) / 1000));
      setCooldown(remaining);
    };

    updateCooldown();
    const interval = setInterval(updateCooldown, 1000);
    return () => clearInterval(interval);
  }, [user?.cooldownUntil]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    pixelsRef.current.forEach((p, key) => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 1, 1);
    });
  }, []);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleWheel = (e: React.WheelEvent) => {
    const zoomFactor = 1.1;
    const newScale = Math.min(Math.max(1, scale * (e.deltaY < 0 ? zoomFactor : 1 / zoomFactor)), 40);
    
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newOffsetX = mouseX - (mouseX - offset.x) * (newScale / scale);
    const newOffsetY = mouseY - (mouseY - offset.y) * (newScale / scale);

    setScale(newScale);
    setOffset({ x: newOffsetX, y: newOffsetY });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    if (!containerRef.current || !canvasRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const x = Math.floor((mouseX - offset.x) / scale);
    const y = Math.floor((mouseY - offset.y) / scale);

    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
      const pixel = pixelsRef.current.get(`${x},${y}`);
      setHoveredPixel({ x, y, color: pixel?.color, username: pixel?.username });
    } else {
      setHoveredPixel(null);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      return;
    }

    if (e.button !== 0) return;
    if (!user) {
      toast({ title: "Not logged in", description: "You must be logged in to place pixels.", variant: "destructive" });
      return;
    }

    if (cooldown > 0) {
      toast({ title: "Cooldown active", description: `Please wait ${cooldown} seconds.`, variant: "destructive" });
      return;
    }

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const x = Math.floor((mouseX - offset.x) / scale);
    const y = Math.floor((mouseY - offset.y) / scale);

    if (x >= 0 && x < CANVAS_WIDTH && y >= 0 && y < CANVAS_HEIGHT) {
      placePixel.mutate({ data: { x, y, color: selectedColor } }, {
        onSuccess: () => {
          refetchMe(); // Update cooldown
        },
        onError: (err: any) => {
          toast({ title: "Failed to place pixel", description: err?.message || "Unknown error", variant: "destructive" });
        }
      });
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && scale === 1) {
        const rect = containerRef.current.getBoundingClientRect();
        const initialScale = Math.min(rect.width / CANVAS_WIDTH, rect.height / CANVAS_HEIGHT);
        setScale(initialScale * 0.9);
        setOffset({
          x: (rect.width - CANVAS_WIDTH * initialScale * 0.9) / 2,
          y: (rect.height - CANVAS_HEIGHT * initialScale * 0.9) / 2,
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasState, scale]);


  return (
    <Layout>
      <div 
        ref={containerRef}
        className="flex-1 relative bg-black/90 overflow-hidden select-none touch-none"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setIsDragging(false); setHoveredPixel(null); }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <div 
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "0 0",
            imageRendering: "pixelated",
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            position: "absolute",
          }}
          className="shadow-2xl ring-1 ring-border"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full pointer-events-none"
          />
          {hoveredPixel && scale > 3 && (
            <div 
              style={{
                position: "absolute",
                left: hoveredPixel.x,
                top: hoveredPixel.y,
                width: 1,
                height: 1,
                border: `${0.5 / scale}px solid rgba(255, 255, 255, 0.8)`,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                pointerEvents: "none"
              }}
            />
          )}
        </div>

        {/* HUD */}
        <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-2">
          {hoveredPixel && (
            <div className="bg-card/90 backdrop-blur border border-border p-2 px-3 text-xs font-mono rounded text-muted-foreground flex flex-col gap-1 pointer-events-auto shadow-xl">
              <div><span className="text-foreground">({hoveredPixel.x}, {hoveredPixel.y})</span></div>
              {hoveredPixel.username && (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: hoveredPixel.color }} />
                  <span className="text-primary truncate max-w-[150px]">{hoveredPixel.username}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {user && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4">
            {cooldown > 0 && (
              <div className="bg-destructive/10 text-destructive border border-destructive px-4 py-1.5 rounded-full font-mono text-sm shadow-xl backdrop-blur">
                COOLDOWN: {cooldown}s
              </div>
            )}
            
            <div className="bg-card border border-border p-2 rounded flex flex-wrap max-w-2xl justify-center gap-1 shadow-2xl backdrop-blur-md">
              {PALETTE.map((color) => (
                <button
                  key={color}
                  onClick={(e) => { e.stopPropagation(); setSelectedColor(color); }}
                  className={`w-8 h-8 rounded-sm transition-transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-110 z-10' : ''}`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
