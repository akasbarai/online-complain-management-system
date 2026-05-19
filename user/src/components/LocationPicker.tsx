import React from 'react';
import { Check, Loader2, MapPin, Navigation, Search } from 'lucide-react';
import { Button, Input } from './ui';
import { MapPinPicker } from './MapPinPicker';

type LocationValue = {
  location: string;
  latitude: number | null;
  longitude: number | null;
};

type LocationPickerProps = LocationValue & {
  onChange: (value: LocationValue) => void;
};

type SearchResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
};

const coordinatesLabel = (latitude: number, longitude: number) =>
  `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

export const LocationPicker: React.FC<LocationPickerProps> = ({
  location,
  latitude,
  longitude,
  onChange
}) => {
  const [searchQuery, setSearchQuery] = React.useState(location);
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isLocating, setIsLocating] = React.useState(false);
  const [isResolvingPin, setIsResolvingPin] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    setSearchQuery(location);
  }, [location]);

  const searchLocations = async () => {
    const query = searchQuery.trim();
    if (!query) {
      setError('Type a place, road, ward, or landmark to search.');
      return;
    }

    setIsSearching(true);
    setError('');
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        limit: '5',
        q: query
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`);
      if (!response.ok) throw new Error('Location search failed');
      const data = await response.json() as SearchResult[];
      setResults(data);
      if (data.length === 0) {
        setError('No matching locations found. Try a nearby landmark or a more specific address.');
      }
    } catch {
      setError('Could not search locations right now. You can still type the location manually.');
    } finally {
      setIsSearching(false);
    }
  };

  const reverseGeocode = async (nextLatitude: number, nextLongitude: number) => {
    try {
      const params = new URLSearchParams({
        format: 'jsonv2',
        lat: String(nextLatitude),
        lon: String(nextLongitude)
      });
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params.toString()}`);
      if (!response.ok) throw new Error('Reverse geocode failed');
      const data = await response.json() as { display_name?: string };
      return data.display_name || coordinatesLabel(nextLatitude, nextLongitude);
    } catch {
      return coordinatesLabel(nextLatitude, nextLongitude);
    }
  };

  const selectResult = (result: SearchResult) => {
    const nextLatitude = Number(result.lat);
    const nextLongitude = Number(result.lon);
    if (!Number.isFinite(nextLatitude) || !Number.isFinite(nextLongitude)) return;

    onChange({
      location: result.display_name,
      latitude: nextLatitude,
      longitude: nextLongitude
    });
    setResults([]);
    setError('');
  };

  const selectMapPin = async (nextLatitude: number, nextLongitude: number) => {
    setIsResolvingPin(true);
    setError('');

    onChange({
      location: coordinatesLabel(nextLatitude, nextLongitude),
      latitude: nextLatitude,
      longitude: nextLongitude
    });

    const nextLocation = await reverseGeocode(nextLatitude, nextLongitude);
    onChange({
      location: nextLocation,
      latitude: nextLatitude,
      longitude: nextLongitude
    });
    setResults([]);
    setIsResolvingPin(false);
  };

  const useCurrentLocation = () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    setError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLatitude = position.coords.latitude;
        const nextLongitude = position.coords.longitude;
        const nextLocation = await reverseGeocode(nextLatitude, nextLongitude);
        onChange({
          location: nextLocation,
          latitude: nextLatitude,
          longitude: nextLongitude
        });
        setResults([]);
        setIsLocating(false);
      },
      () => {
        setError('Could not get your current location. Please allow location access or search manually.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const hasPin = latitude !== null && longitude !== null;

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Search Location</label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <Input
              className="pl-9"
              placeholder="Search address, ward, road, or landmark"
              value={searchQuery}
              onChange={event => {
                setSearchQuery(event.target.value);
                onChange({ location: event.target.value, latitude: null, longitude: null });
              }}
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  searchLocations();
                }
              }}
            />
          </div>
          <Button type="button" variant="outline" onClick={searchLocations} disabled={isSearching} className="gap-2">
            {isSearching ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            Search
          </Button>
          <Button type="button" variant="outline" onClick={useCurrentLocation} disabled={isLocating} className="gap-2">
            {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
            Current
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {results.map(result => (
            <button
              key={result.place_id}
              type="button"
              onClick={() => selectResult(result)}
              className="flex w-full items-start gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-b-0 hover:bg-slate-50"
            >
              <MapPin size={16} className="mt-0.5 shrink-0 text-primary-600" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{result.display_name}</span>
                {result.type && <span className="mt-1 block text-xs capitalize text-slate-500">{result.type}</span>}
              </span>
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Exact Location</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <Input
            className="pl-9"
            required
            placeholder="Street, ward, landmark, or selected map location"
            value={location}
            onChange={event => onChange({ location: event.target.value, latitude: null, longitude: null })}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {hasPin ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
              <Check size={12} /> Pin selected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-semibold text-slate-500">
              <MapPin size={12} /> No pin selected
            </span>
          )}
          {hasPin && <span>{coordinatesLabel(latitude, longitude)}</span>}
          {isResolvingPin && <span className="inline-flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Resolving address</span>}
        </div>
      </div>

      <MapPinPicker latitude={latitude} longitude={longitude} onSelect={selectMapPin} />
    </div>
  );
};
