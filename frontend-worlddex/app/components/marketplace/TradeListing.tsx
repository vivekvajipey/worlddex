import React from "react";
import { View, Text } from "react-native";
import ListingPost from "./ListingPost";
import { Listing, Capture } from "../../../database/types";
import { useTradeOffers } from "../../../database/hooks/useTradeOffers";

interface TradeListingProps {
  listing: Listing;
  captures: Capture[];
  onUserPress?: (userId: string) => void;
  onCommentsPress?: (listing: Listing) => void;
  imageUrls?: (string | null)[];
  profileImageUrl?: string | null;
  imageLoading?: boolean;
  profileLoading?: boolean;
  onTradePress?: (listing: Listing) => void;
  onListingChanged?: () => void;
  onUserBalanceChanged?: () => void | Promise<void>;
}

const TradeListing: React.FC<TradeListingProps> = ({
  listing,
  captures,
  onUserPress,
  onCommentsPress,
  imageUrls,
  profileImageUrl,
  imageLoading,
  profileLoading,
  onTradePress,
  onListingChanged,
  onUserBalanceChanged
}) => {
  const { tradeOffers, loading: offersLoading } = useTradeOffers(listing.id);

  const renderTradeInfo = () => {
    if (offersLoading) {
      return (
        <View className="mt-2">
          <Text className="text-gray-500 font-lexend-regular">Loading trade offers...</Text>
        </View>
      );
    }

    return (
      <View className="mt-2">
        <Text className="text-gray-600 font-lexend-medium">
          {tradeOffers.length > 0 ? `${tradeOffers.length} trade offers` : "No trade offers yet"}
        </Text>
        <Text className="text-gray-500 font-lexend-regular text-sm">
          Looking for items of similar value
        </Text>
      </View>
    );
  };

  return (
    <ListingPost
      listing={listing}
      captures={captures}
      onUserPress={onUserPress}
      onCommentsPress={onCommentsPress}
      imageUrls={imageUrls}
      profileImageUrl={profileImageUrl}
      imageLoading={imageLoading}
      profileLoading={profileLoading}
      onTradePress={onTradePress}
      onListingChanged={onListingChanged}
      onUserBalanceChanged={onUserBalanceChanged}
    >
      {renderTradeInfo()}
    </ListingPost>
  );
};

export default TradeListing; 