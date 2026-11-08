export type Page<T> = {
  items: T[];
  total: number;
  offset: number;
  limit: number;
};

export type Scope = 'GLOBAL' | 'CLUB' | 'DEPARTMENT';
