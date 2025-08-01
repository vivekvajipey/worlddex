import { PostgrestQueryBuilder } from '@supabase/postgrest-js';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SupabasePaginatedResult<T> {
  data: T[];
  count: number;
}

export const buildPaginatedQuery = <T>(
  query: PostgrestQueryBuilder<any, any, any>,
  { page, pageSize }: PaginationParams,
  includeCount: boolean = true
): PostgrestQueryBuilder<any, any, any> => {
  const offset = (page - 1) * pageSize;
  const from = offset;
  const to = offset + pageSize - 1;

  let paginatedQuery = query.range(from, to);
  
  if (includeCount) {
    paginatedQuery = paginatedQuery.select('*', { count: 'exact' });
  }

  return paginatedQuery;
};

export const executePaginatedQuery = async <T>(
  query: PostgrestQueryBuilder<any, any, any>,
  paginationParams: PaginationParams,
  includeCount: boolean = true
): Promise<SupabasePaginatedResult<T>> => {
  const paginatedQuery = buildPaginatedQuery(query, paginationParams, includeCount);
  
  const { data, error, count } = await paginatedQuery;

  if (error) {
    console.error("Error executing paginated query:", error);
    throw error;
  }

  return {
    data: data || [],
    count: count || 0,
  };
};

export const calculatePaginationInfo = (
  totalCount: number,
  page: number,
  pageSize: number
) => {
  const totalPages = Math.ceil(totalCount / pageSize);
  const hasMore = page < totalPages;
  const hasPrevious = page > 1;
  
  return {
    totalPages,
    hasMore,
    hasPrevious,
    currentPage: page,
    totalCount,
  };
};