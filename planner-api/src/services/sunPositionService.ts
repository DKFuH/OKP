export interface SunPreviewInput {
  datetime: Date
  latitude: number
  longitude: number
  northAngleDeg: number
  daylightEnabled?: boolean
}

export interface SunPreviewResult {
  azimuth_deg: number
  elevation_deg: number
  intensity: number
  sun_direction: {
    x: number
    y: number
    z: number
  }
  daylight_enabled: boolean
}

const RAD = Math.PI / 180

function normalizeAngle(value: number): number {
  const normalized = value % 360
  return normalized < 0 ? normalized + 360 : normalized
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0)
  const now = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  return Math.floor((now - start) / 86_400_000)
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function calculateSunPreview(input: SunPreviewInput): SunPreviewResult {
  const latitude = clamp(input.latitude, -90, 90)
  const longitude = clamp(input.longitude, -180, 180)
  const northAngleDeg = normalizeAngle(input.northAngleDeg)

  const day = dayOfYear(input.datetime)
  const utcHour =
    input.datetime.getUTCHours() + input.datetime.getUTCMinutes() / 60 + input.datetime.getUTCSeconds() / 3600

  const gamma = (2 * Math.PI / 365) * (day - 1 + (utcHour - 12) / 24)
  const solarDeclinationRad =
    0.006918 -
    0.399912 * Math.cos(gamma) +
    0.070257 * Math.sin(gamma) -
    0.006758 * Math.cos(2 * gamma) +
    0.000907 * Math.sin(2 * gamma) -
    0.002697 * Math.cos(3 * gamma) +
    0.00148 * Math.sin(3 * gamma)

  const localSolarTimeHours = utcHour + longitude / 15
  const hourAngleDeg = (localSolarTimeHours - 12) * 15
  const hourAngleRad = hourAngleDeg * RAD
  const latitudeRad = latitude * RAD

  const sinElevation =
    Math.sin(latitudeRad) * Math.sin(solarDeclinationRad) +
    Math.cos(latitudeRad) * Math.cos(solarDeclinationRad) * Math.cos(hourAngleRad)

  const elevationRad = Math.asin(clamp(sinElevation, -1, 1))
  const elevationDeg = (elevationRad / RAD)

  const azimuthRad = Math.atan2(
    Math.sin(hourAngleRad),
    Math.cos(hourAngleRad) * Math.sin(latitudeRad) - Math.tan(solarDeclinationRad) * Math.cos(latitudeRad),
  )

  const azimuthDeg = normalizeAngle(azimuthRad / RAD + 180)
  const rotatedAzimuthDeg = normalizeAngle(azimuthDeg + northAngleDeg)
  const rotatedAzimuthRad = rotatedAzimuthDeg * RAD

  const horizontal = Math.max(0, Math.cos(elevationRad))
  const sunDirection = {
    x: Math.sin(rotatedAzimuthRad) * horizontal,
    y: Math.max(-1, Math.min(1, Math.sin(elevationRad))),
    z: -Math.cos(rotatedAzimuthRad) * horizontal,
  }

  const intensity = elevationDeg <= 0 ? 0 : clamp(Math.sin(elevationRad) * 1.15, 0, 1)

  return {
    azimuth_deg: Number(rotatedAzimuthDeg.toFixed(3)),
    elevation_deg: Number(elevationDeg.toFixed(3)),
    intensity: Number(intensity.toFixed(3)),
    sun_direction: {
      x: Number(sunDirection.x.toFixed(5)),
      y: Number(sunDirection.y.toFixed(5)),
      z: Number(sunDirection.z.toFixed(5)),
    },
    daylight_enabled: input.daylightEnabled ?? true,
  }
}
