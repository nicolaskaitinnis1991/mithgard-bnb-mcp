export interface Listing {
  id: string;
  title: string;
  url: string;
  price_per_night: number;
  currency: string;
  rating?: number;
  review_count?: number;
  host_name?: string;
  location: string;
  thumbnail_url?: string;
}

export interface ListingFull extends Listing {
  description: string;
  amenities: string[];
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  check_in?: string;
  check_out?: string;
  house_rules?: string[];
}

export interface ReviewsSummary {
  total: number;
  average: number;
  by_category?: {
    cleanliness: number;
    accuracy: number;
    communication: number;
    location: number;
    check_in: number;
    value: number;
  };
  recent_excerpts?: string[];
}

export interface HostSummary {
  name: string;
  superhost: boolean;
  joined: string;
  response_rate?: number;
  response_time?: string;
  languages?: string[];
}

export interface NormalizedQuery {
  location: string;
  checkin?: string;
  checkout?: string;
  adults: number;
  children: number;
  min_price?: number;
  max_price?: number;
  currency: string;
}
