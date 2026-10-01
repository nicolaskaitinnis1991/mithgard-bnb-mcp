export interface Listing {
  id: string;
  title: string;
  url: string;
  price_per_night: number | null;
  display_price?: number | null;
  price_basis?: 'night' | 'stay_total' | 'unknown';
  currency: string | null;
  rating?: number;
  review_count?: number;
  host_name?: string;
  location: string;
  thumbnail_url?: string;
}

export interface ListingFull extends Listing {
  description: string;
  amenities: string[];
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  check_in?: string;
  check_out?: string;
  house_rules?: string[];
}

export interface ReviewsSummary {
  total: number | null;
  average: number | null;
  by_category?: {
    cleanliness: number | null;
    accuracy: number | null;
    communication: number | null;
    location: number | null;
    check_in: number | null;
    value: number | null;
  };
  recent_excerpts?: string[];
}

export interface HostSummary {
  name: string;
  superhost: boolean | null;
  joined: string;
  response_rate?: number;
  response_time?: string;
  languages?: string[];
}

export interface NormalizedQuery {
  location: string;
  checkin?: string | undefined;
  checkout?: string | undefined;
  adults: number;
  children: number;
  min_price?: number | undefined;
  max_price?: number | undefined;
  currency: string;
}
