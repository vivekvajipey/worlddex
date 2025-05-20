import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import ListingPost from "./ListingPost";
import BidModal from "./BidModal";
import { Listing, Capture } from "../../../database/types";
import { useBids } from "../../../database/hooks/useBids";
import { useAuth } from "../../../src/contexts/AuthContext";
import { usePostHog } from "posthog-react-native";

interface AuctionListingProps {
  listing: Listing;
  captures: Capture[];
  onUserPress?: (userId: string) => void;
  onCommentsPress?: (listing: Listing) => void;
  imageUrls?: (string | null)[];
  profileImageUrl?: string | null;
  imageLoading?: boolean;
  profileLoading?: boolean;
  onBidPress?: (listing: Listing) => void;
  onListingChanged?: () => void;
  onUserBalanceChanged?: () => void | Promise<void>;
  onPress?: () => void;
  onBid?: () => void;
}

const AuctionListing: React.FC<AuctionListingProps> = ({
  listing,
  captures,
  onUserPress,
  onCommentsPress,
  imageUrls,
  profileImageUrl,
  imageLoading,
  profileLoading,
  onBidPress,
  onListingChanged,
  onUserBalanceChanged,
  onPress,
  onBid
}) => {
  const { session } = useAuth();
  const { highestBid, userBid, loading: bidsLoading, refresh: refreshBids } = useBids(listing.id, session?.user?.id);
  const posthog = usePostHog();
  const [showBidModal, setShowBidModal] = useState(false);

  useEffect(() => {
    if (posthog && listing) {
      posthog.capture("marketplace_listing_impression", {
        listingId: listing.id,
        listingType: "auction"
      });
    }
  }, [posthog, listing]);

  const handleBidPress = () => {
    if (posthog) {
      posthog.capture("marketplace_bid_initiated", {
        listingId: listing.id,
        currentBid: highestBid?.amount || listing.reserve_price
      });
    }
    
    if (onBidPress) {
      onBidPress(listing);
    }
    setShowBidModal(true);
  };

  const handleBidPlaced = () => {
    refreshBids();
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
        onBidPress={handleBidPress}
        onListingChanged={onListingChanged}
        onUserBalanceChanged={onUserBalanceChanged}
      />

      <BidModal
        visible={showBidModal}
        onClose={() => setShowBidModal(false)}
        listing={listing}
        onBidPlaced={handleBidPlaced}
        onUserBalanceChanged={onUserBalanceChanged}
      />
    </>
  );
};

export default AuctionListing; 