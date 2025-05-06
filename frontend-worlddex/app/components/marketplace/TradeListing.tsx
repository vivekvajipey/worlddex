import React, { useState } from "react";
import ListingPost from "./ListingPost";
import { Listing, Capture } from "../../../database/types";
import TradeModal from "./TradeModal";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useUserCaptures } from "../../../database/hooks/useCaptures";
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
  onListingChanged?: () => void;
  onUserBalanceChanged?: () => void | Promise<void>;
  refreshKey?: number;
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
  onListingChanged,
  onUserBalanceChanged,
  refreshKey
}) => {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const [showTradeModal, setShowTradeModal] = useState(false);
  const { captures: userCaptures } = useUserCaptures(userId || null);
  const { tradeOffers } = useTradeOffers(listing.id, userId || null);

  // Check if user has a pending offer
  const hasPendingOffer = tradeOffers?.some(offer =>
    offer.offerer_id === userId && offer.status === "pending"
  );

  const handleTradePress = () => {
    setShowTradeModal(true);
  };

  const handleTradeDone = () => {
    if (onListingChanged) onListingChanged();
  };

  return (
    <>
      <ListingPost
        listing={listing}
        captures={captures}
        onUserPress={onUserPress}
        onCommentsPress={onCommentsPress}
        imageUrls={imageUrls}
        profileImageUrl={profileImageUrl}
        imageLoading={imageLoading}
        profileLoading={profileLoading}
        onTradePress={handleTradePress}
        onListingChanged={onListingChanged}
        onUserBalanceChanged={onUserBalanceChanged}
        tradeButtonText={hasPendingOffer ? "Update Trade Offer" : "Make Trade Offer"}
        refreshKey={refreshKey}
      />
      <TradeModal
        visible={showTradeModal}
        onClose={() => setShowTradeModal(false)}
        listing={listing}
        userCaptures={userCaptures}
        onTradePlaced={handleTradeDone}
        onListingChanged={handleTradeDone}
      />
    </>
  );
};

export default TradeListing; 