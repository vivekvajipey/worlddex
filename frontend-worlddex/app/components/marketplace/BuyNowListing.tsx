import React, { useState, useEffect } from "react";
import ListingPost from "./ListingPost";
import BuyNowModal from "./BuyNowModal";
import { Listing, Capture } from "../../../database/types";
import { useAuth } from "../../../src/contexts/AuthContext";
import { usePostHog } from "posthog-react-native";

interface BuyNowListingProps {
  listing: Listing;
  captures: Capture[];
  onUserPress?: (userId: string) => void;
  onCommentsPress?: (listing: Listing) => void;
  imageUrls?: (string | null)[];
  profileImageUrl?: string | null;
  imageLoading?: boolean;
  profileLoading?: boolean;
  onBuyPress?: (listing: Listing) => void;
  onListingChanged?: () => void;
  onUserBalanceChanged?: () => void | Promise<void>;
}

const BuyNowListing: React.FC<BuyNowListingProps> = ({
  listing,
  captures,
  onUserPress,
  onCommentsPress,
  imageUrls,
  profileImageUrl,
  imageLoading,
  profileLoading,
  onBuyPress,
  onListingChanged,
  onUserBalanceChanged
}) => {
  const [showBuyModal, setShowBuyModal] = useState(false);
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog && listing) {
      posthog.capture("marketplace_listing_impression", {
        listingId: listing.id,
        listingType: "buy_now",
        price: listing.price
      });
    }
  }, [posthog, listing]);

  const handleBuyPress = () => {
    if (posthog) {
      posthog.capture("marketplace_purchase_initiated", {
        listingId: listing.id,
        price: listing.price
      });
    }
    
    if (onBuyPress) {
      onBuyPress(listing);
    }
    setShowBuyModal(true);
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
        onBuyPress={handleBuyPress}
        onListingChanged={onListingChanged}
        onUserBalanceChanged={onUserBalanceChanged}
      />

      <BuyNowModal
        visible={showBuyModal}
        onClose={() => setShowBuyModal(false)}
        listing={listing}
        onPurchaseComplete={onListingChanged}
        onUserBalanceChanged={onUserBalanceChanged}
      />
    </>
  );
};

export default BuyNowListing; 