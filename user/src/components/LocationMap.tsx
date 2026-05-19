import React from 'react';
import { ExternalLink, MapPin } from 'lucide-react';

type LocationMapProps = {
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
};

const hasCoordinate = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value);

export const LocationMap: React.FC<LocationMapProps> = ({ location, latitude, longitude, className = '' }) => {
  const hasCoordinates = hasCoordinate(latitude) && hasCoordinate(longitude);
  const locationText = location?.trim() || '';
  const query = hasCoordinates ? `${latitude},${longitude}` : locationText;

  if (!query) return null;

  const encodedQuery = encodeURIComponent(query);
  const embedUrl = `https://www.google.com/maps?q=${encodedQuery}&z=${hasCoordinates ? 16 : 14}&output=embed`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;

  return (
    <div className={`overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}>
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-slate-500">
            <MapPin size={13} /> Map location
          </p>
          <p className="mt-1 truncate text-sm font-medium text-slate-900">{locationText || query}</p>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <ExternalLink size={13} /> Open in Google Maps
        </a>
      </div>
      <iframe
        title="Complaint location map"
        src={embedUrl}
        className="h-64 w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
};
