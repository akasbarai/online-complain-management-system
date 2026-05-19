import React from 'react';
import { LocateFixed, MapPin, Minus, Plus } from 'lucide-react';
import { Button } from './ui';

type MapPinPickerProps = {
  latitude: number | null;
  longitude: number | null;
  onSelect: (latitude: number, longitude: number) => void;
};

type Point = {
  x: number;
  y: number;
};

type LatLng = {
  lat: number;
  lng: number;
};

const TILE_SIZE = 256;
const DEFAULT_CENTER = { lat: 27.7172, lng: 85.324 };
const DEFAULT_ZOOM = 13;
const MIN_ZOOM = 3;
const MAX_ZOOM = 18;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const project = ({ lat, lng }: LatLng, zoom: number): Point => {
  const sinLatitude = Math.sin((clamp(lat, -85.05112878, 85.05112878) * Math.PI) / 180);
  const scale = TILE_SIZE * 2 ** zoom;

  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * scale
  };
};

const unproject = ({ x, y }: Point, zoom: number): LatLng => {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));

  return { lat, lng };
};

const wrapTile = (tile: number, zoom: number) => {
  const tileCount = 2 ** zoom;
  return ((tile % tileCount) + tileCount) % tileCount;
};

export const MapPinPicker: React.FC<MapPinPickerProps> = ({ latitude, longitude, onSelect }) => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [size, setSize] = React.useState({ width: 640, height: 288 });
  const [zoom, setZoom] = React.useState(DEFAULT_ZOOM);
  const [center, setCenter] = React.useState<LatLng>(() => (
    latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : DEFAULT_CENTER
  ));

  React.useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setCenter({ lat: latitude, lng: longitude });
    }
  }, [latitude, longitude]);

  React.useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateSize = () => {
      setSize({
        width: node.clientWidth || 640,
        height: node.clientHeight || 288
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const centerWorld = React.useMemo(() => project(center, zoom), [center, zoom]);
  const topLeft = {
    x: centerWorld.x - size.width / 2,
    y: centerWorld.y - size.height / 2
  };

  const tiles = React.useMemo(() => {
    const minTileX = Math.floor(topLeft.x / TILE_SIZE);
    const maxTileX = Math.floor((topLeft.x + size.width) / TILE_SIZE);
    const minTileY = Math.floor(topLeft.y / TILE_SIZE);
    const maxTileY = Math.floor((topLeft.y + size.height) / TILE_SIZE);
    const tileCount = 2 ** zoom;
    const nextTiles: Array<{ key: string; src: string; left: number; top: number }> = [];

    for (let x = minTileX; x <= maxTileX; x += 1) {
      for (let y = minTileY; y <= maxTileY; y += 1) {
        if (y < 0 || y >= tileCount) continue;
        const wrappedX = wrapTile(x, zoom);
        nextTiles.push({
          key: `${zoom}-${x}-${y}`,
          src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`,
          left: x * TILE_SIZE - topLeft.x,
          top: y * TILE_SIZE - topLeft.y
        });
      }
    }

    return nextTiles;
  }, [size.height, size.width, topLeft.x, topLeft.y, zoom]);

  const pinPosition = React.useMemo(() => {
    if (latitude === null || longitude === null) return null;
    const pinWorld = project({ lat: latitude, lng: longitude }, zoom);
    return {
      left: pinWorld.x - topLeft.x,
      top: pinWorld.y - topLeft.y
    };
  }, [latitude, longitude, topLeft.x, topLeft.y, zoom]);

  const selectPoint = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = topLeft.x + event.clientX - rect.left;
    const y = topLeft.y + event.clientY - rect.top;
    const nextCenter = unproject({ x, y }, zoom);
    const nextLatitude = clamp(nextCenter.lat, -85.05112878, 85.05112878);
    const nextLongitude = clamp(nextCenter.lng, -180, 180);

    setCenter({ lat: nextLatitude, lng: nextLongitude });
    onSelect(nextLatitude, nextLongitude);
  };

  const selectedCenter = () => {
    if (latitude !== null && longitude !== null) {
      setCenter({ lat: latitude, lng: longitude });
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
      <div
        ref={containerRef}
        role="button"
        tabIndex={0}
        aria-label="Select complaint map location"
        className="relative h-72 w-full cursor-crosshair overflow-hidden bg-slate-100"
        onClick={selectPoint}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect(center.lat, center.lng);
          }
        }}
      >
        {tiles.map(tile => (
          <img
            key={tile.key}
            src={tile.src}
            alt=""
            draggable={false}
            className="absolute h-64 w-64 select-none"
            style={{ left: tile.left, top: tile.top }}
          />
        ))}

        {pinPosition && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full text-red-600 drop-shadow"
            style={{ left: pinPosition.left, top: pinPosition.top }}
          >
            <MapPin size={34} fill="currentColor" className="stroke-white" />
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-slate-900/5" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white p-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom(prev => clamp(prev - 1, MIN_ZOOM, MAX_ZOOM))}
            aria-label="Zoom out"
          >
            <Minus size={14} />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setZoom(prev => clamp(prev + 1, MIN_ZOOM, MAX_ZOOM))}
            aria-label="Zoom in"
          >
            <Plus size={14} />
          </Button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={selectedCenter} disabled={latitude === null || longitude === null} className="gap-1">
          <LocateFixed size={14} /> Center pin
        </Button>
      </div>
    </div>
  );
};
