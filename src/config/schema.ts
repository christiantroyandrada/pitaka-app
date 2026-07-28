import { z } from 'zod'

/**
 * Registry keys are interpolated into a URL path segment, so they are strictly
 * bounded here rather than sanitised at the call site. A config value must not
 * be able to traverse paths or open a query string.
 */
export const registryKey = z.string().regex(/^[a-z][a-z0-9-]*$/)

export const tileSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  icon: z.string().min(1),
  type: z.enum(['native', 'h5']),
  target: registryKey,
  enabled: z.boolean(),
  badge: z.string().optional(),
})

export const categorySchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  tiles: z.array(tileSchema),
})

export const SUPPORTED_GRID_VERSION = 1

export const servicesGridSchema = z.object({
  version: z.literal(SUPPORTED_GRID_VERSION),
  categories: z.array(categorySchema),
})

export type Tile = z.infer<typeof tileSchema>
export type Category = z.infer<typeof categorySchema>
export type ServicesGrid = z.infer<typeof servicesGridSchema>
