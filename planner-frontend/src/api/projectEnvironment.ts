import { api } from './client.js'
import type { ProjectEnvironment, SunPreview } from '../plugins/daylight/index.js'

export const projectEnvironmentApi = {
  get(projectId: string) {
    return api.get<ProjectEnvironment>(`/projects/${projectId}/environment`)
  },

  update(
    projectId: string,
    payload: Partial<{
      north_angle_deg: number
      latitude: number | null
      longitude: number | null
      timezone: string | null
      default_datetime: string | null
      daylight_enabled: boolean
      config_json: Record<string, unknown>
    }>,
  ) {
    return api.put<ProjectEnvironment>(`/projects/${projectId}/environment`, payload)
  },

  sunPreview(
    projectId: string,
    payload: Partial<{
      datetime: string
      latitude: number
      longitude: number
      north_angle_deg: number
    }> = {},
  ) {
    return api.post<SunPreview>(`/projects/${projectId}/environment/sun-preview`, payload)
  },
}
