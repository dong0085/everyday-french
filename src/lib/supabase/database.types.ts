
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
            "api_keys": {
                  Row: {
                    "auth_tag": string,"base_url": string | null,"ciphertext": string,"created_at": string,"id": string,"iv": string,"key_version": number,"label": string,"last_used_at": string | null,"last4": string,"provider": string,"supports_json_schema": boolean,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_tag": string,"base_url"?: string | null,"ciphertext": string,"created_at"?: string,"id"?: string,"iv": string,"key_version"?: number,"label"?: string,"last_used_at"?: string | null,"last4": string,"provider": string,"supports_json_schema"?: boolean,"user_id": string
                  }
                  Update: {
                    "auth_tag"?: string,"base_url"?: string | null,"ciphertext"?: string,"created_at"?: string,"id"?: string,"iv"?: string,"key_version"?: number,"label"?: string,"last_used_at"?: string | null,"last4"?: string,"provider"?: string,"supports_json_schema"?: boolean,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"attempts": {
                  Row: {
                    "created_at": string,"feedback": Json | null,"id": string,"section_id": string | null,"text": string,"topic_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback"?: Json | null,"id"?: string,"section_id"?: string | null,"text": string,"topic_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"feedback"?: Json | null,"id"?: string,"section_id"?: string | null,"text"?: string,"topic_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attempts_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "topic_sections"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attempts_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"captures": {
                  Row: {
                    "audio_mime": string | null,"audio_path": string | null,"created_at": string,"id": string,"status": string,"text": string,"topic_id": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audio_mime"?: string | null,"audio_path"?: string | null,"created_at"?: string,"id"?: string,"status"?: string,"text"?: string,"topic_id"?: string | null,"user_id": string
                  }
                  Update: {
                    "audio_mime"?: string | null,"audio_path"?: string | null,"created_at"?: string,"id"?: string,"status"?: string,"text"?: string,"topic_id"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"clips": {
                  Row: {
                    "bytes": number | null,"cache_key": string,"created_at": string,"id": string,"model": string,"provider": string,"signed_until": string | null,"signed_url": string | null,"storage_path": string,"text": string,"user_id": string,"voice": string
                  }
                  ComputedFields: never
                  Insert: {
                    "bytes"?: number | null,"cache_key": string,"created_at"?: string,"id"?: string,"model": string,"provider": string,"signed_until"?: string | null,"signed_url"?: string | null,"storage_path": string,"text": string,"user_id": string,"voice": string
                  }
                  Update: {
                    "bytes"?: number | null,"cache_key"?: string,"created_at"?: string,"id"?: string,"model"?: string,"provider"?: string,"signed_until"?: string | null,"signed_url"?: string | null,"storage_path"?: string,"text"?: string,"user_id"?: string,"voice"?: string
                  }
                  Relationships: [
                    
                  ]
                },"heartbeat": {
                  Row: {
                    "beat_at": string,"id": number,"source": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "beat_at"?: string,"id"?: number,"source"?: string | null
                  }
                  Update: {
                    "beat_at"?: string,"id"?: number,"source"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"example_seeded": boolean,"explain_lang": string,"id": string,"l1": string,"level": string,"llm": Json | null,"self_gender": string,"set_up_at": string | null,"stt": Json | null,"tts": Json | null,"updated_at": string,"zh_gloss": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"example_seeded"?: boolean,"explain_lang"?: string,"id": string,"l1"?: string,"level"?: string,"llm"?: Json | null,"self_gender"?: string,"set_up_at"?: string | null,"stt"?: Json | null,"tts"?: Json | null,"updated_at"?: string,"zh_gloss"?: boolean
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"example_seeded"?: boolean,"explain_lang"?: string,"id"?: string,"l1"?: string,"level"?: string,"llm"?: Json | null,"self_gender"?: string,"set_up_at"?: string | null,"stt"?: Json | null,"tts"?: Json | null,"updated_at"?: string,"zh_gloss"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"review_items": {
                  Row: {
                    "box": number,"created_at": string,"due_on": string,"fr": string,"id": string,"kind": string,"lapses": number,"last_seen": string | null,"line_id": string,"reps": number,"starred": boolean,"topic_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "box"?: number,"created_at"?: string,"due_on"?: string,"fr": string,"id"?: string,"kind": string,"lapses"?: number,"last_seen"?: string | null,"line_id": string,"reps"?: number,"starred"?: boolean,"topic_id": string,"user_id": string
                  }
                  Update: {
                    "box"?: number,"created_at"?: string,"due_on"?: string,"fr"?: string,"id"?: string,"kind"?: string,"lapses"?: number,"last_seen"?: string | null,"line_id"?: string,"reps"?: number,"starred"?: boolean,"topic_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "review_items_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"topic_sections": {
                  Row: {
                    "core_words": NonNullable<Json>,"data": NonNullable<Json>,"error": string | null,"id": string,"intro": string,"position": number,"search_text": string,"slug": string,"status": string,"title": string,"title_fr": string,"topic_id": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "core_words"?: NonNullable<Json>,"data"?: NonNullable<Json>,"error"?: string | null,"id"?: string,"intro"?: string,"position": number,"search_text"?: string,"slug": string,"status"?: string,"title"?: string,"title_fr"?: string,"topic_id": string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "core_words"?: NonNullable<Json>,"data"?: NonNullable<Json>,"error"?: string | null,"id"?: string,"intro"?: string,"position"?: number,"search_text"?: string,"slug"?: string,"status"?: string,"title"?: string,"title_fr"?: string,"topic_id"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "topic_sections_topic_id_fkey"
      columns: ["topic_id"]
isOneToOne: false
      referencedRelation: "topics"
      referencedColumns: ["id"]
    }
                  ]
                },"topics": {
                  Row: {
                    "answers": Json | null,"created_at": string,"dialogue": NonNullable<Json>,"error": string | null,"explain_lang": string,"gen_started_at": string | null,"gender_note": string | null,"id": string,"is_example": boolean,"l1": string,"level": string,"model_used": string | null,"next_time": NonNullable<Json>,"self_gender": string,"source_text": string,"stage": string,"status": string,"story": string,"story_fr": NonNullable<Json>,"studied_at": string | null,"summary": string,"title": string,"title_fr": string,"updated_at": string,"user_id": string,"zh_gloss": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "answers"?: Json | null,"created_at"?: string,"dialogue"?: NonNullable<Json>,"error"?: string | null,"explain_lang"?: string,"gen_started_at"?: string | null,"gender_note"?: string | null,"id"?: string,"is_example"?: boolean,"l1"?: string,"level"?: string,"model_used"?: string | null,"next_time"?: NonNullable<Json>,"self_gender"?: string,"source_text"?: string,"stage"?: string,"status"?: string,"story"?: string,"story_fr"?: NonNullable<Json>,"studied_at"?: string | null,"summary"?: string,"title"?: string,"title_fr"?: string,"updated_at"?: string,"user_id": string,"zh_gloss"?: boolean
                  }
                  Update: {
                    "answers"?: Json | null,"created_at"?: string,"dialogue"?: NonNullable<Json>,"error"?: string | null,"explain_lang"?: string,"gen_started_at"?: string | null,"gender_note"?: string | null,"id"?: string,"is_example"?: boolean,"l1"?: string,"level"?: string,"model_used"?: string | null,"next_time"?: NonNullable<Json>,"self_gender"?: string,"source_text"?: string,"stage"?: string,"status"?: string,"story"?: string,"story_fr"?: NonNullable<Json>,"studied_at"?: string | null,"summary"?: string,"title"?: string,"title_fr"?: string,"updated_at"?: string,"user_id"?: string,"zh_gloss"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"usage_events": {
                  Row: {
                    "cost_usd": number | null,"created_at": string,"id": number,"kind": string,"model": string | null,"provider": string | null,"unit_type": string | null,"units": number,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "cost_usd"?: number | null,"created_at"?: string,"id"?: never,"kind": string,"model"?: string | null,"provider"?: string | null,"unit_type"?: string | null,"units"?: number,"user_id"?: string | null
                  }
                  Update: {
                    "cost_usd"?: number | null,"created_at"?: string,"id"?: never,"kind"?: string,"model"?: string | null,"provider"?: string | null,"unit_type"?: string | null,"units"?: number,"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_overview":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_users":
{ Args: Record<PropertyKey, never>; Returns: {
              "banned_until": string,"calls30": number,"captures": number,"clip_bytes": number,"clips": number,"cost30": number,"created_at": string,"email": string,"failed": number,"id": string,"key_providers": (string)[],"last_active": string,"last_sign_in_at": string,"level": string,"llm_model": string,"name": string,"provider": string,"topics": number,"tts_provider": string
            }[]
                           }
          }
          Enums: {
            [_ in never]: never
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
            
          }
        }
} as const
