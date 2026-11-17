import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  BundleResponse,
  Category,
  Job,
  Product,
  ProductsResponse,
  Question,
  Review,
  VacationSetting,
} from "@/types";

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await api.get<Category[] | { categories: Category[] }>("/categories");
      return Array.isArray(res) ? res : res.categories || [];
    },
    staleTime: 60_000,
  });
}

export interface ProductQueryParams {
  category?: string;
  activity?: string;
  search?: string;
  status?: "featured" | string;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export function useProducts(params?: ProductQueryParams) {
  return useQuery<ProductsResponse>({
    queryKey: ["products", params || {}],
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params?.category && params.category !== "all") qs.set("category", params.category);
      if (params?.activity) qs.set("activity", params.activity);
      if (params?.search) qs.set("search", params.search);
      if (params?.status) qs.set("status", params.status);
      if (params?.minPrice !== undefined) qs.set("minPrice", String(params.minPrice));
      if (params?.maxPrice !== undefined) qs.set("maxPrice", String(params.maxPrice));
      if (params?.page) qs.set("page", String(params.page));
      if (params?.limit) qs.set("limit", String(params.limit));

      const queryStr = qs.toString();
      const res = await api.get<ProductsResponse | Product[]>(
        `/products${queryStr ? `?${queryStr}` : ""}`
      );
      if (Array.isArray(res)) {
        return {
          products: res,
          pagination: { total: res.length, page: 1, limit: res.length || 12, pages: 1 },
        };
      }
      return {
        products: res.products || [],
        pagination: res.pagination || { total: 0, page: 1, limit: 12, pages: 1 },
      };
    },
    staleTime: 30_000,
  });
}

export function useProduct(slug?: string) {
  return useQuery<Product>({
    queryKey: ["product", slug],
    enabled: Boolean(slug),
    queryFn: () => api.get<Product>(`/products/${encodeURIComponent(slug!)}`),
  });
}

export function useSemanticSearch(
  query: string,
  options?: { category?: string; minPrice?: number; maxPrice?: number; enabled?: boolean }
) {
  return useQuery<Product[]>({
    queryKey: ["semantic-search", query, options?.category, options?.minPrice, options?.maxPrice],
    enabled: Boolean(query.trim()) && (options?.enabled ?? true),
    queryFn: async () => {
      const qs = new URLSearchParams({ q: query.trim(), limit: "20", minScore: "0.25" });
      if (options?.category && options.category !== "all") qs.set("category", options.category);
      if (options?.minPrice !== undefined) qs.set("minPrice", String(options.minPrice));
      if (options?.maxPrice !== undefined) qs.set("maxPrice", String(options.maxPrice));
      const res = await api.get<{ products: Product[] }>(`/search/semantic?${qs.toString()}`);
      return res.products || [];
    },
    staleTime: 30_000,
  });
}

export function useRecommendations(params: {
  productId?: string;
  cartIds?: string[];
  viewedIds?: string[];
  type?: "complementary" | "similar" | "personalized" | "bundle";
  limit?: number;
  enabled?: boolean;
}) {
  return useQuery<Product[]>({
    queryKey: ["recommendations", params],
    enabled: params.enabled ?? true,
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (params.productId) qs.set("productId", params.productId);
      if (params.cartIds?.length) qs.set("cart", params.cartIds.join(","));
      if (params.viewedIds?.length) qs.set("viewed", params.viewedIds.join(","));
      if (params.type) qs.set("type", params.type);
      if (params.limit) qs.set("limit", String(params.limit));
      const res = await api.get<{ products: Product[] }>(`/recommendations?${qs.toString()}`);
      return res.products || [];
    },
    staleTime: 60_000,
  });
}

export function useProductBundle(productId?: string) {
  return useQuery<BundleResponse>({
    queryKey: ["product-bundle", productId],
    enabled: Boolean(productId),
    queryFn: () => api.get<BundleResponse>(`/recommendations/bundle/${productId}`),
    staleTime: 60_000,
  });
}

export function useProductReviews(productId?: string, page = 1) {
  return useQuery<{ reviews: Review[]; pagination: { total: number; page: number; pages: number } }>({
    queryKey: ["reviews", productId, page],
    enabled: Boolean(productId),
    queryFn: () => api.get(`/reviews/product/${productId}?page=${page}&limit=8`),
  });
}

export function useProductQuestions(productId?: string) {
  return useQuery<Question[]>({
    queryKey: ["questions", productId],
    enabled: Boolean(productId),
    queryFn: () => api.get<Question[]>(`/questions/product/${productId}`),
  });
}

export function useVacationMode() {
  return useQuery<VacationSetting | null>({
    queryKey: ["setting", "vacation_mode"],
    queryFn: async () => {
      try {
        return await api.get<VacationSetting | null>("/settings/vacation_mode");
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });
}

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["jobs"],
    queryFn: () => api.get<Job[]>("/jobs"),
    staleTime: 60_000,
  });
}
