export interface AppConfig {
  id: string;
  appName: string;
  shortName: string;
  description: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  supportEmail: string;
  supportPhone: string;
  minOrderValue: number;
  baseDeliveryCharge: number;
  defaultDeliveryRadius: number;
  logoUrl: string;
  faviconUrl: string;
  icon192Url: string;
  icon512Url: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl: string | null;
  heroImageUrl2: string | null;
  testimonials: Testimonial[];
  createdAt: string;
  updatedAt: string;
}

export interface Testimonial {
  name: string;
  location: string;
  quote: string;
  avatar: string;
  rating: number;
}

// Default config as fallback
export const DEFAULT_CONFIG: AppConfig = {
  id: "app_config",
  appName: "LaunderGo",
  shortName: "LaunderGo",
  description: "Fast and reliable laundry services, scheduled or express.",
  tagline: "Get your clothes cleaned your way",
  primaryColor: "#000000",
  secondaryColor: "#14b8a6",
  accentColor: "#f59e0b",
  backgroundColor: "#F5F5F5",
  supportEmail: "support@laundergo.com",
  supportPhone: "+91 1234567890",
  minOrderValue: 100,
  baseDeliveryCharge: 20,
  defaultDeliveryRadius: 5,
  logoUrl: "",
  faviconUrl: "",
  icon192Url: "",
  icon512Url: "",
  heroTitle: "Fresh Clothes, Zero Hassle",
  heroSubtitle: "Quality laundry service at your doorstep.",
  heroImageUrl: null,
  heroImageUrl2: null,
  testimonials: [],
  createdAt: "",
  updatedAt: "",
};
