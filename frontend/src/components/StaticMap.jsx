// ─── StaticMap ─────────────────────────────────────────────────────────────────
// Display-only embedded map using Google Maps iframe (no API key required).
// Props:
//   lat, lng – coordinates (required)
//   address  – optional label shown below the map
//   height   – iframe height in px (default 220)
//   zoom     – map zoom level (default 14)
const StaticMap = ({ lat, lng, address, height = 220, zoom = 14 }) => {
  if (lat == null || lng == null) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        borderRadius: 12, overflow: 'hidden',
        border: '1px solid #E8D5C0', height,
        background: '#F3F4F6',
      }}>
        <iframe
          title="موقع على الخريطة"
          width="100%"
          height="100%"
          style={{ border: 0, display: 'block' }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`}
        />
      </div>

      {address && (
        <div style={{
          padding: '7px 12px',
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 8, fontSize: 12, color: '#166534',
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <span style={{ flexShrink: 0 }}>📍</span>
          <span style={{ lineHeight: 1.55 }}>{address}</span>
        </div>
      )}
    </div>
  );
};

export default StaticMap;
