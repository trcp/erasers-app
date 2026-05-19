const Ic = ({ d, fill, size = 18, sw = 1.6, children }) => (
  <svg className="ic" width={size} height={size} viewBox="0 0 24 24"
       fill={fill ? "currentColor" : "none"} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {d ? <path d={d} /> : children}
  </svg>
);

const I = {
  dashboard: (p) => <Ic {...p}><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></Ic>,
  joystick:  (p) => <Ic {...p}><circle cx="12" cy="9" r="3.5"/><path d="M12 12.5v6"/><path d="M8 19h8"/><path d="M5 9h2M17 9h2M12 4v2"/></Ic>,
  map:       (p) => <Ic {...p}><path d="M9 3L3 5v16l6-2 6 2 6-2V3l-6 2-6-2z"/><path d="M9 3v16M15 5v16"/></Ic>,
  tasks:     (p) => <Ic {...p}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9h2M7 13h2M7 17h2"/><path d="M12 9h6M12 13h6M12 17h4"/></Ic>,
  logs:      (p) => <Ic {...p}><path d="M6 4h9l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z"/><path d="M14 4v5h5"/><path d="M7 14l2 2 2-2M9 16v-4"/></Ic>,
  settings:  (p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"/></Ic>,
  bell:      (p) => <Ic {...p}><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 004 0"/></Ic>,
  user:      (p) => <Ic {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></Ic>,
  wifi:      (p) => <Ic {...p}><path d="M5 12a10 10 0 0114 0M8.5 15.5a5 5 0 017 0"/><circle cx="12" cy="19" r="1" fill="currentColor"/></Ic>,
  power:     (p) => <Ic {...p}><path d="M12 3v10"/><path d="M5 9a8 8 0 1014 0"/></Ic>,
  play:      (p) => <Ic {...p}><path d="M6 4l14 8-14 8V4z" fill="currentColor"/></Ic>,
  pause:     (p) => <Ic {...p}><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></Ic>,
  stop:      (p) => <Ic {...p}><rect x="5" y="5" width="14" height="14" rx="1" fill="currentColor"/></Ic>,
  plus:      (p) => <Ic {...p} d="M12 5v14M5 12h14"/>,
  trash:     (p) => <Ic {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></Ic>,
  refresh:   (p) => <Ic {...p}><path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5"/></Ic>,
  download:  (p) => <Ic {...p}><path d="M12 3v12M7 10l5 5 5-5M5 21h14"/></Ic>,
  search:    (p) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M16 16l5 5"/></Ic>,
  arrowUp:   (p) => <Ic {...p} d="M12 19V5M5 12l7-7 7 7"/>,
  arrowDown: (p) => <Ic {...p} d="M12 5v14M5 12l7 7 7-7"/>,
  cam:       (p) => <Ic {...p}><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></Ic>,
  zap:       (p) => <Ic {...p}><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></Ic>,
  thermo:    (p) => <Ic {...p}><path d="M10 14V5a2 2 0 014 0v9"/><circle cx="12" cy="17" r="3.5"/></Ic>,
  cpu:       (p) => <Ic {...p}><rect x="6" y="6" width="12" height="12" rx="1.5"/><rect x="9" y="9" width="6" height="6"/><path d="M3 10h3M3 14h3M18 10h3M18 14h3M10 3v3M14 3v3M10 18v3M14 18v3"/></Ic>,
  signal:    (p) => <Ic {...p}><rect x="3" y="16" width="3" height="5"/><rect x="9" y="12" width="3" height="9"/><rect x="15" y="8" width="3" height="13"/><rect x="20" y="3" width="2" height="18" opacity="0.3"/></Ic>,
  pin:       (p) => <Ic {...p}><path d="M12 21s-7-7.5-7-12a7 7 0 0114 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></Ic>,
  drag:      (p) => <Ic {...p}><circle cx="9" cy="6" r="1.2" fill="currentColor"/><circle cx="15" cy="6" r="1.2" fill="currentColor"/><circle cx="9" cy="12" r="1.2" fill="currentColor"/><circle cx="15" cy="12" r="1.2" fill="currentColor"/><circle cx="9" cy="18" r="1.2" fill="currentColor"/><circle cx="15" cy="18" r="1.2" fill="currentColor"/></Ic>,
  check:     (p) => <Ic {...p} d="M5 12l5 5L20 7"/>,
  x:         (p) => <Ic {...p} d="M6 6l12 12M18 6L6 18"/>,
  menu:      (p) => <Ic {...p} d="M4 7h16M4 12h16M4 17h16"/>,
  speech:    (p) => <Ic {...p}><path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2H9l-5 4V6z"/><path d="M8 9h8M8 12h5"/></Ic>,
  mic:       (p) => <Ic {...p}><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3M8 21h8"/></Ic>,
  volume:    (p) => <Ic {...p}><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 8a5 5 0 010 8M19 5a9 9 0 010 14"/></Ic>,
  terminal:  (p) => <Ic {...p}><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M7 9l3 3-3 3M13 15h4"/></Ic>,
  pc:        (p) => <Ic {...p}><rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/></Ic>,
  arrow:     (p) => <Ic {...p} d="M5 12h14M13 6l6 6-6 6"/>,
  chevDown:  (p) => <Ic {...p} d="M6 9l6 6 6-6"/>,
  chevRight: (p) => <Ic {...p} d="M9 6l6 6-6 6"/>,
  rocket:    (p) => <Ic {...p}><path d="M14 4c4 0 6 2 6 6 0 4-4 8-9 9l-5-5c1-5 5-9 9-9z"/><circle cx="15" cy="9" r="1.5" fill="currentColor"/><path d="M5 19l3-3M5 14l-2 4 4-2M14 19l3-3"/></Ic>,
  wave:      (p) => <Ic {...p} d="M2 12c2-4 4-4 5 0s3 4 5 0 4-4 5 0 3 4 5 0"/>,
};

export default I;
