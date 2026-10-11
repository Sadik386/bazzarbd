import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { products as localProducts, categories as localCategories } from "@/data/products";

export interface DbProduct {
  id: string;
  name: string;
  slug: string;
  base_price: number;
  traditional_price: number | null;
  short_description: string | null;
  long_description: string | null;
  tech_specs: Record<string, any>;
  is_featured: boolean | null;
  is_recommended: boolean | null;
  rating_override: number | null;
  review_count_override: number | null;
  activity: string[] | null;
  category_id: string | null;
  categories: { id: string; name: string; slug: string } | null;
  product_variants: {
    id: string;
    variant_name: string;
    price_modifier: number | null;
    sku: string | null;
    stock_level: number | null;
  }[];
  product_images: {
    id: string;
    url: string;
    alt_text: string | null;
    display_order: number | null;
  }[];
}

// Convert local product format to DbProduct format
const convertProduct = (p: any): DbProduct => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  base_price: p.basePrice,
  traditional_price: p.traditionalPrice || null,
  short_description: p.shortDescription,
  long_description: p.longDescription,
  tech_specs: p.techSpecs,
  is_featured: !!p.isFeatured,
  is_recommended: !!p.isRecommended,
  rating_override: null,
  review_count_override: null,
  activity: p.activity,
  category_id: p.category,
  categories: null,
  product_variants: p.variants.map((v: any) => ({
    id: v.id,
    variant_name: v.name,
    price_modifier: v.priceModifier,
    sku: v.sku,
    stock_level: v.stockLevel,
  })),
  product_images: [],
});

export interface PaginatedProducts {
  products: DbProduct[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const useProducts = (
  category?: string, 
  activity?: string, 
  page: number = 1, 
  limit: number = 12, 
  status?: string,
  minPrice?: number,
  maxPrice?: number
) => {
  return useQuery({
    queryKey: ["products", category, activity, page, limit, status, minPrice, maxPrice],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (category && category !== "all") params.set("category", category);
        if (activity) params.set("activity", activity);
        if (status) params.set("status", status);
        if (minPrice !== undefined) params.set("minPrice", minPrice.toString());
        if (maxPrice !== undefined) params.set("maxPrice", maxPrice.toString());
        params.set("page", page.toString());
        params.set("limit", limit.toString());
        const qs = params.toString();
        return await api.get<PaginatedProducts>(`/products${qs ? `?${qs}` : ""}`);
      } catch (error) {
        // Fallback to local data if API fails
        console.warn("API not available, using local product data");
        let filtered = localProducts.map(convertProduct);

        if (category && category !== "all") {
          filtered = filtered.filter(p => p.category_id === category);
        }
        if (activity) {
          filtered = filtered.filter(p => p.activity?.includes(activity));
        }
        if (status === "featured") {
          filtered = filtered.filter(p => p.is_featured);
        }
        if (minPrice !== undefined) {
          filtered = filtered.filter(p => p.base_price >= minPrice);
        }
        if (maxPrice !== undefined) {
          filtered = filtered.filter(p => p.base_price <= maxPrice);
        }

        const total = filtered.length;
        const skip = (page - 1) * limit;
        const paginated = filtered.slice(skip, skip + limit);

        return {
          products: paginated,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
          }
        };
      }
    },
    retry: false,
  });
};

export const useProduct = (slug: string) => {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      try {
        return await api.get<DbProduct>(`/products/${slug}`);
      } catch (error) {
        // Fallback to local data if API fails
        console.warn("API not available, using local product data");
        const product = localProducts.find(p => p.slug === slug);
        if (!product) throw new Error(`Product not found: ${slug}`);
        return convertProduct(product);
      }
    },
    enabled: !!slug,
  });
};

export const useCategories = () => {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      try {
        return await api.get<{ id: string; name: string; slug: string; description: string; image_url: string }[]>("/categories");
      } catch (error) {
        // Fallback to local data if API fails
        console.warn("API not available, using local category data");
        return localCategories.map(c => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          description: "",
          image_url: "",
        }));
      }
    },
  });
};
