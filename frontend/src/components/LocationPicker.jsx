import { useEffect, useRef, useState } from 'react';

// ─── Load Google Maps JS API once ────────────────────────────────────────────
const useGoogleMaps = () => {
  const [loaded, setLoaded] = useState(!!window.google?.maps);

  useEffect(() => {
    if (window.google?.maps) { setLoaded(true); return; }
    const key = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!key) return;

    if (document.getElementById('gm-script')) {
      // Script already injected — poll until the API is ready
      const id = setInterval(() => {
        if (window.google?.maps) { setLoaded(true); clearInterval(id); }
      }, 150);
      return () => clearInterval(id);
    }

    const s = document.createElement('script');
    s.id = 'gm-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=geocoding`;
    s.async = true;
    s.onload = () => setLoaded(true);
    document.head.appendChild(s);
  }, []);

  return loaded;
};

// Default centre: Cairo
const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 };

// ─── LocationPicker ────────────────────────────────────────────────────────────
// Props:
//   value    – { lat, lng, address } or null/undefined
//   onChange – called with { lat, lng, address } whenever the pin moves
//   label    – tooltip for the marker
//   height   – map div height in px (default 280)
const LocationPicker = ({ value, onChange, label = 'الموقع المحدد', height = 280 }) => {
  const mapsReady    = useGoogleMaps();
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markerRef    = useRef(null);
  const geocoderRef  = useRef(null);
  const [address,    setAddress]  = useState(value?.address || '');
  const [locating,   setLocating] = useState(false);

  const hasKey = !!import.meta.env.VITE_GOOGLE_MAPS_KEY;

  // ── Build the map once the API has loaded ─────────────────────────────────
  useEffect(() => {
    if (!mapsReady || !containerRef.current || mapRef.current) return;

    const center = (value?.lat != null && value?.lng != null)
      ? { lat: value.lat, lng: value.lng }
      : DEFAULT_CENTER;

    const map = new window.google.maps.Map(containerRef.current, {
      center,
      zoom:                  value?.lat != null ? 15 : 10,
      mapTypeControl:        false,
      streetViewControl:     false,
      fullscreenControl:     false,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.LEFT_CENTER,
      },
    });

    const marker = new window.google.maps.Marker({
      position:  center,
      map,
      draggable: true,
      title:     label,
    });

    geocoderRef.current = new window.google.maps.Geocoder();

    const reverseGeocode = (lat, lng) => {
      geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
        const addr = (status === 'OK' && results?.[0])
          ? results[0].formatted_address
          : '';
        setAddress(addr);
        onChange({ lat, lng, address: addr });
      });
    };

    marker.addListener('dragend', () => {
      const pos = marker.getPosition();
      reverseGeocode(pos.lat(), pos.lng());
    });

    map.addListener('click', (e) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.setPosition({ lat, lng });
      reverseGeocode(lat, lng);
    });

    mapRef.current    = map;
    markerRef.current = marker;
  }, [mapsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Geolocation ────────────────────────────────────────────────────────────
  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude;
        const lng = coords.longitude;
        if (mapRef.current && markerRef.current) {
          mapRef.current.setCenter({ lat, lng });
          mapRef.current.setZoom(16);
          markerRef.current.setPosition({ lat, lng });
        }
        if (geocoderRef.current) {
          geocoderRef.current.geocode({ location: { lat, lng } }, (results, status) => {
            const addr = (status === 'OK' && results?.[0]) ? results[0].formatted_address : '';
            setAddress(addr);
            onChange({ lat, lng, address: addr });
            setLocating(false);
          });
        } else {
          onChange({ lat, lng, address: '' });
          setLocating(false);
        }
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── No API key configured ─────────────────────────────────────────────────
  if (!hasKey) {
    return (
      <div style={{
        padding: '16px 18px', background: '#FFF7ED',
        border: '1.5px dashed #FED7AA', borderRadius: 12,
        textAlign: 'center', color: '#92400E', fontSize: 13, lineHeight: 1.7,
      }}>
        🗺 لم يتم تكوين مفتاح Google Maps.
        <br />
        أضف <code style={{ fontSize: 12 }}>VITE_GOOGLE_MAPS_KEY</code> إلى{' '}
        <code style={{ fontSize: 12 }}>.env</code> لتفعيل خريطة الموقع.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>

      {/* "Use my location" button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" onClick={locateMe}
          disabled={locating || !mapsReady}
          style={{
            padding: '7px 14px',
            background: '#EFF6FF', border: '1.5px solid #BFDBFE',
            borderRadius: 8, color: '#2563EB',
            fontSize: 12, fontWeight: 700,
            cursor: (locating || !mapsReady) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: 'inherit', opacity: (locating || !mapsReady) ? 0.6 : 1,
          }}>
          {locating ? '…جاري التحديد' : '📍 موقعي الحالي'}
        </button>
      </div>

      {/* Map container */}
      <div style={{
        position: 'relative', height,
        borderRadius: 12, overflow: 'hidden',
        border: '1.5px solid #E5E7EB', background: '#F3F4F6',
      }}>
        {!mapsReady && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexDirection: 'column', gap: 8, color: '#6B7280', fontSize: 13,
          }}>
            <span style={{ fontSize: 28 }}>🗺</span>
            جاري تحميل الخريطة…
          </div>
        )}
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      </div>

      {/* Detected address */}
      {address && (
        <div style={{
          padding: '8px 12px',
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 8, fontSize: 12, color: '#166534',
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <span style={{ flexShrink: 0 }}>📍</span>
          <span style={{ lineHeight: 1.55 }}>{address}</span>
        </div>
      )}

      <div style={{ fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
        اضغط على الخريطة أو اسحب الدبوس لتحديد الموقع بدقة
      </div>
    </div>
  );
};

export default LocationPicker;
