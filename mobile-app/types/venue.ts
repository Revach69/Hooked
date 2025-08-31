export interface MapClient {
  id: string;
  name: string;
  type: string;
  coordinates: [number, number]; // [longitude, latitude] for Mapbox
  address: string;
  description: string;
  image?: string | null;
  phone?: string | null;
  website?: string | null;
  socialMedia?: {
    instagram?: string | null;
    facebook?: string | null;
    whatsapp?: string | null;
  } | null;
  hookedHours?: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  } | null;
  openingHours?: {
    [day: string]: {
      open: string;
      close: string;
      closed: boolean;
    };
  } | null;
  activeUsers: number; // For display purposes
}