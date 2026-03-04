export interface ProjectEnvironment {
  id?: string
  tenant_id?: string
  project_id: string
  north_angle_deg: number
  latitude: number | null
  longitude: number | null
  timezone: string | null
  default_datetime: string | null
  daylight_enabled: boolean
  config_json: Record<string, unknown>
}

export interface SunPreview {
  datetime: string
  latitude: number
  longitude: number
  north_angle_deg: number
  azimuth_deg: number
  elevation_deg: number
  intensity: number
  daylight_enabled: boolean
  sun_direction: {
    x: number
    y: number
    z: number
  }
}
