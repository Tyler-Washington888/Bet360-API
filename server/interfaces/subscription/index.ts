export interface UpdateSubscriptionRequest {
  bet360Email: string;
  sportsbook: "betwiz" | "winningedge";
  isSubscribed: boolean;
}

export interface SubscriptionStatusResponse {
  bet360Email: string;
  sportsbookSubscriptions: {
    betwiz: boolean;
    winningedge: boolean;
  };
}

