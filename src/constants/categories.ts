import { CustomCategory } from '@/types';

export const DEFAULT_CATEGORIES: CustomCategory[] = [
  { 
    id: 'food', 
    name: 'Food & Drinks', 
    color: '#ef4444', 
    icon: 'restaurant',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  { 
    id: 'transport', 
    name: 'Transport', 
    color: '#22c55e', 
    icon: 'car',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  { 
    id: 'accommodation', 
    name: 'Accommodation', 
    color: '#6366f1', 
    icon: 'bed',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  { 
    id: 'entertainment', 
    name: 'Entertainment', 
    color: '#f59e0b', 
    icon: 'game-controller',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  { 
    id: 'shopping', 
    name: 'Shopping', 
    color: '#ec4899', 
    icon: 'bag',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  { 
    id: 'health', 
    name: 'Health', 
    color: '#10b981', 
    icon: 'medical',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
  { 
    id: 'other', 
    name: 'Other', 
    color: '#6b7280', 
    icon: 'ellipsis-horizontal',
    isDefault: true,
    createdAt: new Date().toISOString()
  },
];

export const AVAILABLE_ICONS = [
  'restaurant', 'car', 'bed', 'game-controller', 'bag', 'medical', 'ellipsis-horizontal',
  'airplane', 'train', 'bus', 'bicycle', 'walk', 'boat', 'car-outline',
  'cafe', 'pizza', 'wine', 'fast-food-outline', 'ice-cream-outline', 'barbell-outline',
  'shirt', 'watch', 'gift', 'diamond-outline', 'heart', 'star',
  'home', 'bed-outline', 'business', 'school', 'medical-outline', 'card-outline',
  'camera', 'musical-notes', 'film', 'book', 'laptop', 'call',
  'car-sport', 'car-sport-outline', 'battery-charging', 'construct', 'hammer',
  'leaf', 'flash', 'snow', 'sunny', 'rainy', 'cloudy',
  'add', 'remove', 'checkmark', 'close', 'information', 'warning'
];

export const AVAILABLE_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981',
  '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7',
  '#d946ef', '#ec4899', '#f43f5e', '#6b7280', '#374151', '#111827'
];