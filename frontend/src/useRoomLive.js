import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

// One shared connection for the whole app, opened only while a page that
// watches a room is on screen.
let socket = null;
let watchers = 0;

function getSocket() {
  if (!socket) socket = io(API_URL, { autoConnect: false });
  return socket;
}

// Live updates for a room. `onChange` is called whenever the server says
// something in the room changed (and once on every connect / reconnect), so
// the page can just re-fetch its data. Returns `connected` for a status badge.
//
// A slow safety refresh keeps running underneath: every 30s while connected,
// every 5s while disconnected (so the page still works if the live
// connection is blocked or the server is waking up).
export function useRoomLive(code, onChange) {
  const [connected, setConnected] = useState(false);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  useEffect(() => {
    const s = getSocket();
    let timer;
    // a burst of changes (e.g. finish + auto-assign) becomes one refresh
    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(() => latest.current?.(), 120);
    };
    const handleConnect = () => {
      setConnected(true);
      s.emit("room:join", code); // (re)join the room's channel after any reconnect
      trigger();
    };
    const handleDisconnect = () => setConnected(false);

    s.on("connect", handleConnect);
    s.on("disconnect", handleDisconnect);
    s.on("room:update", trigger);
    watchers += 1;
    if (s.connected) handleConnect();
    else s.connect();

    return () => {
      clearTimeout(timer);
      s.off("connect", handleConnect);
      s.off("disconnect", handleDisconnect);
      s.off("room:update", trigger);
      if (s.connected) s.emit("room:leave", code);
      watchers -= 1;
      if (watchers === 0) s.disconnect();
    };
  }, [code]);

  useEffect(() => {
    const id = setInterval(() => latest.current?.(), connected ? 30000 : 5000);
    return () => clearInterval(id);
  }, [connected]);

  return connected;
}
