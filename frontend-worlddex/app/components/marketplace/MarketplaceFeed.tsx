import React, { useState, useCallback, useMemo, useEffect } from "react";
import {
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useListings } from "../../../database/hooks/useListings";
import { useDownloadUrls } from "../../../src/hooks/useDownloadUrls";
import AuctionListing from "./AuctionListing";
import BuyNowListing from "./BuyNowListing";
import TradeListing from "./TradeListing";
import { Listing, Capture } from "../../../database/types";

// define filter options
const filterOptions = [
  { key: "yourListings", label: "Your listings" },
  { key: "auctions", label: "Auctions" },
  { key: "buyNow", label: "Buy Now" },
  { key: "trades", label: "Trades" },
] as const;

type FilterKey = (typeof filterOptions)[number]["key"];

interface MarketplaceFeedProps {
  onUserPress?: (userId: string) => void;
  onCommentsPress?: (listing: Listing) => void;
  onBidPress?: (listing: Listing) => void;
  onBuyPress?: (listing: Listing) => void;
  onTradePress?: (listing: Listing) => void;
  refreshKey?: number;
  onUserBalanceChanged?: () => void | Promise<void>;
  onRefreshed?: () => void;
}

const MarketplaceFeed: React.FC<MarketplaceFeedProps> = ({
  onUserPress,
  onCommentsPress,
  onBidPress,
  onBuyPress,
  onTradePress,
  refreshKey = 0,
  onUserBalanceChanged,
  onRefreshed,
}) => {
  const { session } = useAuth();
  const currentUserId = session?.user?.id || null;

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const {
    listings,
    totalCount,
    loading,
    refresh: refreshListingsData,
  } = useListings({ status: "active" }, { page, pageSize });

  // images
  const imageKeys = useMemo(() => {
    const keys: string[] = [];
    listings.forEach((listing) =>
      listing.listing_items?.forEach((item) => {
        if (item.captures?.image_key) keys.push(item.captures.image_key);
      })
    );
    return keys;
  }, [listings]);
  const { items: imageUrlItems, loading: imageUrlsLoading } =
    useDownloadUrls(imageKeys);
  const imageUrlMap = useMemo(
    () => Object.fromEntries(imageUrlItems.map((i) => [i.key, i.downloadUrl])),
    [imageUrlItems]
  );

  // filters
  const [filters, setFilters] = useState<Record<FilterKey, boolean>>({
    yourListings: true,
    auctions: true,
    buyNow: true,
    trades: true,
  });
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // apply filters
  const [localListings, setLocalListings] = useState<Listing[]>([]);
  useEffect(() => {
    const onlyYour =
      filters.yourListings &&
      !filters.auctions &&
      !filters.buyNow &&
      !filters.trades;

    if (onlyYour) {
      // show all of the user's listings, any type
      setLocalListings(listings.filter((l) => l.seller_id === currentUserId));
    } else {
      setLocalListings(
        listings.filter((l) => {
          // hide user's listings if they untoggle "Your listings"
          if (!filters.yourListings && l.seller_id === currentUserId) return false;
          // hide auctions if untoggled
          if (!filters.auctions && l.listing_type === "auction") return false;
          if (!filters.buyNow && l.listing_type === "buy-now") return false;
          if (!filters.trades && l.listing_type === "trade") return false;
          return true;
        })
      );
    }
  }, [listings, filters, currentUserId]);

  // refresh on key change
  useEffect(() => {
    setPage(1);
    refreshListingsData();
  }, [refreshKey, refreshListingsData]);

  // handlers
  const handleRefresh = useCallback(() => {
    setPage(1);
    refreshListingsData();
    onRefreshed?.();
  }, [refreshListingsData, onRefreshed]);

  const hasMore = listings.length < totalCount;
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) setPage((p) => p + 1);
  }, [loading, hasMore]);

  const handleListingDeleted = (listingId: string) => {
    setLocalListings((prev) => prev.filter((l) => l.id !== listingId));
    setPage(1);
    refreshListingsData();
  };

  const renderListing = ({ item }: { item: Listing }) => {
    const captures = item.listing_items?.map((i) => i.captures) || [];
    const imageUrls = captures.map((c: Capture) =>
      c.image_key ? imageUrlMap[c.image_key] : null
    );
    const commonProps = {
      listing: item,
      captures,
      onUserPress,
      onCommentsPress,
      imageUrls,
      imageLoading: imageUrlsLoading,
      profileLoading: false,
      onListingChanged: () => handleListingDeleted(item.id),
      onUserBalanceChanged,
    };
    switch (item.listing_type) {
      case "auction":
        return <AuctionListing {...commonProps} onBidPress={onBidPress} />;
      case "buy-now":
        return <BuyNowListing {...commonProps} onBuyPress={onBuyPress} />;
      case "trade":
        return <TradeListing {...commonProps} onTradePress={onTradePress} />;
      default:
        return null;
    }
  };

  const renderFooter = () =>
    hasMore ? (
      <View className="py-4 items-center">
        <ActivityIndicator size="small" color="#3B82F6" />
      </View>
    ) : null;

  const renderEmpty = () =>
    !loading ? (
      <View className="py-20 items-center">
        <Text className="text-text-secondary mt-4 text-lg font-lexend-regular text-center">
          No active listings found
        </Text>
        <Text className="text-text-secondary mt-2 text-center max-w-xs font-lexend-regular">
          Be the first to list your captures for sale or trade!
        </Text>
      </View>
    ) : null;

  // expandable filter header
  const FilterHeader = () => (
    <View className="px-4 mb-2">
      <View className="flex-row items-center mb-2">
        <TouchableOpacity onPress={() => setShowFiltersPanel(!showFiltersPanel)}>
          <Ionicons name="filter-outline" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text className="ml-2 text-text-primary font-lexend-medium text-lg">
          Filters
        </Text>
      </View>
      {showFiltersPanel && (
        <View className="flex-row flex-wrap">
          {filterOptions.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              className="mr-4 mb-2 flex-row items-center"
              onPress={() => setFilters((f) => ({ ...f, [key]: !f[key] }))}
            >
              <Ionicons
                name={filters[key] ? "checkbox" : "checkbox-outline"}
                size={20}
                color="#374151"
              />
              <Text className="ml-1 text-text-primary font-lexend-regular">
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={localListings}
      keyExtractor={(item) => item.id}
      renderItem={renderListing}
      ListHeaderComponent={<FilterHeader />}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 0,
        paddingBottom: 120,
        flexGrow: localListings.length === 0 ? 1 : undefined,
      }}
      refreshControl={
        <RefreshControl
          refreshing={loading && page === 1}
          onRefresh={handleRefresh}
          colors={["#3B82F6"]}
          tintColor="#3B82F6"
        />
      }
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      ListEmptyComponent={renderEmpty}
    />
  );
};

export default MarketplaceFeed;
