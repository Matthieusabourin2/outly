
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_audience": {
                  Row: {
                    "friend_id": string,"user_id": string
                  }
                  Insert: {
                    "friend_id": string,"user_id": string
                  }
                  Update: {
                    "friend_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_audience_friend_id_fkey"
      columns: ["friend_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_audience_friend_id_fkey"
      columns: ["friend_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_audience_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_audience_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"activity_posts": {
                  Row: {
                    "created_at": string,"google_place_id": string | null,"id": string,"night": string,"user_id": string,"venue_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"google_place_id"?: string | null,"id"?: string,"night": string,"user_id": string,"venue_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"google_place_id"?: string | null,"id"?: string,"night"?: string,"user_id"?: string,"venue_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_posts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_posts_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_posts_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_conversations": {
                  Row: {
                    "created_at": string,"id": string,"surface": Database["public"]['Enums']["ai_surface"],"user_id": string,"venue_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"surface": Database["public"]['Enums']["ai_surface"],"user_id": string,"venue_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"surface"?: Database["public"]['Enums']["ai_surface"],"user_id"?: string,"venue_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_conversations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_conversations_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_conversations_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"ai_messages": {
                  Row: {
                    "content": NonNullable<Json>,"conversation_id": string,"created_at": string,"id": number,"model": string | null,"role": string,"tokens_in": number | null,"tokens_out": number | null
                  }
                  Insert: {
                    "content": NonNullable<Json>,"conversation_id": string,"created_at"?: string,"id"?: never,"model"?: string | null,"role": string,"tokens_in"?: number | null,"tokens_out"?: number | null
                  }
                  Update: {
                    "content"?: NonNullable<Json>,"conversation_id"?: string,"created_at"?: string,"id"?: never,"model"?: string | null,"role"?: string,"tokens_in"?: number | null,"tokens_out"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "ai_conversations"
      referencedColumns: ["id"]
    }
                  ]
                },"audit_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"created_at": string,"details": NonNullable<Json>,"id": number,"target": string | null,"target_id": string | null
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target"?: string | null,"target_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"created_at"?: string,"details"?: NonNullable<Json>,"id"?: never,"target"?: string | null,"target_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "audit_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"blocks": {
                  Row: {
                    "blocked_id": string,"blocker_id": string,"created_at": string
                  }
                  Insert: {
                    "blocked_id": string,"blocker_id": string,"created_at"?: string
                  }
                  Update: {
                    "blocked_id"?: string,"blocker_id"?: string,"created_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocked_id_fkey"
      columns: ["blocked_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "blocks_blocker_id_fkey"
      columns: ["blocker_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bookings": {
                  Row: {
                    "attendee_visibility": Database["public"]['Enums']["attendee_visibility"],"checked_in_at": string | null,"checked_in_by": string | null,"created_at": string,"decided_at": string | null,"decided_by": string | null,"expires_at": string | null,"guest_list_id": string | null,"id": string,"party_size": number,"qr_nonce": string,"special_requests": string | null,"squad_id": string | null,"starts_at": string,"status": Database["public"]['Enums']["booking_status"],"type": Database["public"]['Enums']["booking_type"],"updated_at": string,"user_id": string,"venue_id": string
                  }
                  Insert: {
                    "attendee_visibility"?: Database["public"]['Enums']["attendee_visibility"],"checked_in_at"?: string | null,"checked_in_by"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"expires_at"?: string | null,"guest_list_id"?: string | null,"id"?: string,"party_size": number,"qr_nonce"?: string,"special_requests"?: string | null,"squad_id"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["booking_status"],"type": Database["public"]['Enums']["booking_type"],"updated_at"?: string,"user_id": string,"venue_id": string
                  }
                  Update: {
                    "attendee_visibility"?: Database["public"]['Enums']["attendee_visibility"],"checked_in_at"?: string | null,"checked_in_by"?: string | null,"created_at"?: string,"decided_at"?: string | null,"decided_by"?: string | null,"expires_at"?: string | null,"guest_list_id"?: string | null,"id"?: string,"party_size"?: number,"qr_nonce"?: string,"special_requests"?: string | null,"squad_id"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["booking_status"],"type"?: Database["public"]['Enums']["booking_type"],"updated_at"?: string,"user_id"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "bookings_checked_in_by_fkey"
      columns: ["checked_in_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_checked_in_by_fkey"
      columns: ["checked_in_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_decided_by_fkey"
      columns: ["decided_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_guest_list_id_fkey"
      columns: ["guest_list_id"]
isOneToOne: false
      referencedRelation: "guest_list_usage"
      referencedColumns: ["guest_list_id"]
    },{
      foreignKeyName: "bookings_guest_list_id_fkey"
      columns: ["guest_list_id"]
isOneToOne: false
      referencedRelation: "guest_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_squad_fk"
      columns: ["squad_id"]
isOneToOne: false
      referencedRelation: "squads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bookings_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"campaigns": {
                  Row: {
                    "approved_by": string | null,"body": string,"created_at": string,"created_by": string,"id": string,"involves_alcohol": boolean,"name": string,"scheduled_at": string | null,"segment": NonNullable<Json>,"sent_at": string | null,"status": Database["public"]['Enums']["campaign_status"],"title": string
                  }
                  Insert: {
                    "approved_by"?: string | null,"body": string,"created_at"?: string,"created_by": string,"id"?: string,"involves_alcohol"?: boolean,"name": string,"scheduled_at"?: string | null,"segment"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["campaign_status"],"title": string
                  }
                  Update: {
                    "approved_by"?: string | null,"body"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"involves_alcohol"?: boolean,"name"?: string,"scheduled_at"?: string | null,"segment"?: NonNullable<Json>,"sent_at"?: string | null,"status"?: Database["public"]['Enums']["campaign_status"],"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "campaigns_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaigns_approved_by_fkey"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaigns_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "campaigns_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"deals": {
                  Row: {
                    "categories": (string)[],"created_at": string,"created_by": string | null,"description": string | null,"ends_at": string | null,"id": string,"involves_alcohol": boolean,"is_demo": boolean,"recurrence": string | null,"source": Database["public"]['Enums']["content_source"],"source_url": string | null,"starts_at": string | null,"status": Database["public"]['Enums']["content_status"],"title": string,"updated_at": string,"venue_id": string,"verified_at": string | null
                  }
                  Insert: {
                    "categories"?: (string)[],"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"involves_alcohol"?: boolean,"is_demo"?: boolean,"recurrence"?: string | null,"source": Database["public"]['Enums']["content_source"],"source_url"?: string | null,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"title": string,"updated_at"?: string,"venue_id": string,"verified_at"?: string | null
                  }
                  Update: {
                    "categories"?: (string)[],"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"involves_alcohol"?: boolean,"is_demo"?: boolean,"recurrence"?: string | null,"source"?: Database["public"]['Enums']["content_source"],"source_url"?: string | null,"starts_at"?: string | null,"status"?: Database["public"]['Enums']["content_status"],"title"?: string,"updated_at"?: string,"venue_id"?: string,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deals_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deals_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"event_sets": {
                  Row: {
                    "artist_name": string,"created_at": string,"ends_at": string | null,"event_id": string,"id": string,"sort": number,"stage": string | null,"starts_at": string | null
                  }
                  Insert: {
                    "artist_name": string,"created_at"?: string,"ends_at"?: string | null,"event_id": string,"id"?: string,"sort"?: number,"stage"?: string | null,"starts_at"?: string | null
                  }
                  Update: {
                    "artist_name"?: string,"created_at"?: string,"ends_at"?: string | null,"event_id"?: string,"id"?: string,"sort"?: number,"stage"?: string | null,"starts_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "event_sets_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "cover_image_path": string | null,"created_at": string,"created_by": string | null,"description": string | null,"ends_at": string | null,"id": string,"is_demo": boolean,"price_cents": number | null,"source": Database["public"]['Enums']["content_source"],"source_url": string | null,"starts_at": string,"status": Database["public"]['Enums']["content_status"],"tags": (string)[],"title": string,"updated_at": string,"venue_id": string,"verified_at": string | null
                  }
                  Insert: {
                    "cover_image_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"is_demo"?: boolean,"price_cents"?: number | null,"source": Database["public"]['Enums']["content_source"],"source_url"?: string | null,"starts_at": string,"status"?: Database["public"]['Enums']["content_status"],"tags"?: (string)[],"title": string,"updated_at"?: string,"venue_id": string,"verified_at"?: string | null
                  }
                  Update: {
                    "cover_image_path"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"ends_at"?: string | null,"id"?: string,"is_demo"?: boolean,"price_cents"?: number | null,"source"?: Database["public"]['Enums']["content_source"],"source_url"?: string | null,"starts_at"?: string,"status"?: Database["public"]['Enums']["content_status"],"tags"?: (string)[],"title"?: string,"updated_at"?: string,"venue_id"?: string,"verified_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"friendships": {
                  Row: {
                    "accepted_at": string | null,"addressee_id": string,"created_at": string,"requester_id": string,"status": Database["public"]['Enums']["friendship_status"]
                  }
                  Insert: {
                    "accepted_at"?: string | null,"addressee_id": string,"created_at"?: string,"requester_id": string,"status"?: Database["public"]['Enums']["friendship_status"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"addressee_id"?: string,"created_at"?: string,"requester_id"?: string,"status"?: Database["public"]['Enums']["friendship_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_addressee_id_fkey"
      columns: ["addressee_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "friendships_requester_id_fkey"
      columns: ["requester_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"guest_lists": {
                  Row: {
                    "capacity": number,"closes_at": string | null,"created_at": string,"created_by": string | null,"event_id": string | null,"id": string,"night": string,"note": string | null,"venue_id": string
                  }
                  Insert: {
                    "capacity": number,"closes_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"id"?: string,"night": string,"note"?: string | null,"venue_id": string
                  }
                  Update: {
                    "capacity"?: number,"closes_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"event_id"?: string | null,"id"?: string,"night"?: string,"note"?: string | null,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guest_lists_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guest_lists_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guest_lists_event_id_fkey"
      columns: ["event_id"]
isOneToOne: false
      referencedRelation: "events"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "guest_lists_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"created_at": string,"deleted_at": string | null,"id": string,"sender_id": string,"squad_id": string
                  }
                  Insert: {
                    "body": string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"sender_id": string,"squad_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"deleted_at"?: string | null,"id"?: string,"sender_id"?: string,"squad_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_squad_id_fkey"
      columns: ["squad_id"]
isOneToOne: false
      referencedRelation: "squads"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"id": string,"payload": NonNullable<Json>,"read_at": string | null,"title": string,"type": string,"user_id": string
                  }
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"title": string,"type": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"read_at"?: string | null,"title"?: string,"type"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"offer_redemptions": {
                  Row: {
                    "booking_id": string,"created_at": string,"deal_id": string,"id": number,"redeemed_by": string | null,"user_id": string,"venue_id": string
                  }
                  Insert: {
                    "booking_id": string,"created_at"?: string,"deal_id": string,"id"?: never,"redeemed_by"?: string | null,"user_id": string,"venue_id": string
                  }
                  Update: {
                    "booking_id"?: string,"created_at"?: string,"deal_id"?: string,"id"?: never,"redeemed_by"?: string | null,"user_id"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "offer_redemptions_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_redemptions_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_redemptions_redeemed_by_fkey"
      columns: ["redeemed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_redemptions_redeemed_by_fkey"
      columns: ["redeemed_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_redemptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_redemptions_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "offer_redemptions_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"outly_staff": {
                  Row: {
                    "created_at": string,"role": Database["public"]['Enums']["outly_role"],"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"role": Database["public"]['Enums']["outly_role"],"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: Database["public"]['Enums']["outly_role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "outly_staff_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "outly_staff_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_requests": {
                  Row: {
                    "amount_cents": number,"commission_rate": number,"created_at": string,"created_by": string,"currency": string,"expires_at": string,"id": string,"payer_id": string | null,"qr_nonce": string,"split_deadline": string | null,"status": Database["public"]['Enums']["payment_req_status"],"table_label": string | null,"updated_at": string,"venue_id": string
                  }
                  Insert: {
                    "amount_cents": number,"commission_rate": number,"created_at"?: string,"created_by": string,"currency"?: string,"expires_at"?: string,"id"?: string,"payer_id"?: string | null,"qr_nonce"?: string,"split_deadline"?: string | null,"status"?: Database["public"]['Enums']["payment_req_status"],"table_label"?: string | null,"updated_at"?: string,"venue_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"commission_rate"?: number,"created_at"?: string,"created_by"?: string,"currency"?: string,"expires_at"?: string,"id"?: string,"payer_id"?: string | null,"qr_nonce"?: string,"split_deadline"?: string | null,"status"?: Database["public"]['Enums']["payment_req_status"],"table_label"?: string | null,"updated_at"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_requests_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_requests_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_requests_payer_id_fkey"
      columns: ["payer_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_requests_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"payment_shares": {
                  Row: {
                    "amount_cents": number,"created_at": string,"id": string,"paid_at": string | null,"payment_request_id": string,"status": Database["public"]['Enums']["share_status"],"stripe_payment_intent_id": string | null,"user_id": string
                  }
                  Insert: {
                    "amount_cents": number,"created_at"?: string,"id"?: string,"paid_at"?: string | null,"payment_request_id": string,"status"?: Database["public"]['Enums']["share_status"],"stripe_payment_intent_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "amount_cents"?: number,"created_at"?: string,"id"?: string,"paid_at"?: string | null,"payment_request_id"?: string,"status"?: Database["public"]['Enums']["share_status"],"stripe_payment_intent_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payment_shares_payment_request_id_fkey"
      columns: ["payment_request_id"]
isOneToOne: false
      referencedRelation: "payment_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_shares_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payment_shares_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"place_cache": {
                  Row: {
                    "fetched_at": string,"google_place_id": string,"lat": number,"lng": number
                  }
                  Insert: {
                    "fetched_at"?: string,"google_place_id": string,"lat": number,"lng": number
                  }
                  Update: {
                    "fetched_at"?: string,"google_place_id"?: string,"lat"?: number,"lng"?: number
                  }
                  Relationships: [
                    
                  ]
                },"points_ledger": {
                  Row: {
                    "created_at": string,"delta": number,"id": number,"reason": string,"ref_id": string | null,"ref_type": string | null,"user_id": string
                  }
                  Insert: {
                    "created_at"?: string,"delta": number,"id"?: never,"reason": string,"ref_id"?: string | null,"ref_type"?: string | null,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"delta"?: number,"id"?: never,"reason"?: string,"ref_id"?: string | null,"ref_type"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "points_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "alcohol_promos_opt_in": boolean,"avatar_url": string | null,"created_at": string,"date_of_birth": string,"display_name": string,"friend_activity_visibility": Database["public"]['Enums']["activity_visibility"],"id": string,"id_verified_at": string | null,"no_show_count": number,"preferences": NonNullable<Json>,"referral_code": string,"referred_by": string | null,"suspended_at": string | null,"tier": Database["public"]['Enums']["tier_name"],"updated_at": string,"username": string
                  }
                  Insert: {
                    "alcohol_promos_opt_in"?: boolean,"avatar_url"?: string | null,"created_at"?: string,"date_of_birth": string,"display_name": string,"friend_activity_visibility"?: Database["public"]['Enums']["activity_visibility"],"id": string,"id_verified_at"?: string | null,"no_show_count"?: number,"preferences"?: NonNullable<Json>,"referral_code"?: string,"referred_by"?: string | null,"suspended_at"?: string | null,"tier"?: Database["public"]['Enums']["tier_name"],"updated_at"?: string,"username": string
                  }
                  Update: {
                    "alcohol_promos_opt_in"?: boolean,"avatar_url"?: string | null,"created_at"?: string,"date_of_birth"?: string,"display_name"?: string,"friend_activity_visibility"?: Database["public"]['Enums']["activity_visibility"],"id"?: string,"id_verified_at"?: string | null,"no_show_count"?: number,"preferences"?: NonNullable<Json>,"referral_code"?: string,"referred_by"?: string | null,"suspended_at"?: string | null,"tier"?: Database["public"]['Enums']["tier_name"],"updated_at"?: string,"username"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_referred_by_fkey"
      columns: ["referred_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "profiles_referred_by_fkey"
      columns: ["referred_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"push_tokens": {
                  Row: {
                    "app": string,"created_at": string,"platform": string,"token": string,"user_id": string
                  }
                  Insert: {
                    "app": string,"created_at"?: string,"platform": string,"token": string,"user_id": string
                  }
                  Update: {
                    "app"?: string,"created_at"?: string,"platform"?: string,"token"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "push_tokens_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"reports": {
                  Row: {
                    "created_at": string,"handled_at": string | null,"handled_by": string | null,"id": string,"message_id": string | null,"reason": string,"reported_user_id": string | null,"reporter_id": string,"status": Database["public"]['Enums']["report_status"]
                  }
                  Insert: {
                    "created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"message_id"?: string | null,"reason": string,"reported_user_id"?: string | null,"reporter_id": string,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Update: {
                    "created_at"?: string,"handled_at"?: string | null,"handled_by"?: string | null,"id"?: string,"message_id"?: string | null,"reason"?: string,"reported_user_id"?: string | null,"reporter_id"?: string,"status"?: Database["public"]['Enums']["report_status"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "reports_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_handled_by_fkey"
      columns: ["handled_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_message_id_fkey"
      columns: ["message_id"]
isOneToOne: false
      referencedRelation: "messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reported_user_id_fkey"
      columns: ["reported_user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reported_user_id_fkey"
      columns: ["reported_user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "reports_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"saved_venues": {
                  Row: {
                    "created_at": string,"google_place_id": string | null,"user_id": string,"venue_id": string | null
                  }
                  Insert: {
                    "created_at"?: string,"google_place_id"?: string | null,"user_id": string,"venue_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"google_place_id"?: string | null,"user_id"?: string,"venue_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "saved_venues_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_venues_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "saved_venues_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"scan_events": {
                  Row: {
                    "booking_id": string | null,"created_at": string,"deal_id": string | null,"guest_list_id": string | null,"id": number,"kind": string,"result": Database["public"]['Enums']["scan_result"],"scanned_by": string,"venue_id": string
                  }
                  Insert: {
                    "booking_id"?: string | null,"created_at"?: string,"deal_id"?: string | null,"guest_list_id"?: string | null,"id"?: never,"kind"?: string,"result": Database["public"]['Enums']["scan_result"],"scanned_by": string,"venue_id": string
                  }
                  Update: {
                    "booking_id"?: string | null,"created_at"?: string,"deal_id"?: string | null,"guest_list_id"?: string | null,"id"?: never,"kind"?: string,"result"?: Database["public"]['Enums']["scan_result"],"scanned_by"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "scan_events_booking_id_fkey"
      columns: ["booking_id"]
isOneToOne: false
      referencedRelation: "bookings"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scan_events_deal_id_fkey"
      columns: ["deal_id"]
isOneToOne: false
      referencedRelation: "deals"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scan_events_guest_list_id_fkey"
      columns: ["guest_list_id"]
isOneToOne: false
      referencedRelation: "guest_list_usage"
      referencedColumns: ["guest_list_id"]
    },{
      foreignKeyName: "scan_events_guest_list_id_fkey"
      columns: ["guest_list_id"]
isOneToOne: false
      referencedRelation: "guest_lists"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scan_events_scanned_by_fkey"
      columns: ["scanned_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scan_events_scanned_by_fkey"
      columns: ["scanned_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "scan_events_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"squad_candidates": {
                  Row: {
                    "added_by": string,"created_at": string,"google_place_id": string | null,"id": string,"note": string | null,"squad_id": string,"venue_id": string | null
                  }
                  Insert: {
                    "added_by": string,"created_at"?: string,"google_place_id"?: string | null,"id"?: string,"note"?: string | null,"squad_id": string,"venue_id"?: string | null
                  }
                  Update: {
                    "added_by"?: string,"created_at"?: string,"google_place_id"?: string | null,"id"?: string,"note"?: string | null,"squad_id"?: string,"venue_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "squad_candidates_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_candidates_added_by_fkey"
      columns: ["added_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_candidates_squad_id_fkey"
      columns: ["squad_id"]
isOneToOne: false
      referencedRelation: "squads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_candidates_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"squad_members": {
                  Row: {
                    "is_admin": boolean,"joined_at": string,"squad_id": string,"user_id": string
                  }
                  Insert: {
                    "is_admin"?: boolean,"joined_at"?: string,"squad_id": string,"user_id": string
                  }
                  Update: {
                    "is_admin"?: boolean,"joined_at"?: string,"squad_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "squad_members_squad_id_fkey"
      columns: ["squad_id"]
isOneToOne: false
      referencedRelation: "squads"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_members_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"squad_votes": {
                  Row: {
                    "candidate_id": string,"created_at": string,"user_id": string
                  }
                  Insert: {
                    "candidate_id": string,"created_at"?: string,"user_id": string
                  }
                  Update: {
                    "candidate_id"?: string,"created_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "squad_votes_candidate_id_fkey"
      columns: ["candidate_id"]
isOneToOne: false
      referencedRelation: "squad_candidates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squad_votes_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"squads": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"name": string,"plan_date": string | null
                  }
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"name": string,"plan_date"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string,"plan_date"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "squads_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "squads_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "id": string,"payload": NonNullable<Json>,"received_at": string,"type": string
                  }
                  Insert: {
                    "id": string,"payload": NonNullable<Json>,"received_at"?: string,"type": string
                  }
                  Update: {
                    "id"?: string,"payload"?: NonNullable<Json>,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                },"venue_memberships": {
                  Row: {
                    "created_at": string,"invited_by": string | null,"role": Database["public"]['Enums']["venue_role"],"user_id": string,"venue_id": string
                  }
                  Insert: {
                    "created_at"?: string,"invited_by"?: string | null,"role": Database["public"]['Enums']["venue_role"],"user_id": string,"venue_id": string
                  }
                  Update: {
                    "created_at"?: string,"invited_by"?: string | null,"role"?: Database["public"]['Enums']["venue_role"],"user_id"?: string,"venue_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "venue_memberships_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venue_memberships_invited_by_fkey"
      columns: ["invited_by"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venue_memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venue_memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "venue_memberships_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"venues": {
                  Row: {
                    "address": string | null,"booking_commission_cents": number,"booking_request_ttl_minutes": number,"categories": (string)[],"commission_rate": number,"cover_image_path": string | null,"created_at": string,"default_guest_list_capacity": number,"description": string | null,"google_place_id": string | null,"id": string,"instant_booking_enabled": boolean,"is_demo": boolean,"lat": number | null,"lng": number | null,"name": string | null,"partner_status": Database["public"]['Enums']["partner_status"],"stripe_account_id": string | null,"updated_at": string,"vibe_tags": (string)[]
                  }
                  Insert: {
                    "address"?: string | null,"booking_commission_cents"?: number,"booking_request_ttl_minutes"?: number,"categories"?: (string)[],"commission_rate"?: number,"cover_image_path"?: string | null,"created_at"?: string,"default_guest_list_capacity"?: number,"description"?: string | null,"google_place_id"?: string | null,"id"?: string,"instant_booking_enabled"?: boolean,"is_demo"?: boolean,"lat"?: number | null,"lng"?: number | null,"name"?: string | null,"partner_status"?: Database["public"]['Enums']["partner_status"],"stripe_account_id"?: string | null,"updated_at"?: string,"vibe_tags"?: (string)[]
                  }
                  Update: {
                    "address"?: string | null,"booking_commission_cents"?: number,"booking_request_ttl_minutes"?: number,"categories"?: (string)[],"commission_rate"?: number,"cover_image_path"?: string | null,"created_at"?: string,"default_guest_list_capacity"?: number,"description"?: string | null,"google_place_id"?: string | null,"id"?: string,"instant_booking_enabled"?: boolean,"is_demo"?: boolean,"lat"?: number | null,"lng"?: number | null,"name"?: string | null,"partner_status"?: Database["public"]['Enums']["partner_status"],"stripe_account_id"?: string | null,"updated_at"?: string,"vibe_tags"?: (string)[]
                  }
                  Relationships: [
                    
                  ]
                },"vouchers": {
                  Row: {
                    "code": string,"created_at": string,"expires_at": string,"id": string,"points_cost": number,"redeemed_at": string | null,"redeemed_venue_id": string | null,"user_id": string,"value_cents": number
                  }
                  Insert: {
                    "code"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"points_cost": number,"redeemed_at"?: string | null,"redeemed_venue_id"?: string | null,"user_id": string,"value_cents": number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"expires_at"?: string,"id"?: string,"points_cost"?: number,"redeemed_at"?: string | null,"redeemed_venue_id"?: string | null,"user_id"?: string,"value_cents"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "vouchers_redeemed_venue_id_fkey"
      columns: ["redeemed_venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vouchers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "vouchers_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "guest_list_usage": {
                  Row: {
                    "capacity": number | null,"guest_list_id": string | null,"night": string | null,"used": number | null,"venue_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "guest_lists_venue_id_fkey"
      columns: ["venue_id"]
isOneToOne: false
      referencedRelation: "venues"
      referencedColumns: ["id"]
    }
                  ]
                },"public_profiles": {
                  Row: {
                    "avatar_url": string | null,"display_name": string | null,"id": string | null,"referral_code": string | null,"username": string | null
                  }
                  Insert: {
                           "avatar_url"?: string | null,"display_name"?: string | null,"id"?: string | null,"referral_code"?: string | null,"username"?: string | null
                         }
                        Update: {
                           "avatar_url"?: string | null,"display_name"?: string | null,"id"?: string | null,"referral_code"?: string | null,"username"?: string | null
                         }
                        Relationships: [
                    
                  ]
                },"user_points": {
                  Row: {
                    "balance": number | null,"earned_12m": number | null,"user_id": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "points_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_ledger_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "public_profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "are_friends":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"can_see_activity":
{ Args: { "owner": string }; Returns: boolean
                           },
"can_see_venue_stats":
{ Args: { "v": string }; Returns: boolean
                           },
"cancel_booking":
{ Args: { "p_booking_id": string }; Returns: {
              "attendee_visibility": Database["public"]['Enums']["attendee_visibility"],
"checked_in_at": string | null,
"checked_in_by": string | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"expires_at": string | null,
"guest_list_id": string | null,
"id": string,
"party_size": number,
"qr_nonce": string,
"special_requests": string | null,
"squad_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"type": Database["public"]['Enums']["booking_type"],
"updated_at": string,
"user_id": string,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"check_in":
{ Args: { "p_booking_id": string,"p_nonce": string }; Returns: {
              "attendee_visibility": Database["public"]['Enums']["attendee_visibility"],
"checked_in_at": string | null,
"checked_in_by": string | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"expires_at": string | null,
"guest_list_id": string | null,
"id": string,
"party_size": number,
"qr_nonce": string,
"special_requests": string | null,
"squad_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"type": Database["public"]['Enums']["booking_type"],
"updated_at": string,
"user_id": string,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"content_visible":
{ Args: { "src": Database["public"]['Enums']["content_source"],"st": Database["public"]['Enums']["content_status"],"verified": string }; Returns: boolean
                           },
"decide_booking":
{ Args: { "p_accept": boolean,"p_booking_id": string }; Returns: {
              "attendee_visibility": Database["public"]['Enums']["attendee_visibility"],
"checked_in_at": string | null,
"checked_in_by": string | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"expires_at": string | null,
"guest_list_id": string | null,
"id": string,
"party_size": number,
"qr_nonce": string,
"special_requests": string | null,
"squad_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"type": Database["public"]['Enums']["booking_type"],
"updated_at": string,
"user_id": string,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"event_attendees":
{ Args: { "p_guest_list_id": string }; Returns: {
              "user_id": string,"username": string
            }[]
                           },
"expire_and_no_show":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"guest_list_stats":
{ Args: { "p_guest_list_id": string }; Returns: {
              "capacity": number,"joined": number,"remaining": number
            }[]
                           },
"has_venue_role":
{ Args: { "roles": (Database["public"]['Enums']["venue_role"])[],"v": string }; Returns: boolean
                           },
"is_blocked_between":
{ Args: { "a": string,"b": string }; Returns: boolean
                           },
"is_outly":
{ Args: { "roles"?: (Database["public"]['Enums']["outly_role"])[] }; Returns: boolean
                           },
"is_partner_venue":
{ Args: { "v": string }; Returns: boolean
                           },
"is_payment_participant":
{ Args: { "pr": string }; Returns: boolean
                           },
"is_payment_venue_member":
{ Args: { "pr": string }; Returns: boolean
                           },
"is_squad_admin":
{ Args: { "s": string }; Returns: boolean
                           },
"is_squad_member":
{ Args: { "s": string }; Returns: boolean
                           },
"is_suspended":
{ Args: { "u": string }; Returns: boolean
                           },
"is_venue_member":
{ Args: { "v": string }; Returns: boolean
                           },
"join_event_list":
{ Args: { "p_guest_list_id": string,"p_visibility"?: Database["public"]['Enums']["attendee_visibility"] }; Returns: {
              "attendee_visibility": Database["public"]['Enums']["attendee_visibility"],
"checked_in_at": string | null,
"checked_in_by": string | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"expires_at": string | null,
"guest_list_id": string | null,
"id": string,
"party_size": number,
"qr_nonce": string,
"special_requests": string | null,
"squad_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"type": Database["public"]['Enums']["booking_type"],
"updated_at": string,
"user_id": string,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"join_guest_list":
{ Args: { "p_guest_list_id": string,"p_party_size": number,"p_squad_id"?: string }; Returns: {
              "attendee_visibility": Database["public"]['Enums']["attendee_visibility"],
"checked_in_at": string | null,
"checked_in_by": string | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"expires_at": string | null,
"guest_list_id": string | null,
"id": string,
"party_size": number,
"qr_nonce": string,
"special_requests": string | null,
"squad_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"type": Database["public"]['Enums']["booking_type"],
"updated_at": string,
"user_id": string,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"parse_pass_code":
{ Args: { "p_code": string }; Returns: Record<string, unknown>
                           },
"recent_scans":
{ Args: { "p_limit"?: number,"p_venue_id": string }; Returns: {
              "created_at": string,"id": number,"kind": string,"result": Database["public"]['Enums']["scan_result"],"username": string
            }[]
                           },
"redeem_offer":
{ Args: { "p_code": string,"p_deal_id": string,"p_venue_id": string }; Returns: {
              "result": Database["public"]['Enums']["scan_result"],"username": string
            }[]
                           },
"request_table":
{ Args: { "p_note"?: string,"p_party_size": number,"p_squad_id"?: string,"p_starts_at": string,"p_venue_id": string }; Returns: {
              "attendee_visibility": Database["public"]['Enums']["attendee_visibility"],
"checked_in_at": string | null,
"checked_in_by": string | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"expires_at": string | null,
"guest_list_id": string | null,
"id": string,
"party_size": number,
"qr_nonce": string,
"special_requests": string | null,
"squad_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"type": Database["public"]['Enums']["booking_type"],
"updated_at": string,
"user_id": string,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"scan_pass":
{ Args: { "p_code": string,"p_venue_id": string }; Returns: {
              "booking_id": string,"checked_in_at": string,"result": Database["public"]['Enums']["scan_result"],"username": string
            }[]
                           },
"set_attendee_visibility":
{ Args: { "p_booking_id": string,"p_visibility": Database["public"]['Enums']["attendee_visibility"] }; Returns: {
              "attendee_visibility": Database["public"]['Enums']["attendee_visibility"],
"checked_in_at": string | null,
"checked_in_by": string | null,
"created_at": string,
"decided_at": string | null,
"decided_by": string | null,
"expires_at": string | null,
"guest_list_id": string | null,
"id": string,
"party_size": number,
"qr_nonce": string,
"special_requests": string | null,
"squad_id": string | null,
"starts_at": string,
"status": Database["public"]['Enums']["booking_status"],
"type": Database["public"]['Enums']["booking_type"],
"updated_at": string,
"user_id": string,
"venue_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "bookings"
        isOneToOne: true
        isSetofReturn: false
      } },
"sydney_night":
{ Args: { "ts": string }; Returns: string
                           },
"venue_activity":
{ Args: { "p_bucket_minutes"?: number,"p_guest_list_id": string }; Returns: {
              "bucket_start": string,"check_ins": number,"joins": number,"scans_failed": number
            }[]
                           },
"venue_live_stats":
{ Args: { "p_night"?: string,"p_venue_id": string }; Returns: {
              "capacity": number,"checked_in": number,"classic_count": number,"ghost_count": number,"guest_list_id": string,"joined": number,"last_scan_at": string,"scans_failed": number,"scans_ok": number
            }[]
                           }
          }
          Enums: {
            "activity_visibility": "off"|"selected","ai_surface": "customer"|"partner"|"admin","attendee_visibility": "ghost"|"classic","booking_status": "pending"|"confirmed"|"declined"|"expired"|"cancelled"|"checked_in"|"no_show","booking_type": "guest_list"|"table_request"|"instant","campaign_status": "draft"|"approved"|"scheduled"|"sent"|"cancelled","content_source": "public_listing"|"outly_partner"|"demo","content_status": "draft"|"pending_review"|"scheduled"|"active"|"expired"|"archived"|"rejected","friendship_status": "pending"|"accepted","outly_role": "outly_admin"|"outly_marketing"|"outly_partnerships"|"outly_events"|"outly_support","partner_status": "listed"|"pending"|"partner"|"inactive","payment_req_status": "open"|"partially_paid"|"paid"|"expired"|"cancelled"|"refunded","report_status": "open"|"actioned"|"dismissed","scan_result": "ok"|"already_used"|"invalid"|"wrong_night"|"not_confirmed"|"forbidden","share_status": "requested"|"paid"|"declined"|"expired"|"refunded","tier_name": "bronze"|"silver"|"gold"|"platinum","venue_role": "venue_owner"|"venue_manager"|"venue_staff"|"venue_door"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "activity_visibility": ["off", "selected"],"ai_surface": ["customer", "partner", "admin"],"attendee_visibility": ["ghost", "classic"],"booking_status": ["pending", "confirmed", "declined", "expired", "cancelled", "checked_in", "no_show"],"booking_type": ["guest_list", "table_request", "instant"],"campaign_status": ["draft", "approved", "scheduled", "sent", "cancelled"],"content_source": ["public_listing", "outly_partner", "demo"],"content_status": ["draft", "pending_review", "scheduled", "active", "expired", "archived", "rejected"],"friendship_status": ["pending", "accepted"],"outly_role": ["outly_admin", "outly_marketing", "outly_partnerships", "outly_events", "outly_support"],"partner_status": ["listed", "pending", "partner", "inactive"],"payment_req_status": ["open", "partially_paid", "paid", "expired", "cancelled", "refunded"],"report_status": ["open", "actioned", "dismissed"],"scan_result": ["ok", "already_used", "invalid", "wrong_night", "not_confirmed", "forbidden"],"share_status": ["requested", "paid", "declined", "expired", "refunded"],"tier_name": ["bronze", "silver", "gold", "platinum"],"venue_role": ["venue_owner", "venue_manager", "venue_staff", "venue_door"]
          }
        }
} as const
