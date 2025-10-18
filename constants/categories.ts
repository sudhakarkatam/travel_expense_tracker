import { ExpenseCategory } from '@/types';

export interface CategoryInfo {
  id: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
}

export const EXPENSE_CATEGORIES: CategoryInfo[] = [
  {
    id: 'food',
    label: 'Food & Drinks',
    icon: 'UtensilsCrossed',
    color: '#FF6B6B',
  },
  {
    id: 'transport',
    label: 'Transport',
    icon: 'Car',
    color: '#4ECDC4',
  },
  {
    id: 'accommodation',
    label: 'Accommodation',
    icon: 'Hotel',
    color: '#95E1D3',
  },
  {
    id: 'entertainment',
    label: 'Entertainment',
    icon: 'Ticket',
    color: '#F38181',
  },
  {
    id: 'shopping',
    label: 'Shopping',
    icon: 'ShoppingBag',
    color: '#AA96DA',
  },
  {
    id: 'health',
    label: 'Health',
    icon: 'Heart',
    color: '#FCBAD3',
  },
  {
    id: 'other',
    label: 'Other',
    icon: 'MoreHorizontal',
    color: '#A8DADC',
  },
];

export const getCategoryInfo = (category: ExpenseCategory): CategoryInfo => {
  return EXPENSE_CATEGORIES.find(c => c.id === category) || EXPENSE_CATEGORIES[6];
};
